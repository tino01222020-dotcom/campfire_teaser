#!/usr/bin/env node
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CrowdFuel Claude Worker — ローカルPC常駐プロセス
// Vercelのai_tasksテーブルをポーリングし、Claudeで処理して返す
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, TASK_PROMPTS } from './prompts.js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Load .env manually (no dotenv dependency) ──
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// ── Config ──
const VERCEL_APP_URL = process.env.VERCEL_APP_URL;
const WORKER_SECRET = process.env.WORKER_SECRET;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '10000');
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';

if (!VERCEL_APP_URL || !WORKER_SECRET || !ANTHROPIC_API_KEY) {
  console.error('❌ Missing required env vars. Copy .env.example to .env and fill in values.');
  console.error('   Required: VERCEL_APP_URL, WORKER_SECRET, ANTHROPIC_API_KEY');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ── Logging ──
function log(emoji, msg) {
  const ts = new Date().toLocaleTimeString('ja-JP');
  console.log(`${ts} ${emoji} ${msg}`);
}

// ── API Helpers ──
async function apiCall(method, path, body = null) {
  const url = `${VERCEL_APP_URL}${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-worker-token': WORKER_SECRET,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function fetchPendingTasks() {
  const data = await apiCall('GET', '/api/ai-tasks?status=pending&limit=5');
  return data.tasks || [];
}

async function markProcessing(taskId) {
  await apiCall('PATCH', '/api/ai-tasks', { id: taskId, status: 'processing' });
}

async function markCompleted(taskId, result) {
  await apiCall('PATCH', '/api/ai-tasks', { id: taskId, status: 'completed', result });
}

async function markFailed(taskId, error) {
  await apiCall('PATCH', '/api/ai-tasks', { id: taskId, status: 'failed', error });
}

// ── Claude Processing ──
async function processWithClaude(task) {
  const promptFn = TASK_PROMPTS[task.task_type];
  if (!promptFn) {
    throw new Error(`Unknown task_type: ${task.task_type}`);
  }

  const userPrompt = promptFn(task.input);

  log('🤖', `Claude API呼び出し中... (model: ${MODEL})`);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');

  // Try to parse as JSON
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    const parsed = JSON.parse(jsonMatch[1].trim());
    return parsed;
  } catch {
    // If not valid JSON, return as raw text
    return { raw_response: text };
  }
}

// ── Auto-apply results ──
async function applyResult(task, result) {
  try {
    switch (task.task_type) {
      case 'generate_lp':
        if (result.html) {
          log('📄', 'LP生成結果をデプロイ中...');
          const deployResult = await apiCall('POST', '/api/deploy-lp', {
            html: result.html,
            name: result.title || task.input.project_name || 'AI生成LP',
            phase: task.input.phase || 'lead',
          });
          result._deployed = deployResult;
          log('✅', `LP デプロイ完了: ${deployResult.path || deployResult.id}`);
        }
        break;

      case 'generate_nurture':
        if (result.sequences && Array.isArray(result.sequences)) {
          log('📨', `ナーチャリングシーケンス ${result.sequences.length}件を登録中...`);
          for (const seq of result.sequences) {
            await apiCall('POST', '/api/sequences', {
              name: seq.name,
              channel: seq.channel || task.input.channel || 'email',
              delay_hours: seq.delay_hours || 0,
              content: seq.content,
              subject: seq.subject,
              phase: task.input.phase || 'lead',
              campaign: task.input.campaign,
              status: 'draft',
            });
          }
          log('✅', `シーケンス ${result.sequences.length}件 登録完了（draft状態）`);
        }
        break;

      default:
        // analyze_data, generate_ad_copy, suggest_sequence
        // → 結果はresultとしてDBに保存されるだけ
        break;
    }
  } catch (err) {
    log('⚠️', `結果の自動適用でエラー: ${err.message}`);
    // Auto-apply failure shouldn't fail the whole task
  }
}

// ── Main Loop ──
async function pollOnce() {
  try {
    const tasks = await fetchPendingTasks();

    if (tasks.length === 0) return;

    log('📋', `${tasks.length}件のタスクを検出`);

    for (const task of tasks) {
      log('⚡', `タスク処理開始: #${task.id} [${task.task_type}]`);

      try {
        await markProcessing(task.id);

        const result = await processWithClaude(task);

        // Auto-apply result (LP deploy, sequence create, etc.)
        await applyResult(task, result);

        await markCompleted(task.id, result);
        log('✅', `タスク完了: #${task.id}`);

      } catch (err) {
        log('❌', `タスク失敗: #${task.id} — ${err.message}`);
        await markFailed(task.id, err.message);
      }
    }
  } catch (err) {
    // Network error or API down — just log and retry next cycle
    log('🔌', `ポーリングエラー: ${err.message}`);
  }
}

// ── Entry Point ──
async function main() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🔥 CrowdFuel Claude Worker v1.0');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  📡 App: ${VERCEL_APP_URL}`);
  console.log(`  🤖 Model: ${MODEL}`);
  console.log(`  ⏱️  Poll: ${POLL_INTERVAL / 1000}s`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Initial check
  try {
    await apiCall('GET', '/api/ai-tasks?status=pending&limit=1');
    log('✅', 'Vercel API接続OK');
  } catch (err) {
    log('❌', `Vercel API接続失敗: ${err.message}`);
    log('💡', 'VERCEL_APP_URL と WORKER_SECRET を確認してください');
    process.exit(1);
  }

  log('👂', 'タスク待機中...');

  // Poll loop
  while (true) {
    await pollOnce();
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

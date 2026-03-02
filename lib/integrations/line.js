import { getConnection, sql } from '../db.js';
import crypto from 'crypto';

const LINE_API = 'https://api.line.me/v2';

export async function getLineCredentials() {
  const conn = await getConnection('line');
  if (!conn || conn.status !== 'connected') return null;
  return conn.credentials;
}

// Verify webhook signature
export function verifySignature(body, signature, channelSecret) {
  const hash = crypto.createHmac('SHA256', channelSecret).update(body).digest('base64');
  return hash === signature;
}

// Send push message to a user
export async function pushMessage(userId, messages, accessToken) {
  const res = await fetch(`${LINE_API}/bot/message/push`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to: userId, messages: Array.isArray(messages) ? messages : [messages] }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`LINE Push error: ${JSON.stringify(err)}`);
  }
  return true;
}

// Send text message
export async function sendTextMessage(userId, text, accessToken) {
  return pushMessage(userId, { type: 'text', text }, accessToken);
}

// Send flex message (rich content)
export async function sendFlexMessage(userId, altText, contents, accessToken) {
  return pushMessage(userId, { type: 'flex', altText, contents }, accessToken);
}

// Reply to webhook event
export async function replyMessage(replyToken, messages, accessToken) {
  const res = await fetch(`${LINE_API}/bot/message/reply`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ replyToken, messages: Array.isArray(messages) ? messages : [messages] }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`LINE Reply error: ${JSON.stringify(err)}`);
  }
  return true;
}

// Get user profile
export async function getUserProfile(userId, accessToken) {
  const res = await fetch(`${LINE_API}/bot/profile/${userId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// Get follower count
export async function getFollowerCount(accessToken) {
  const date = new Date(Date.now() - 86400000).toISOString().split('T')[0].replace(/-/g, '');
  const res = await fetch(`${LINE_API}/bot/insight/followers?date=${date}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// Build welcome message for new lead registration
export function buildWelcomeMessage(projectName, phase) {
  if (phase === 'lead') {
    return {
      type: 'flex',
      altText: `${projectName} に先行登録いただきありがとうございます！`,
      contents: {
        type: 'bubble',
        body: {
          type: 'box', layout: 'vertical', spacing: 'md',
          contents: [
            { type: 'text', text: '🎉 先行登録完了！', weight: 'bold', size: 'lg' },
            { type: 'text', text: `${projectName}に先行登録いただきありがとうございます。クラファン開始時に限定リターン情報をお届けします。`, wrap: true, size: 'sm', color: '#666666' },
          ],
        },
      },
    };
  }
  return {
    type: 'text',
    text: `${projectName}にご興味をお持ちいただきありがとうございます！最新情報をお届けします。`,
  };
}

// Process webhook events and store leads
export async function processWebhookEvents(events, creds) {
  const results = [];

  for (const event of events) {
    if (event.type === 'follow') {
      // New friend = new lead
      const userId = event.source?.userId;
      if (!userId) continue;

      const profile = await getUserProfile(userId, creds.channel_access_token);

      await sql`
        INSERT INTO leads (line_user_id, channel, phase, created_at)
        VALUES (${userId}, 'line', 'lead', NOW())
        ON CONFLICT DO NOTHING`;

      // Send welcome message
      try {
        const welcome = buildWelcomeMessage(creds.project_name || 'プロジェクト', 'lead');
        await replyMessage(event.replyToken, welcome, creds.channel_access_token);
      } catch (e) {
        console.error('Welcome message failed:', e);
      }

      results.push({ type: 'new_lead', userId, name: profile?.displayName });
    }

    if (event.type === 'unfollow') {
      const userId = event.source?.userId;
      await sql`UPDATE leads SET phase = 'unfollowed' WHERE line_user_id = ${userId}`;
      results.push({ type: 'unfollow', userId });
    }
  }

  return results;
}

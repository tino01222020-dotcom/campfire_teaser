import { getConnection } from '../db.js';

const SG_API = 'https://api.sendgrid.com/v3';

export async function getSendGridCredentials() {
  const conn = await getConnection('sendgrid');
  if (!conn || conn.status !== 'connected') return null;
  return conn.credentials;
}

// Send a single email
export async function sendEmail({ to, from, subject, html, text, categories = [] }, apiKey) {
  const res = await fetch(`${SG_API}/mail/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [
        ...(text ? [{ type: 'text/plain', value: text }] : []),
        ...(html ? [{ type: 'text/html', value: html }] : []),
      ],
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true },
      },
      categories,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SendGrid error (${res.status}): ${err}`);
  }
  return true;
}

// Send welcome/registration confirmation email
export async function sendWelcomeEmail(email, projectName, creds) {
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
      <h1 style="font-size: 24px; color: #1A1917;">🎉 先行登録ありがとうございます！</h1>
      <p style="color: #6D6A62; line-height: 1.8; font-size: 15px;">
        <strong>${projectName}</strong>に先行登録いただきありがとうございます。<br>
        クラウドファンディング開始時に、限定リターン情報をいち早くお届けします。
      </p>
      <div style="margin: 24px 0; padding: 16px; background: #F6F5F2; border-radius: 8px;">
        <p style="font-size: 13px; color: #6D6A62; margin: 0;">
          ✅ 先行登録者限定のリターン情報<br>
          ✅ プロジェクトの進捗アップデート<br>
          ✅ 開始日のリマインド通知
        </p>
      </div>
      <p style="font-size: 13px; color: #A8A49C;">
        配信停止をご希望の場合は<a href="{{{unsubscribe}}}">こちら</a>から解除できます。
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    from: creds.from_email,
    subject: `【${projectName}】先行登録が完了しました`,
    html,
    categories: ['welcome', 'lead'],
  }, creds.api_key);
}

// Send nurturing sequence email
export async function sendNurtureEmail(email, subject, htmlContent, creds, category = 'nurture') {
  return sendEmail({
    to: email,
    from: creds.from_email,
    subject,
    html: htmlContent,
    categories: [category],
  }, creds.api_key);
}

// Validate API key by checking sender identity
export async function validateApiKey(apiKey) {
  const res = await fetch(`${SG_API}/user/email`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  return res.ok;
}

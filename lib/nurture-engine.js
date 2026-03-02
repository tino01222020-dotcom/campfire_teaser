import { sql } from './db.js';
import { getLineCredentials, sendTextMessage, sendFlexMessage } from './integrations/line.js';
import { getSendGridCredentials, sendNurtureEmail } from './integrations/sendgrid.js';

// Find leads that need to receive a sequence message
export async function findPendingDeliveries() {
  // Get active sequences
  const { rows: sequences } = await sql`
    SELECT * FROM sequences WHERE status = 'active' ORDER BY sort_order`;

  const pending = [];

  for (const seq of sequences) {
    // Find leads that:
    // 1. Registered for the matching phase
    // 2. Have passed the delay threshold
    // 3. Haven't received this sequence yet
    const { rows: leads } = await sql`
      SELECT l.* FROM leads l
      WHERE l.phase = ${seq.phase}
        AND l.created_at + (${seq.delay_hours} || ' hours')::interval <= NOW()
        AND NOT EXISTS (
          SELECT 1 FROM deliveries d
          WHERE d.sequence_id = ${seq.id} AND d.lead_id = l.id
        )
        AND (
          (${seq.channel} = 'line' AND l.line_user_id IS NOT NULL)
          OR
          (${seq.channel} = 'email' AND l.email IS NOT NULL)
        )
      LIMIT 100`;

    for (const lead of leads) {
      pending.push({ sequence: seq, lead });
    }
  }

  return pending;
}

// Execute a single delivery
export async function executeDelivery(sequence, lead) {
  try {
    if (sequence.channel === 'line') {
      const creds = await getLineCredentials();
      if (!creds) throw new Error('LINE not connected');

      await sendTextMessage(
        lead.line_user_id,
        sequence.content,
        creds.channel_access_token
      );
    } else if (sequence.channel === 'email') {
      const creds = await getSendGridCredentials();
      if (!creds) throw new Error('SendGrid not connected');

      await sendNurtureEmail(
        lead.email,
        sequence.subject || sequence.name,
        sequence.content,
        creds,
        `nurture-${sequence.id}`
      );
    }

    // Record success
    await sql`
      INSERT INTO deliveries (sequence_id, lead_id, status, sent_at)
      VALUES (${sequence.id}, ${lead.id}, 'sent', NOW())`;

    return { success: true, leadId: lead.id, sequenceId: sequence.id };
  } catch (error) {
    // Record failure
    await sql`
      INSERT INTO deliveries (sequence_id, lead_id, status, error)
      VALUES (${sequence.id}, ${lead.id}, 'failed', ${error.message})`;

    return { success: false, leadId: lead.id, error: error.message };
  }
}

// Run all pending deliveries (called by cron)
export async function runNurtureEngine() {
  const pending = await findPendingDeliveries();
  const results = { sent: 0, failed: 0, errors: [] };

  for (const { sequence, lead } of pending) {
    const result = await executeDelivery(sequence, lead);
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push(result.error);
    }
    // Rate limit: 50ms between sends
    await new Promise(r => setTimeout(r, 50));
  }

  return results;
}

// Get delivery stats per sequence
export async function getSequenceStats() {
  const { rows } = await sql`
    SELECT
      s.id, s.name, s.channel, s.delay_hours, s.status, s.phase,
      COUNT(d.id) FILTER (WHERE d.status = 'sent') as sent,
      COUNT(d.id) FILTER (WHERE d.status = 'opened') as opened,
      COUNT(d.id) FILTER (WHERE d.status = 'clicked') as clicked,
      COUNT(d.id) FILTER (WHERE d.status = 'failed') as failed
    FROM sequences s
    LEFT JOIN deliveries d ON d.sequence_id = s.id
    GROUP BY s.id
    ORDER BY s.phase, s.sort_order`;

  return rows.map(r => ({
    ...r,
    open_rate: r.sent > 0 ? Math.round((r.opened / r.sent) * 100) : null,
    click_rate: r.sent > 0 ? Math.round((r.clicked / r.sent) * 100) : null,
  }));
}

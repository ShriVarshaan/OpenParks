const express = require('express');
const router = express.Router();
const pool = require('../db');
const { sendEmail } = require('../emailService');

// POST /api/email/send — send email & log to DB
router.post('/send', async (req, res) => {
  const { to, subject, body } = req.body;

  if (!to || !subject || !body)
    return res.status(400).json({ error: 'to, subject, and body are required' });

  try {
    // Send email
    const info = await sendEmail({ to, subject, html: body });

    // Log to PostgreSQL
    await pool.query(
      `INSERT INTO email_logs (recipient, subject, status, message_id, sent_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [to, subject, 'sent', info.messageId]
    );

    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Send email error:', err);

    // Log failure to DB
    await pool.query(
      `INSERT INTO email_logs (recipient, subject, status, error_message, sent_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [to, subject, 'failed', err.message]
    );

    res.status(500).json({ error: 'Failed to send email' });
  }
});

// GET /api/email/logs — fetch email logs from DB
router.get('/logs', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 50'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

module.exports = router;
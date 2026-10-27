const nodemailer = require('nodemailer');
require('dotenv').config();

function getTransporter() {
  const user = process.env.GMAIL_USER || 'cerebrexia2026@gmail.com';
  const pass = process.env.GMAIL_APP_PASSWORD || 'guwfymxqxybxxiip';

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user.trim(),
      pass: pass.trim().replace(/\s+/g, '') // remove any spaces if copied with spaces
    }
  });
}

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function generateReceiptHtml(txn) {
  const formattedAmount = formatCurrency(txn.amount);
  const dateStr = new Date(txn.completedAt || txn.createdAt || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Contribution Receipt - ${txn.id}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background: #4f46e5; padding: 32px 24px; text-align: center; color: #ffffff; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .title { font-size: 22px; font-weight: 800; margin: 0; }
    .amount-box { text-align: center; padding: 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .amount-label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; }
    .amount-val { font-size: 38px; font-weight: 800; color: #4338ca; margin: 0; }
    .status-pill { display: inline-block; background: #dcfce7; color: #15803d; font-size: 13px; font-weight: 700; padding: 5px 14px; border-radius: 20px; margin-top: 8px; }
    .body-content { padding: 26px; }
    .details-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .details-table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .details-table td.label { color: #64748b; font-weight: 600; width: 40%; }
    .details-table td.value { color: #0f172a; font-weight: 700; text-align: right; }
    .note-box { margin-top: 20px; padding: 14px; background: #f8fafc; border-left: 4px solid #6366f1; border-radius: 6px; font-size: 13px; color: #334155; }
    .footer { padding: 20px 24px; background: #f8fafc; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.6; }
  </style>
</head>
<body style="background-color: #f1f5f9; margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div class="container">
    <div class="header">
      <div class="badge">Official Receipt</div>
      <h1 class="title">CEREBREXIA 2026 Confirmation</h1>
      <p style="margin: 6px 0 0; opacity: 0.95; font-size: 14px;">Thank you for your contribution to Group ${txn.groupId}</p>
    </div>

    <div class="amount-box">
      <div class="amount-label">Contribution Amount</div>
      <div class="amount-val">${formattedAmount}</div>
      <div class="status-pill">&#10003; Confirmed & Logged in Database</div>
    </div>

    <div class="body-content">
      <table class="details-table">
        <tr>
          <td class="label">Receipt Reference ID</td>
          <td class="value" style="font-family: monospace; font-size: 13px; color: #4f46e5;">${txn.id}</td>
        </tr>
        <tr>
          <td class="label">Contribution Group</td>
          <td class="value" style="color: #6366f1;">Group ${txn.groupId}</td>
        </tr>
        ${txn.department ? `
        <tr>
          <td class="label">Medical Department</td>
          <td class="value" style="font-weight: 700; color: #4f46e5;">${txn.department}</td>
        </tr>` : ''}
        <tr>
          <td class="label">Contributor Name</td>
          <td class="value">${txn.payerName || 'Generous Contributor'}</td>
        </tr>
        ${(txn.role || txn.note) ? `
        <tr>
          <td class="label">Designation / Role</td>
          <td class="value" style="font-weight: 700; color: #1e293b;">${txn.role || txn.note}</td>
        </tr>` : ''}
        <tr>
          <td class="label">Contributor Email</td>
          <td class="value">${txn.payerEmail}</td>
        </tr>
        ${txn.payerPhone ? `
        <tr>
          <td class="label">Phone</td>
          <td class="value">${txn.payerPhone}</td>
        </tr>` : ''}
        <tr>
          <td class="label">Date & Time</td>
          <td class="value">${dateStr}</td>
        </tr>
        <tr>
          <td class="label">Payment Status</td>
          <td class="value" style="color: #16a34a;">Accepted & Verified</td>
        </tr>
      </table>

      <div style="margin-top: 22px; text-align: center; color: #475569; font-size: 13px; line-height: 1.5;">
        This email confirms receipt of your contribution of <strong>${formattedAmount}</strong> to <strong>Group ${txn.groupId}</strong>. 
        Your payment has been officially recorded in the CEREBREXIA 2026 database.
      </div>
    </div>

    <div class="footer">
      This is an official automated receipt issued by <strong>CEREBREXIA 2026</strong>.<br/>
      Official Contact: cerebrexia2026@gmail.com &bull; Group ${txn.groupId}<br/>
      Please retain this confirmation for your records.
    </div>
  </div>
</body>
</html>
  `;
}

async function sendConfirmationEmail(txn) {
  const transporter = getTransporter();
  const formattedAmount = formatCurrency(txn.amount);
  const dateStr = new Date(txn.completedAt || txn.createdAt || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  if (!transporter) {
    const errorMsg = 'Gmail credentials not configured in .env (GMAIL_USER and GMAIL_APP_PASSWORD required).';
    console.warn(`[EmailService] ⚠️ ${errorMsg}`);
    console.log(`[EmailService] Would send receipt for ${formattedAmount} to ${txn.payerEmail}`);
    return {
      success: false,
      configured: false,
      error: errorMsg
    };
  }

  const senderName = process.env.SENDER_NAME || 'CEREBREXIA 2026';
  const senderEmail = process.env.GMAIL_USER || 'cerebrexia2026@gmail.com';

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: txn.payerEmail,
    replyTo: senderEmail,
    subject: `CEREBREXIA 2026 - Contribution Confirmation for Group ${txn.groupId}`,
    headers: {
      'X-Entity-Ref-ID': txn.id,
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'All'
    },
    text: `CEREBREXIA 2026 - CONTRIBUTION CONFIRMATION

Dear ${txn.payerName || 'Contributor'},

Thank you for your generous contribution to CEREBREXIA 2026. This receipt confirms that your payment has been accepted and recorded in the database.

CONTRIBUTION DETAILS:
------------------------------------------
Receipt Ref ID:      ${txn.id}
Contribution Group:  Group ${txn.groupId}
Medical Department:  ${txn.department || 'N/A'}
Designation / Role:  ${txn.role || txn.note || 'Contributor'}
Contributor Name:    ${txn.payerName || 'Generous Contributor'}
Amount Paid:         ${formattedAmount}
Payment Status:      Accepted & Verified
Date & Time:         ${dateStr}
------------------------------------------

This is an automated confirmation issued by CEREBREXIA 2026 Organizing Committee.
Contact: ${senderEmail}
Please retain this email for your records.`,
    html: generateReceiptHtml(txn)
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] ✅ Email successfully sent to ${txn.payerEmail}. MessageId: ${info.messageId}`);
    return {
      success: true,
      configured: true,
      messageId: info.messageId
    };
  } catch (err) {
    console.error(`[EmailService] ❌ Failed to send email to ${txn.payerEmail}:`, err.message);
    return {
      success: false,
      configured: true,
      error: err.message
    };
  }
}

module.exports = {
  getTransporter,
  formatCurrency,
  generateReceiptHtml,
  sendConfirmationEmail
};

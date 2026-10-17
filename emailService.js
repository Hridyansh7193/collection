const nodemailer = require('nodemailer');
require('dotenv').config();

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

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
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 36px 30px; text-align: center; color: #ffffff; }
    .badge { display: inline-block; background: rgba(255,255,255,0.22); padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .title { font-size: 24px; font-weight: 800; margin: 0; }
    .amount-box { text-align: center; padding: 28px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .amount-label { font-size: 13px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; }
    .amount-val { font-size: 42px; font-weight: 900; color: #4338ca; margin: 0; }
    .status-pill { display: inline-block; background: #dcfce7; color: #15803d; font-size: 13px; font-weight: 700; padding: 5px 14px; border-radius: 20px; margin-top: 10px; }
    .body-content { padding: 30px; }
    .details-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .details-table td { padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .details-table td.label { color: #64748b; font-weight: 600; width: 40%; }
    .details-table td.value { color: #0f172a; font-weight: 700; text-align: right; }
    .note-box { margin-top: 24px; padding: 16px; background: #f8fafc; border-left: 4px solid #6366f1; border-radius: 6px; font-size: 14px; color: #334155; }
    .footer { padding: 24px 30px; background: #f8fafc; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Official Contribution Receipt</div>
      <h1 class="title">Payment Confirmation</h1>
      <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Thank you for your generous contribution</p>
    </div>

    <div class="amount-box">
      <div class="amount-label">Exact Amount Paid</div>
      <div class="amount-val">${formattedAmount}</div>
      <div class="status-pill">&#10003; Payment Received & Confirmed</div>
    </div>

    <div class="body-content">
      <table class="details-table">
        <tr>
          <td class="label">Receipt / Txn ID</td>
          <td class="value" style="font-family: monospace; font-size: 13px; color: #4f46e5;">${txn.id}</td>
        </tr>
        <tr>
          <td class="label">Contribution Group</td>
          <td class="value" style="color: #6366f1;">Group ${txn.groupId}</td>
        </tr>
        <tr>
          <td class="label">Contributor Name</td>
          <td class="value">${txn.payerName || 'Generous Contributor'}</td>
        </tr>
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
          <td class="label">Payment Date & Time</td>
          <td class="value">${dateStr}</td>
        </tr>
        <tr>
          <td class="label">Payment Method</td>
          <td class="value">${(txn.paymentMethod || 'UPI').toUpperCase()}</td>
        </tr>
        ${txn.razorpayPaymentId ? `
        <tr>
          <td class="label">Gateway Reference</td>
          <td class="value" style="font-family: monospace; font-size: 12px;">${txn.razorpayPaymentId}</td>
        </tr>` : ''}
      </table>

      ${txn.note ? `
      <div class="note-box">
        <strong>Remarks / Note:</strong><br/>
        ${txn.note}
      </div>` : ''}

      <div style="margin-top: 26px; text-align: center; color: #475569; font-size: 14px; line-height: 1.6;">
        This email confirms receipt of your contribution of <strong>${formattedAmount}</strong> to <strong>Group ${txn.groupId}</strong>. 
        Your payment has been officially verified and logged.
      </div>
    </div>

    <div class="footer">
      This is an automated confirmation receipt sent to ${txn.payerEmail}.<br/>
      Money Collection Platform &bull; Group ${txn.groupId}
    </div>
  </div>
</body>
</html>
  `;
}

async function sendConfirmationEmail(txn) {
  const transporter = getTransporter();
  const formattedAmount = formatCurrency(txn.amount);

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

  const senderName = process.env.SENDER_NAME || 'Money Collection Platform';
  const senderEmail = process.env.GMAIL_USER;

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: txn.payerEmail,
    subject: `Receipt: ${formattedAmount} received for Group ${txn.groupId} [${txn.id}]`,
    text: `Payment Confirmation:\n\nThank you ${txn.payerName || 'Contributor'}!\n\nYour contribution of ${formattedAmount} for Group ${txn.groupId} has been confirmed.\nTransaction ID: ${txn.id}\nDate: ${new Date(txn.completedAt || Date.now()).toLocaleString()}`,
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

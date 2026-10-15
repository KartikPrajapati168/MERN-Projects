// backend/utils/emailService.js
const nodemailer = require('nodemailer');

// ============================================================
// 📮 Mailtrap Transporter
// ============================================================
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
  port: Number(process.env.MAILTRAP_PORT) || 2525,
  secure: false,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 8000,
  socketTimeout: 15000,
});

transporter.verify((error) => {
  if (error) {
    console.error('❌ Mailtrap SMTP FAILED:', error.message);
  } else {
    console.log('✅ Mailtrap SMTP ready — all emails will appear in Mailtrap inbox');
  }
});

const FROM = `"${process.env.MAIL_FROM_NAME || 'WasteExchange AI'}" <${process.env.MAIL_FROM_EMAIL || 'no-reply@wasteexchange.ai'}>`;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Retry wrapper — handles rate limits
const sendWithRetry = async (mailOptions, maxRetries = 4) => {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (err) {
      lastErr = err;
      const msg = err.message || '';
      const isRateLimit = msg.includes('Too many emails') || err.responseCode === 550;
      if (isRateLimit && attempt < maxRetries) {
        const wait = 1500 * attempt;
        console.warn(`⏳ Rate limited. Retrying in ${wait}ms...`);
        await delay(wait);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
};

// ============================================================
// 🎨 Shared Layout
// ============================================================
const emailLayout = ({ title, preheader = '', bodyHtml }) => `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${title}</title></head>
<body style="margin:0;padding:0;background:#0f0f17;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#e5e7eb;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f17;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:600px;background:#16162a;border:1px solid rgba(139,92,246,0.25);border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 28px;text-align:center;">
          <div style="font-size:26px;">♻️</div>
          <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:700;">WasteExchange AI</h1>
          <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:2px;">Smart Waste Marketplace</div>
        </td></tr>
        <tr><td style="padding:32px 28px;">${bodyHtml}</td></tr>
        <tr><td style="padding:20px 28px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;color:#6b7280;font-size:12px;line-height:1.6;">
          © ${new Date().getFullYear()} WasteExchange AI · All rights reserved<br/>
          <a href="${CLIENT_URL}" style="color:#a78bfa;text-decoration:none;">Visit Dashboard</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
`;

const tableRow = (label, value, valueColor = '#e5e7eb') => `
  <tr>
    <td style="color:#9ca3af;font-size:13px;padding:6px 0;">${label}</td>
    <td style="color:${valueColor};font-size:13px;font-weight:600;text-align:right;padding:6px 0;word-break:break-all;">${value}</td>
  </tr>`;

const btn = (text, url, color = '#6366f1') =>
  `<div style="text-align:center;margin:20px 0;"><a href="${url}" style="display:inline-block;background:linear-gradient(135deg, ${color}, #8b5cf6);color:#fff;text-decoration:none;padding:13px 28px;border-radius:9px;font-weight:700;font-size:14px;">${text} →</a></div>`;

// ============================================================
// 🔢 1. OTP Email
// ============================================================
const sendOtpEmail = async (toEmail, otp, name = 'User') => {
  if (!toEmail) throw new Error('sendOtpEmail: email required');
  const html = emailLayout({
    title: 'Verify Your Deal',
    preheader: `OTP: ${otp}`,
    bodyHtml: `
      <h2 style="margin:0 0 8px;color:#fff;font-size:22px;">Verify Your Deal</h2>
      <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;">Hi <strong style="color:#e5e7eb;">${name}</strong>, use the OTP below:</p>
      <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <div style="color:#a78bfa;font-size:12px;font-weight:700;letter-spacing:1.5px;margin-bottom:10px;">YOUR OTP</div>
        <div style="font-family:'Courier New',monospace;font-size:38px;font-weight:800;color:#fff;letter-spacing:12px;">${otp}</div>
        <div style="color:#6b7280;font-size:12px;margin-top:8px;">Valid for <strong style="color:#fbbf24;">10 minutes</strong></div>
      </div>
      <div style="background:rgba(251,191,36,0.08);border-left:3px solid #fbbf24;padding:12px 16px;border-radius:6px;color:#fbbf24;font-size:13px;">
        <strong>🔒</strong> Never share this OTP with anyone.
      </div>`,
  });
  const info = await sendWithRetry({ from: FROM, to: toEmail, subject: 'Your WasteExchange AI Verification Code', html });
  console.log(`📧 OTP → ${toEmail}`);
  return info;
};

// ============================================================
// 🤝 2. Deal Confirmation (buyer, post-payment)
// ============================================================
const sendDealConfirmationEmail = async (toEmail, dealId, dealData = null) => {
  if (!toEmail) throw new Error('sendDealConfirmationEmail: email required');
  const material = dealData?.material || 'your material';
  const amount = dealData?.buyerTotalPayment ? `₹${Number(dealData.buyerTotalPayment).toLocaleString('en-IN')}` : '—';
  const html = emailLayout({
    title: 'Deal Confirmed',
    bodyHtml: `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(34,197,94,0.15);border:2px solid rgba(34,197,94,0.35);line-height:60px;font-size:28px;">✅</div>
      </div>
      <h2 style="margin:0 0 8px;color:#fff;font-size:22px;text-align:center;">Payment Successful</h2>
      <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;text-align:center;">Your deal is confirmed. The generator will prepare your material.</p>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px 20px;margin-bottom:24px;">
        <table width="100%">
          ${tableRow('Deal ID', dealId)}
          ${tableRow('Material', material)}
          ${tableRow('Amount Paid', amount, '#22c55e')}
        </table>
      </div>
      ${btn('View Deal in Dashboard', `${CLIENT_URL}/buyer`)}
      <div style="background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.2);border-radius:10px;padding:12px 16px;color:#93c5fd;font-size:13px;">
        <strong>Next step:</strong> Once you receive the material, mark the deal as "Received".
      </div>`,
  });
  const info = await sendWithRetry({ from: FROM, to: toEmail, subject: `Deal Confirmed — ${material}`, html });
  console.log(`📧 Deal confirmation → ${toEmail}`);
  return info;
};

// ============================================================
// 💰 3. Payment Received — Notify Generator
// ============================================================
const sendPaymentReceivedEmail = async (toEmail, deal) => {
  if (!toEmail) throw new Error('sendPaymentReceivedEmail: email required');
  const material = deal?.material || 'material';
  const payout = deal?.generatorPayout ? `₹${Number(deal.generatorPayout).toLocaleString('en-IN')}` : '—';
  const html = emailLayout({
    title: 'Payment Received',
    bodyHtml: `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(251,191,36,0.15);border:2px solid rgba(251,191,36,0.35);line-height:60px;font-size:28px;">💰</div>
      </div>
      <h2 style="margin:0 0 8px;color:#fff;font-size:22px;text-align:center;">Payment Received!</h2>
      <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;text-align:center;">Buyer has paid for the deal. Prepare the material for delivery.</p>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px 20px;margin-bottom:24px;">
        <table width="100%">
          ${tableRow('Material', material)}
          ${tableRow('Quantity', `${deal?.quantity || 0} kg`)}
          ${tableRow('Buyer', deal?.buyerName || 'N/A')}
          ${tableRow('Your Payout', payout, '#22c55e')}
        </table>
      </div>
      ${btn('View in Dashboard', `${CLIENT_URL}/generator`)}`,
  });
  const info = await sendWithRetry({ from: FROM, to: toEmail, subject: `Payment Received — ${material}`, html });
  console.log(`📧 Payment received → ${toEmail}`);
  return info;
};

// ============================================================
// 📤 4. Offer Received — Notify Buyer
// ============================================================
const sendOfferReceivedEmail = async (toEmail, deal, generatorName = '') => {
  if (!toEmail) throw new Error('sendOfferReceivedEmail: email required');
  const material = deal?.material || 'material';
  const price = deal?.pricePerUnit ? `₹${deal.pricePerUnit}/kg` : '—';
  const html = emailLayout({
    title: 'New Offer Received',
    bodyHtml: `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(139,92,246,0.15);border:2px solid rgba(139,92,246,0.35);line-height:60px;font-size:28px;">📤</div>
      </div>
      <h2 style="margin:0 0 8px;color:#fff;font-size:22px;text-align:center;">New Offer Received!</h2>
      <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;text-align:center;">
        <strong style="color:#a78bfa;">${generatorName || 'A generator'}</strong> has sent you an offer.
      </p>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px 20px;margin-bottom:24px;">
        <table width="100%">
          ${tableRow('Material', material)}
          ${tableRow('Quantity', `${deal?.quantity || 0} kg`)}
          ${tableRow('Price', price, '#22c55e')}
          ${tableRow('Total', `₹${Number(deal?.totalAmount || 0).toLocaleString('en-IN')}`)}
        </table>
      </div>
      ${btn('Review Offer', `${CLIENT_URL}/buyer`)}`,
  });
  const info = await sendWithRetry({ from: FROM, to: toEmail, subject: `New Offer — ${material}`, html });
  console.log(`📧 Offer received → ${toEmail}`);
  return info;
};

// ============================================================
// 🎉 5. Deal Completed — Notify both parties
// ============================================================
const sendDealCompletedEmail = async (toEmail, deal, recipientRole = 'buyer') => {
  if (!toEmail) throw new Error('sendDealCompletedEmail: email required');
  const material = deal?.material || 'material';
  const html = emailLayout({
    title: 'Deal Completed',
    bodyHtml: `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(167,139,250,0.15);border:2px solid rgba(167,139,250,0.35);line-height:60px;font-size:28px;">🎉</div>
      </div>
      <h2 style="margin:0 0 8px;color:#fff;font-size:22px;text-align:center;">Deal Completed!</h2>
      <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;text-align:center;">
        ${recipientRole === 'buyer' ? 'You have successfully received the material.' : 'The buyer has confirmed receiving the material.'}
      </p>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px 20px;margin-bottom:24px;">
        <table width="100%">
          ${tableRow('Deal ID', String(deal?._id || ''))}
          ${tableRow('Material', material)}
          ${tableRow('Quantity', `${deal?.quantity || 0} kg`)}
          ${tableRow('Total', `₹${Number(deal?.totalAmount || 0).toLocaleString('en-IN')}`, '#22c55e')}
        </table>
      </div>
      ${btn('View in Dashboard', `${CLIENT_URL}/${recipientRole}`)}
      <p style="color:#6b7280;font-size:12px;text-align:center;margin-top:20px;">Thank you for using WasteExchange AI!</p>`,
  });
  const info = await sendWithRetry({ from: FROM, to: toEmail, subject: `Deal Completed — ${material}`, html });
  console.log(`📧 Deal completed → ${toEmail}`);
  return info;
};

// ============================================================
// 🏢 6. Company Verified
// ============================================================
const sendCompanyVerifiedEmail = async (toEmail, name = 'User', companyName = '') => {
  if (!toEmail) throw new Error('sendCompanyVerifiedEmail: email required');
  const html = emailLayout({
    title: 'Company Verified',
    bodyHtml: `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(34,197,94,0.15);border:2px solid rgba(34,197,94,0.35);line-height:60px;font-size:28px;">✅</div>
      </div>
      <h2 style="margin:0 0 8px;color:#fff;font-size:22px;text-align:center;">Company Verified!</h2>
      <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;text-align:center;">
        Hi <strong style="color:#e5e7eb;">${name}</strong>, your company ${companyName ? `<strong style="color:#22c55e;">${companyName}</strong>` : ''} has been verified.
      </p>
      <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:10px;padding:14px 18px;color:#22c55e;font-size:13px;line-height:1.6;">
        <strong>🎉 You're all set!</strong> You can now access your full dashboard and start trading on WasteExchange AI.
      </div>
      ${btn('Go to Dashboard', `${CLIENT_URL}`)}
    `,
  });
  const info = await sendWithRetry({ from: FROM, to: toEmail, subject: 'Company Verified — Welcome Aboard!', html });
  console.log(`📧 Company verified → ${toEmail}`);
  return info;
};

// ============================================================
// ❌ 7. Company Rejected
// ============================================================
const sendCompanyRejectedEmail = async (toEmail, name = 'User', companyName = '', reason = '') => {
  if (!toEmail) throw new Error('sendCompanyRejectedEmail: email required');
  const html = emailLayout({
    title: 'Company Verification',
    bodyHtml: `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(248,113,113,0.15);border:2px solid rgba(248,113,113,0.35);line-height:60px;font-size:28px;">❌</div>
      </div>
      <h2 style="margin:0 0 8px;color:#fff;font-size:22px;text-align:center;">Verification Update</h2>
      <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;text-align:center;">
        Hi <strong style="color:#e5e7eb;">${name}</strong>, unfortunately your company verification could not be approved.
      </p>
      ${reason ? `
      <div style="background:rgba(248,113,113,0.08);border-left:3px solid #f87171;padding:12px 16px;border-radius:6px;color:#f87171;font-size:13px;line-height:1.6;margin-bottom:20px;">
        <strong>Reason:</strong> ${reason}
      </div>` : ''}
      <p style="color:#9ca3af;font-size:13px;line-height:1.6;">
        You can update your company details and re-submit for verification.
      </p>
      ${btn('Update Company Details', `${CLIENT_URL}/register-company`)}
    `,
  });
  const info = await sendWithRetry({ from: FROM, to: toEmail, subject: 'Company Verification Update', html });
  console.log(`📧 Company rejected → ${toEmail}`);
  return info;
};

// ============================================================
// 💵 8. Wallet Top-up Confirmation
// ============================================================
const sendWalletTopupEmail = async (toEmail, name = 'User', amount = 0, newBalance = 0) => {
  if (!toEmail) throw new Error('sendWalletTopupEmail: email required');
  const html = emailLayout({
    title: 'Wallet Top-up Successful',
    bodyHtml: `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:rgba(34,197,94,0.15);border:2px solid rgba(34,197,94,0.35);line-height:60px;font-size:28px;">💵</div>
      </div>
      <h2 style="margin:0 0 8px;color:#fff;font-size:22px;text-align:center;">Wallet Top-up Successful</h2>
      <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;text-align:center;">Hi ${name}, your wallet has been topped up.</p>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px 20px;margin-bottom:24px;">
        <table width="100%">
          ${tableRow('Amount Added', `₹${Number(amount).toLocaleString('en-IN')}`, '#22c55e')}
          ${tableRow('New Balance', `₹${Number(newBalance).toLocaleString('en-IN')}`, '#a78bfa')}
        </table>
      </div>
      ${btn('View Wallet', `${CLIENT_URL}/buyer`)}`,
  });
  const info = await sendWithRetry({ from: FROM, to: toEmail, subject: 'Wallet Top-up Successful', html });
  console.log(`📧 Wallet top-up → ${toEmail}`);
  return info;
};

// ============================================================
// 👋 9. Welcome Email
// ============================================================
const sendWelcomeEmail = async (toEmail, name = 'User', role = 'buyer') => {
  if (!toEmail) throw new Error('sendWelcomeEmail: email required');
  const roleLabel = role === 'generator' ? 'Generator' : role === 'admin' ? 'Administrator' : 'Buyer';
  const html = emailLayout({
    title: 'Welcome Aboard',
    bodyHtml: `
      <h2 style="margin:0 0 8px;color:#fff;font-size:22px;">Welcome, ${name}! 👋</h2>
      <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;">
        Your <strong style="color:#a78bfa;">${roleLabel}</strong> account is now active on WasteExchange AI.
      </p>
      <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:18px 20px;margin-bottom:24px;">
        <div style="color:#a78bfa;font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:10px;">Get Started</div>
        <ul style="margin:0;padding-left:20px;color:#d1d5db;font-size:13px;line-height:1.9;">
          ${role === 'buyer' ? '<li>Complete your company profile</li><li>Create your first material requirement</li><li>Browse listings & connect with generators</li>'
            : role === 'generator' ? '<li>Complete your company profile</li><li>List your first material</li><li>Respond to buyer requests</li>'
            : '<li>Review pending verifications</li><li>Monitor platform activity</li>'}
        </ul>
      </div>
      ${btn('Go to Dashboard', `${CLIENT_URL}`)}`,
  });
  const info = await sendWithRetry({ from: FROM, to: toEmail, subject: `Welcome to WasteExchange AI, ${name}!`, html });
  console.log(`📧 Welcome → ${toEmail}`);
  return info;
};

// ============================================================
// 10. Admin — New Signup Alert
// ============================================================
const sendAdminNewSignupEmail = async (adminEmail, user) => {
  if (!adminEmail) throw new Error('sendAdminNewSignupEmail: admin email required');
  const roleLabel = user.role === 'generator' ? 'Generator' : user.role === 'admin' ? 'Administrator' : 'Buyer';
  const html = emailLayout({
    title: 'New User Registered',
    bodyHtml: `
      <h2 style="margin:0 0 8px;color:#fff;font-size:22px;">New Registration</h2>
      <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;">A new user just signed up.</p>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px 20px;margin-bottom:24px;">
        <table width="100%">
          ${tableRow('Name', user.name)}
          ${tableRow('Email', user.email)}
          ${tableRow('Role', roleLabel, '#a78bfa')}
          ${tableRow('User ID', user._id, '#6b7280')}
        </table>
      </div>
      ${btn('Review in Admin Panel', `${CLIENT_URL}/admin`)}`,
  });
  const info = await sendWithRetry({ from: FROM, to: adminEmail, subject: `🆕 New ${roleLabel} Signup: ${user.name}`, html });
  console.log(`📧 Admin signup alert → ${adminEmail}`);
  return info;
};

// ============================================================
// 11. Admin — Company Registration Alert
// ============================================================
const sendAdminCompanyRegistrationEmail = async (adminEmail, user) => {
  if (!adminEmail) throw new Error('sendAdminCompanyRegistrationEmail: admin email required');
  const html = emailLayout({
    title: 'New Company Registered',
    bodyHtml: `
      <h2 style="margin:0 0 8px;color:#fff;font-size:22px;">New Company Registration</h2>
      <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;">A user submitted company details for verification.</p>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px 20px;margin-bottom:24px;">
        <table width="100%">
          ${tableRow('User', user.name)}
          ${tableRow('Email', user.email)}
          ${tableRow('Role', user.role, '#a78bfa')}
          ${tableRow('Company', user.companyName || '—')}
          ${tableRow('GST', user.gstNumber || '—')}
          ${tableRow('PAN', user.panNumber || '—')}
          ${tableRow('Reg No.', user.companyRegistrationNo || '—')}
          ${tableRow('City', user.companyCity || '—')}
        </table>
      </div>
      ${btn('Review Company', `${CLIENT_URL}/admin`)}`,
  });
  const info = await sendWithRetry({ from: FROM, to: adminEmail, subject: `🏢 Company Registration: ${user.companyName || user.name}`, html });
  console.log(`📧 Admin company-reg alert → ${adminEmail}`);
  return info;
};

// ============================================================
// 12. Generic Notification
// ============================================================
const sendNotificationEmail = async (toEmail, { subject, title, message, ctaText, ctaUrl }) => {
  if (!toEmail) throw new Error('sendNotificationEmail: email required');
  const html = emailLayout({
    title: title || subject,
    bodyHtml: `
      <h2 style="margin:0 0 12px;color:#fff;font-size:22px;">${title || subject}</h2>
      <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;line-height:1.7;">${message || ''}</p>
      ${ctaText && ctaUrl ? btn(ctaText, ctaUrl) : ''}`,
  });
  const info = await sendWithRetry({ from: FROM, to: toEmail, subject, html });
  console.log(`📧 Notification → ${toEmail}`);
  return info;
};

// ============================================================
// 13. Test
// ============================================================
const sendTestEmail = async (toEmail) => {
  if (!toEmail) throw new Error('sendTestEmail: email required');
  const html = emailLayout({ title: 'Test Email', bodyHtml: '<h2 style="margin:0;color:#fff;">✅ Mailtrap works!</h2>' });
  const info = await sendWithRetry({ from: FROM, to: toEmail, subject: 'WasteExchange AI — Test Email', html });
  console.log(`📧 Test → ${toEmail}`);
  return info;
};

module.exports = {
  transporter,
  sendOtpEmail,
  sendDealConfirmationEmail,
  sendPaymentReceivedEmail,
  sendOfferReceivedEmail,
  sendDealCompletedEmail,
  sendCompanyVerifiedEmail,
  sendCompanyRejectedEmail,
  sendWalletTopupEmail,
  sendWelcomeEmail,
  sendAdminNewSignupEmail,
  sendAdminCompanyRegistrationEmail,
  sendNotificationEmail,
  sendTestEmail,
};











































// const nodemailer = require('nodemailer');

// // DEVELOPMENT KE LIYE ETHEREAL (Fake SMTP)
// // Production me ise apne SendGrid/Gmail SMTP se replace karein
// let transporter;

// nodemailer.createTestAccount((err, account) => {
//     if (err) {
//         console.error('Failed to create a testing account. ' + err.message);
//         return process.exit(1);
//     }
//     transporter = nodemailer.createTransport({
//         host: account.smtp.host,
//         port: account.smtp.port,
//         secure: account.smtp.secure,
//         auth: {
//             user: account.user,
//             pass: account.pass
//         }
//     });
//     console.log('Ethereal Email ready. Preview URL will be logged after sending.');
// });

// // 1. OTP Email Bhejne Ka Function
// const sendOtpEmail = async (toEmail, otp) => {
//     const mailOptions = {
//         from: '"WasteExchange AI" <no-reply@wasteexchange.com>',
//         to: toEmail,
//         subject: 'Deal Acceptance OTP',
//         html: `<h3>Aapka Deal Acceptance OTP hai: <b>${otp}</b></h3>
//                <p>Ye OTP 10 minute ke liye valid hai. Kripya kisi ke saath share na karein.</p>`
//     };
//     const info = await transporter.sendMail(mailOptions);
//     console.log('OTP Email sent: %s', info.messageId);
//     console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info)); // Testing ke liye
// };

// // 2. Invoice Email Bhejne Ka Function (PDF Attach karke)
// const sendInvoiceEmail = async (toEmail, pdfBuffer, invoiceId) => {
//     const mailOptions = {
//         from: '"WasteExchange AI" <billing@wasteexchange.com>',
//         to: toEmail,
//         subject: `Invoice for your transaction #${invoiceId}`,
//         html: `<h3>Dhanyawad!</h3><p>Aapki transaction successful rahi. Invoice attached hai.</p>`,
//         attachments: [
//             {
//                 filename: `Invoice_${invoiceId}.pdf`,
//                 content: pdfBuffer,
//                 contentType: 'application/pdf'
//             }
//         ]
//     };
//     const info = await transporter.sendMail(mailOptions);
//     console.log('Invoice Email sent: %s', nodemailer.getTestMessageUrl(info));
// };

// // 3. Deal Confirmation Email
// const sendDealConfirmationEmail = async (toEmail, dealId) => {
//     const mailOptions = {
//         from: '"WasteExchange AI" <deals@wasteexchange.com>',
//         to: toEmail,
//         subject: 'Deal Successfully Accepted',
//         html: `<h3>Congratulations!</h3><p>Aapne deal #${dealId} successfully accept kar li hai.</p>`
//     };
//     const info = await transporter.sendMail(mailOptions);
//     console.log('Deal Confirmation sent: %s', nodemailer.getTestMessageUrl(info));
// };

// module.exports = { sendOtpEmail, sendInvoiceEmail, sendDealConfirmationEmail };
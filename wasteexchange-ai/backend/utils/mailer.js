// backend/utils/mailer.js
const nodemailer = require('nodemailer');

// ✅ Uses YOUR existing .env names (MAILTRAP_*) with fallbacks to MAIL_* just in case
const MAIL_HOST = process.env.MAILTRAP_HOST || process.env.MAIL_HOST || 'sandbox.smtp.mailtrap.io';
const MAIL_PORT = Number(process.env.MAILTRAP_PORT || process.env.MAIL_PORT) || 2525;
const MAIL_USER = process.env.MAILTRAP_USER || process.env.MAIL_USER;
const MAIL_PASS = process.env.MAILTRAP_PASS || process.env.MAIL_PASS;

const FROM_NAME = process.env.MAIL_FROM_NAME || 'WasteExchange AI';
const FROM_EMAIL = process.env.MAIL_FROM_EMAIL || 'no-reply@wasteexchange.ai';
const FROM = `${FROM_NAME} <${FROM_EMAIL}>`;

// Sanity check so you get a clear message if creds are missing
if (!MAIL_USER || !MAIL_PASS) {
  console.error('❌ Mailer: missing SMTP credentials. Check MAILTRAP_USER / MAILTRAP_PASS in .env');
}

const transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: MAIL_PORT,
  secure: false, // 2525 uses STARTTLS, not implicit TLS
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
});

const baseTemplate = (title, bodyHtml) => `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f0f1a;color:#e5e7eb;border-radius:16px;border:1px solid rgba(139,92,246,0.2);">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);line-height:56px;font-size:26px;color:#fff;">♻️</div>
      <h1 style="color:#a78bfa;font-size:22px;margin:14px 0 0;font-weight:800;letter-spacing:-0.4px;">WasteExchange AI</h1>
      <p style="color:#6b7280;font-size:12px;margin:4px 0 0;">Smart Waste Marketplace</p>
    </div>
    <h2 style="color:#f3f4f6;font-size:18px;margin:0 0 14px;font-weight:700;">${title}</h2>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:28px 0 16px;" />
    <p style="font-size:11px;color:#6b7280;text-align:center;margin:0;">© ${new Date().getFullYear()} WasteExchange AI · This is an automated email, please do not reply.</p>
  </div>
`;

const otpBlock = (otp) => `
  <div style="text-align:center;margin:28px 0;">
    <div style="display:inline-block;padding:16px 30px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;font-size:30px;font-weight:800;letter-spacing:10px;color:#ffffff;font-family:'Courier New',monospace;">${otp}</div>
  </div>
`;

const sendSignupOTPEmail = async (to, name, otp) => {
  const html = baseTemplate(
    'Verify your email address',
    `
      <p style="font-size:14px;color:#d1d5db;line-height:1.6;">Hi <strong style="color:#fff;">${name || 'there'}</strong>,</p>
      <p style="font-size:14px;color:#d1d5db;line-height:1.6;">Use the OTP below to verify your email and complete your WasteExchange AI account registration.</p>
      ${otpBlock(otp)}
      <p style="font-size:13px;color:#9ca3af;text-align:center;">This OTP expires in <strong style="color:#fbbf24;">10 minutes</strong>. Never share it with anyone.</p>
      <p style="font-size:12px;color:#6b7280;margin-top:22px;">If you didn't request this, you can safely ignore this email.</p>
    `
  );
  return transporter.sendMail({
    from: FROM,
    to,
    subject: '🔐 Verify your WasteExchange AI account',
    html,
    text: `Your WasteExchange AI verification OTP is ${otp}. It expires in 10 minutes.`,
  });
};

const sendPasswordResetOTPEmail = async (to, name, otp) => {
  const html = baseTemplate(
    'Reset your password',
    `
      <p style="font-size:14px;color:#d1d5db;line-height:1.6;">Hi <strong style="color:#fff;">${name || 'there'}</strong>,</p>
      <p style="font-size:14px;color:#d1d5db;line-height:1.6;">We received a request to reset your WasteExchange AI password. Use the OTP below to set a new password.</p>
      ${otpBlock(otp)}
      <p style="font-size:13px;color:#9ca3af;text-align:center;">This OTP expires in <strong style="color:#fbbf24;">10 minutes</strong>.</p>
      <p style="font-size:12px;color:#ef4444;margin-top:22px;">⚠️ If you didn't request this, please secure your account immediately.</p>
    `
  );
  return transporter.sendMail({
    from: FROM,
    to,
    subject: '🔑 Reset your WasteExchange AI password',
    html,
    text: `Your WasteExchange AI password reset OTP is ${otp}. It expires in 10 minutes.`,
  });
};

module.exports = { transporter, sendSignupOTPEmail, sendPasswordResetOTPEmail };
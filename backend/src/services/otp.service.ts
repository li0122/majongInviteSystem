import nodemailer from "nodemailer";

function isTruthy(value?: string) {
  return ["true", "1", "yes"].includes((value || "").toLowerCase());
}

function resolveSmtpUser() {
  return process.env.SMTP_USER || process.env.GMAIL_USER;
}

function resolveSmtpPass() {
  return process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
}

function createTransporter() {
  const provider = (process.env.SMTP_PROVIDER || "").toLowerCase();
  const user = resolveSmtpUser();
  const pass = resolveSmtpPass();

  if (provider === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE ? isTruthy(process.env.SMTP_SECURE) : port === 465;
  const requireTLS = isTruthy(process.env.SMTP_REQUIRE_TLS || "false");

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS,
    auth: {
      user,
      pass,
    },
  });
}

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpEmail(email: string, otp: string) {
  const from = process.env.OTP_EMAIL_FROM || "no-reply@mahjongmatch.local";
  const provider = (process.env.SMTP_PROVIDER || "").toLowerCase();
  const user = resolveSmtpUser();
  const pass = resolveSmtpPass();
  const hasProviderConfig = provider === "gmail" || !!process.env.SMTP_HOST;

  if (!hasProviderConfig || !user || !pass) {
    console.log(`[OTP MOCK] email=${email}, otp=${otp}`);
    return;
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from,
    to: email,
    subject: "麻將配對 OTP 驗證碼",
    text: `您的驗證碼是 ${otp}，10 分鐘內有效。`,
  });
}

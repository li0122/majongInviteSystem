import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpEmail(email: string, otp: string) {
  const from = process.env.OTP_EMAIL_FROM || "no-reply@mahjongmatch.local";

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
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

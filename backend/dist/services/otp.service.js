"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOtp = generateOtp;
exports.sendOtpEmail = sendOtpEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
function createTransporter() {
    return nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
async function sendOtpEmail(email, otp) {
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

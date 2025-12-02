import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Ensure .env is loaded even if server was started from another cwd
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT) || 465;
const smtpPass =
  process.env.SMTP_PASS && process.env.SMTP_PASS.includes(" ")
    ? process.env.SMTP_PASS.replace(/\s+/g, "")
    : process.env.SMTP_PASS || "";
const smtpSecure =
  process.env.SMTP_SECURE === "true" || (!process.env.SMTP_SECURE && smtpPort === 465);
const canUseSmtp = Boolean(process.env.SMTP_USER && smtpPass);

if (!canUseSmtp) {
  console.error("SMTP init skipped", {
    userPresent: Boolean(process.env.SMTP_USER),
    passLen: (process.env.SMTP_PASS || "").length,
    passPresent: Boolean(process.env.SMTP_PASS)
  });
}

let emailTransporter = null;

const getTransporter = () => {
  if (emailTransporter) return emailTransporter;
  if (!canUseSmtp) return null;
  try {
    emailTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: smtpPass
      }
    });
    return emailTransporter;
  } catch (err) {
    console.error("SMTP transporter init failed:", err.message);
    emailTransporter = null;
    return null;
  }
};

export const sendEmailOtp = async (toEmail, otp) => {
  if (!toEmail) return { ok: false, error: "Email missing" };
  const transporter = getTransporter();
  if (!transporter) {
    const reason = canUseSmtp ? "SMTP transporter init failed" : "SMTP creds missing";
    console.error("Email OTP skipped:", reason);
    return { ok: false, error: reason, devOtp: otp };
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject: "Your Mrigmaya Saree OTP",
      text: `Your Mrigmaya Saree OTP is ${otp}. It will expire in 5 minutes.`,
      html: `<p>Your Mrigmaya Saree OTP is <strong>${otp}</strong>.</p><p>It will expire in 5 minutes.</p>`
    });
    return { ok: true };
  } catch (err) {
    console.error("SMTP send error:", err.message);
    return { ok: false, error: err.message, devOtp: otp };
  }
};

export const otpSender = (res) => async ({ email, mobile, otp }) => {
  // Email first
  if (email) {
    const devMode = await sendEmailOtp(email, otp);
    if (!emailTransporter && devMode) {
      return res.json({
        msg: "OTP sent (development mode)",
        devOtp: process.env.NODE_ENV !== "production" ? otp : undefined
      });
    }
    if (!emailTransporter) {
      return res.status(500).json({ msg: "Email not configured" });
    }
    return res.json({ msg: "OTP sent" });
  }

  // SMS not configured; log in dev
  console.log("OTP (SMS not configured):", mobile || "unknown", otp);
  if (process.env.NODE_ENV !== "production") {
    return res.json({
      msg: "OTP sent (development mode)",
      devOtp: otp
    });
  }
  return res.status(500).json({ msg: "Unable to send OTP. Try again later." });
};

import express from "express";
import jwt from "jsonwebtoken";
import Twilio from "twilio";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { sendEmailOtp } from "../utils/otpSender.js";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const router = express.Router();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashPassword = async (password) => bcrypt.hash(password, 10);
const comparePassword = async (password, hash) => bcrypt.compare(password, hash || "");

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const normalizeMobile = (mobile) => {
  if (!mobile) return mobile;
  if (mobile.startsWith("+")) return mobile;
  if (mobile.length === 10) return `+91${mobile}`;
  return `+${mobile}`;
};

const normalizeEmail = (email) => (email || "").trim().toLowerCase();

const isAdminMobile = (mobile) => {
  if (!process.env.ADMIN_MOBILE) return false;
  return normalizeMobile(process.env.ADMIN_MOBILE) === normalizeMobile(mobile);
};

const isAdminEmail = (email) => {
  if (!process.env.ADMIN_EMAIL) return false;
  return normalizeEmail(process.env.ADMIN_EMAIL) === normalizeEmail(email);
};

// Allow returning dev OTPs when delivery fails, to unblock admin or debugging flows
const canReturnDevOtp = (userRole) =>
  process.env.ALLOW_DEV_OTP === "true" || process.env.NODE_ENV !== "production" || userRole === "admin";

const sendMobileOtp = async (user, res) => {
  const otp = generateOTP();
  user.otp = otp;
  user.otpExpires = Date.now() + 5 * 60 * 1000;
  await user.save();

  const allowDevOtp = canReturnDevOtp(user?.role);

  try {
    if (twilioClient && process.env.TWILIO_FROM_NUMBER) {
      await twilioClient.messages.create({
        body: `Your Mrigmaya Saree OTP is ${otp}. It will expire in 5 minutes.`,
        from: process.env.TWILIO_FROM_NUMBER,
        to: normalizeMobile(user.mobile)
      });
      return res.json({ msg: "OTP sent" });
    }
    console.log("OTP (SMS not configured):", otp);
    return res.json({
      msg: "OTP sent (development mode)",
      devOtp: allowDevOtp ? otp : undefined
    });
  } catch (err) {
    console.error("OTP send error:", err.message);
    if (allowDevOtp) {
      console.log("DEV OTP (fallback after send error):", otp);
      return res.json({
        msg: "OTP sent (development mode)",
        devOtp: otp,
        note: err.message
      });
    }
    return res.status(500).json({ msg: "Unable to send OTP. Try again later." });
  }
};

// Google OAuth
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  FRONTEND_URL = "http://localhost:5173"
} = process.env;

const hasGoogleConfig = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";
const buildGoogleRedirectUri = (req) => {
  const fallback = `${req.protocol}://${req.get("host")}${GOOGLE_CALLBACK_PATH}`;
  const raw = (GOOGLE_REDIRECT_URI || fallback || "").trim();
  const cleaned = raw.split(/\s+/)[0]; // Drop accidental notes/comments after the URL.
  try {
    const url = new URL(cleaned);
    return `${url.origin}${url.pathname || GOOGLE_CALLBACK_PATH}`;
  } catch (err) {
    console.warn("Invalid GOOGLE_REDIRECT_URI, using fallback:", cleaned);
    return fallback;
  }
};
const getGoogleClient = (redirectUri) => new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);

const issueJwt = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

router.get("/google", (req, res) => {
  if (!hasGoogleConfig) return res.status(500).json({ msg: "Google auth not configured" });
  const redirect = req.query.redirect || "/";
  const redirectUri = buildGoogleRedirectUri(req);
  const googleClient = getGoogleClient(redirectUri);
  const url = googleClient.generateAuthUrl({
    access_type: "offline",
    prompt: "select_account",
    scope: ["openid", "profile", "email"],
    redirect_uri: redirectUri,
    state: encodeURIComponent(redirect)
  });
  res.redirect(url);
});

router.get("/google/callback", async (req, res) => {
  if (!hasGoogleConfig) return res.status(500).send("Google auth not configured");
  const { code, state } = req.query;
  const fallbackRedirect = decodeURIComponent(state || "/");
  if (!code) return res.redirect(`${FRONTEND_URL}/auth/google?error=missing_code`);
  try {
    const redirectUri = buildGoogleRedirectUri(req);
    const googleClient = getGoogleClient(redirectUri);
    const { tokens } = await googleClient.getToken({ code, redirect_uri: redirectUri });
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = normalizeEmail(payload.email);
    const name = payload.name || email?.split("@")[0] || "User";
    const googleId = payload.sub;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        name,
        googleId,
        verified: true,
        role: isAdminEmail(email) ? "admin" : "user"
      });
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (!user.name) user.name = name;
      user.verified = true;
      if (isAdminEmail(email)) user.role = "admin";
      await user.save();
    }

    const token = issueJwt(user._id);
    const redirectUrl = `${FRONTEND_URL}/auth/google?token=${encodeURIComponent(
      token
    )}&name=${encodeURIComponent(user.name || "")}&email=${encodeURIComponent(email || "")}&redirect=${encodeURIComponent(
      fallbackRedirect
    )}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("Google auth error:", err?.message || err);
    return res.redirect(`${FRONTEND_URL}/auth/google?error=google_auth_failed`);
  }
});

router.post("/send-otp", async (req, res) => {
  const { mobile, email, name } = req.body;
  const normalizedEmail = email ? normalizeEmail(email) : "";
  const normalizedMobile = mobile ? normalizeMobile(mobile) : "";

  if (!mobile && !normalizedEmail) {
    return res.status(400).json({ msg: "Email or mobile required" });
  }

  // Admin mobile gets a dedicated path: allow OTP even if user missing
  if (normalizedMobile && isAdminMobile(normalizedMobile)) {
    let adminUser = await User.findOne({ mobile: normalizedMobile });
    if (!adminUser) {
      adminUser = await User.create({
        mobile: normalizedMobile,
        role: "admin",
        name: name ? name.trim() : "Admin",
        verified: true
      });
    } else {
      adminUser.role = "admin";
      adminUser.verified = true;
      if (name && !adminUser.name) adminUser.name = name.trim();
      await adminUser.save();
    }
    return sendMobileOtp(adminUser, res);
  }

  let user = await User.findOne(
    normalizedEmail
      ? { email: normalizedEmail }
      : { $or: [{ mobile }, { mobile: normalizedMobile }] }
  );

  if (!user || user.verified === false) {
    return res.status(400).json({
      msg: "Account not found. Please create an account first, then try login with email/password or OTP."
    });
  }

  if (normalizedEmail && !user.email) user.email = normalizedEmail;
  if (mobile && !user.mobile) user.mobile = normalizedMobile || mobile;
  if (name && !user.name) user.name = name.trim();

  if (!normalizedEmail && !user.mobile) {
    return res.status(400).json({ msg: "Email or mobile required" });
  }

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpires = Date.now() + 5 * 60 * 1000;
  await user.save();

  try {
    if (normalizedEmail) {
      const result = await sendEmailOtp(normalizedEmail, otp);
      if (!result.ok) {
        if (canReturnDevOtp(user?.role)) {
          return res.json({
            msg: "OTP sent (development mode)",
            devOtp: result.devOtp || otp,
            note: result.error
          });
        }
        return res.status(500).json({ msg: "Unable to send OTP via email", error: result.error });
      }
      return res.json({ msg: "OTP sent" });
    } else if (twilioClient && process.env.TWILIO_FROM_NUMBER) {
      await twilioClient.messages.create({
        body: `Your Mrigmaya Saree OTP is ${otp}. It will expire in 5 minutes.`,
        from: process.env.TWILIO_FROM_NUMBER,
        to: normalizeMobile(user.mobile)
      });
      return res.json({ msg: "OTP sent" });
    } else {
      console.log("OTP (SMS not configured):", otp);
      return res.json({
        msg: "OTP sent (development mode)",
        devOtp: canReturnDevOtp(user?.role) ? otp : undefined
      });
    }
  } catch (err) {
    console.error("OTP send error:", err.message);
    if (canReturnDevOtp(user?.role)) {
      console.log("DEV OTP (fallback after send error):", otp);
      return res.json({
        msg: "OTP sent (development mode)",
        devOtp: otp,
        note: err.message
      });
    }
    return res.status(500).json({ msg: "Unable to send OTP. Try again later." });
  }

  res.json({ msg: "OTP sent" });
});

router.post("/verify-otp", async (req, res) => {
  const { mobile, email, otp, name } = req.body;
  const normalizedEmail = email ? normalizeEmail(email) : "";
  const normalizedMobile = mobile ? normalizeMobile(mobile) : "";

  if (!otp) return res.status(400).json({ msg: "OTP required" });
  if (!normalizedEmail && !mobile) return res.status(400).json({ msg: "Email or mobile required" });

  // Admin shortcut
  if (normalizedMobile && isAdminMobile(normalizedMobile)) {
    let adminUser = await User.findOne({ mobile: normalizedMobile });
    if (!adminUser) {
      return res.status(400).json({ msg: "Admin not found" });
    }
    // Allow OTP verification even if verified flag is false, and set admin.
    if (adminUser.otp !== otp) return res.status(400).json({ msg: "Invalid OTP" });
    if (adminUser.otpExpires && adminUser.otpExpires < Date.now()) {
      return res.status(400).json({ msg: "OTP expired" });
    }
    adminUser.role = "admin";
    adminUser.verified = true;
    if (name && !adminUser.name) adminUser.name = name.trim();
    const token = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    adminUser.otp = null;
    adminUser.otpExpires = null;
    await adminUser.save();
    return res.json({ token, user: adminUser });
  }

  let user = await User.findOne(
    normalizedEmail
      ? { email: normalizedEmail }
      : { $or: [{ mobile }, { mobile: normalizedMobile }] }
  );

  if (!user) return res.status(400).json({ msg: "User not found" });

  if (user.otp !== otp) return res.status(400).json({ msg: "Invalid OTP" });
  if (user.otpExpires && user.otpExpires < Date.now()) {
    return res.status(400).json({ msg: "OTP expired" });
  }

  if (!user.verified) {
    user.verified = true;
  }
  if (name && !user.name) {
    user.name = name.trim();
  } else if (!user.name && normalizedEmail) {
    user.name = normalizedEmail.split("@")[0];
  }

  if (isAdminMobile(mobile) || isAdminEmail(normalizedEmail)) {
    user.role = "admin";
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

  user.otp = null;
  user.otpExpires = null;
  await user.save();

  res.json({ token, user });
});

router.post("/register", async (req, res) => {
  const { name, email, password, mobile } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedMobile = normalizeMobile(mobile);
  if (!name || !normalizedEmail || !password) {
    return res.status(400).json({ msg: "Name, email, password required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ msg: "Password must be at least 6 characters" });
  }

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    return res.status(400).json({ msg: "Account already exists. Login instead." });
  }
  if (normalizedMobile) {
    const existingMobile = await User.findOne({ mobile: normalizedMobile });
    if (existingMobile) {
      return res.status(400).json({ msg: "Mobile already linked to another account" });
    }
  }

  const passwordHash = await hashPassword(password);
  const userPayload = {
    name: name.trim(),
    email: normalizedEmail,
    mobile: normalizedMobile || undefined,
    passwordHash,
    verified: true
  };
  if (isAdminEmail(normalizedEmail) || isAdminMobile(normalizedMobile)) {
    userPayload.role = "admin";
  }

  const user = await User.create(userPayload);
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user });
});

router.post("/login-password", async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    return res.status(400).json({ msg: "Email and password required" });
  }
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.status(400).json({ msg: "User not found" });

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) return res.status(400).json({ msg: "Invalid credentials" });

  if (!user.verified) {
    user.verified = true;
    await user.save();
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user });
});

export default router;

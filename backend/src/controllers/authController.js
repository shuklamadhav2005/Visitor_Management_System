import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { sendMail } from '../utils/mailer.js';

function createToken(userId) {
  const secret = process.env.JWT_SECRET || process.env.SECRET || 'dev_jwt_secret_change_me';
  return jwt.sign({ id: userId }, secret, { expiresIn: '7d' });
}

function buildUserPayload(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    flatNumber: user.flatNumber || '',
  };
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function createResetToken(userId) {
  const secret = process.env.RESET_PASSWORD_SECRET || process.env.JWT_SECRET || process.env.SECRET || 'dev_jwt_secret_change_me';
  return jwt.sign({ id: userId, purpose: 'reset-password' }, secret, { expiresIn: '15m' });
}

async function sendWelcomeEmail(user) {
  const sent = await sendMail({
    to: user.email,
    subject: 'Welcome to Smart Visitor System',
    text: `Hi ${user.name}, welcome to Smart Visitor System. Your account has been created successfully.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin:0 0 12px">Welcome, ${user.name}</h2>
        <p>Your Smart Visitor System account is ready.</p>
        <p>You can sign in with your email: <strong>${user.email}</strong></p>
      </div>
    `,
  });

  return sent;
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, adminCode, securityCode, flatNumber } = req.body;

  if (!name || !email || !password) {
    throw new AppError('Name, email, and password are required', 400);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    throw new AppError('An account with this email already exists', 400);
  }

  const requestedRole =
    role === 'admin' && adminCode === process.env.ADMIN_CODE
      ? 'admin'
      : role === 'security' && securityCode === process.env.SECURITY_CODE
        ? 'security'
        : 'user';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: requestedRole,
    flatNumber: requestedRole === 'user' ? flatNumber || '' : '',
  });

  try {
    await sendWelcomeEmail(user);
  } catch (mailError) {
    console.warn('Welcome email failed:', mailError.message);
  }

  res.status(201).json({
    token: createToken(user._id),
    user: buildUserPayload(user),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  res.json({
    token: createToken(user._id),
    user: buildUserPayload(user),
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: buildUserPayload(req.user) });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return res.json({ message: 'If the email exists, an OTP has been sent.' });
  }

  const otp = String(crypto.randomInt(100000, 999999));
  user.resetPasswordOtpHash = hashOtp(otp);
  user.resetPasswordOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  const sent = await sendMail({
    to: user.email,
    subject: 'Password reset OTP',
    text: `Your password reset OTP is ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin:0 0 12px">Password Reset OTP</h2>
        <p>Your one-time password is:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:4px;margin:12px 0">${otp}</div>
        <p>This OTP expires in 10 minutes.</p>
      </div>
    `,
  });

  if (!sent) {
    console.warn('SMTP is not configured. OTP generated for', user.email);
  }

  if (process.env.NODE_ENV !== 'production' && !sent) {
    return res.json({ message: 'OTP generated successfully.', devOtp: otp });
  }

  res.json({ message: 'If the email exists, an OTP has been sent.' });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new AppError('Email and OTP are required', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() })
    .select('+resetPasswordOtpHash +resetPasswordOtpExpiresAt');

  if (!user || !user.resetPasswordOtpHash || !user.resetPasswordOtpExpiresAt) {
    throw new AppError('OTP is invalid or has expired', 400);
  }

  if (user.resetPasswordOtpExpiresAt.getTime() < Date.now()) {
    throw new AppError('OTP is invalid or has expired', 400);
  }

  if (hashOtp(otp) !== user.resetPasswordOtpHash) {
    throw new AppError('OTP is invalid or has expired', 400);
  }

  const resetToken = createResetToken(user._id);

  res.json({ message: 'OTP verified successfully.', resetToken });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, password, confirmPassword } = req.body;

  if (!resetToken || !password || !confirmPassword) {
    throw new AppError('Reset token, password, and confirm password are required', 400);
  }

  if (password !== confirmPassword) {
    throw new AppError('Passwords do not match', 400);
  }

  const secret = process.env.RESET_PASSWORD_SECRET || process.env.JWT_SECRET || process.env.SECRET || 'dev_jwt_secret_change_me';
  let decoded;

  try {
    decoded = jwt.verify(resetToken, secret);
  } catch (_error) {
    throw new AppError('Reset token is invalid or expired', 400);
  }

  if (decoded.purpose !== 'reset-password') {
    throw new AppError('Reset token is invalid or expired', 400);
  }

  const user = await User.findById(decoded.id).select('+resetPasswordOtpHash +resetPasswordOtpExpiresAt +password');

  if (!user || !user.resetPasswordOtpHash || !user.resetPasswordOtpExpiresAt) {
    throw new AppError('Reset token is invalid or expired', 400);
  }

  if (user.resetPasswordOtpExpiresAt.getTime() < Date.now()) {
    throw new AppError('Reset token is invalid or expired', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  user.password = hashedPassword;
  user.resetPasswordOtpHash = null;
  user.resetPasswordOtpExpiresAt = null;
  await user.save();

  res.json({ message: 'Password reset successfully.' });
});

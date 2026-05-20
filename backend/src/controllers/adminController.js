import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).select('-password');

  res.json({ users });
});

export const listResidents = asyncHandler(async (_req, res) => {
  const residents = await User.find({ role: 'user' }).sort({ flatNumber: 1, name: 1 }).select('name email role flatNumber');

  res.json({ residents });
});

export const createManagedUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, flatNumber } = req.body;

  if (!name || !email || !password || !role) {
    throw new AppError('Name, email, password, and role are required', 400);
  }

  if (!['user', 'security'].includes(role)) {
    throw new AppError('Role must be either user or security', 400);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('A user with this email already exists', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role,
    flatNumber: role === 'user' ? flatNumber || '' : '',
  });

  res.status(201).json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      flatNumber: user.flatNumber,
    },
  });
});

export const updateManagedUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, flatNumber } = req.body;

  const user = await User.findById(id).select('-password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role === 'admin') {
    throw new AppError('Admin users cannot be edited from this screen', 400);
  }

  if (typeof name === 'string') {
    user.name = name.trim() || user.name;
  }

  if (user.role === 'user' && typeof flatNumber === 'string') {
    user.flatNumber = flatNumber.trim();
  }

  await user.save();

  res.json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      flatNumber: user.flatNumber,
    },
  });
});

export const deleteManagedUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user._id.toString() === id) {
    throw new AppError('You cannot delete your own account', 400);
  }

  const user = await User.findById(id).select('-password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role === 'admin') {
    throw new AppError('Admin users cannot be deleted from this screen', 400);
  }

  await User.deleteOne({ _id: id });

  res.json({ message: 'User removed successfully' });
});

import Visitor from '../models/Visitor.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { sendMail } from '../utils/mailer.js';

function canAccessVisitor(visitor, user) {
  return user.role === 'admin' || visitor.createdBy.toString() === user._id.toString() || visitor.visitTo.toString() === user._id.toString();
}

export const listVisitors = asyncHandler(async (req, res) => {
  const query =
    req.user.role === 'admin'
      ? {}
      : req.user.role === 'security'
        ? { createdBy: req.user._id }
        : { visitTo: req.user._id };
  const visitors = await Visitor.find(query)
    .populate('createdBy', 'name email role')
    .populate('visitTo', 'name email role flatNumber')
    .populate('approvedBy', 'name email role')
    .populate('rejectedBy', 'name email role')
    .sort({ createdAt: -1 });

  res.json({ visitors });
});

export const createVisitor = asyncHandler(async (req, res) => {
  if (req.user.role !== 'security' && req.user.role !== 'admin') {
    throw new AppError('Only security users can create visitor requests', 403);
  }

  const { visitorName, phone, purpose, visitTo, notes, checkedInAt } = req.body;

  if (!visitorName || !phone || !purpose || !visitTo) {
    throw new AppError('Visitor name, phone, purpose, and resident are required', 400);
  }

  const resident = await User.findOne({ _id: visitTo, role: 'user' });

  if (!resident) {
    throw new AppError('Selected resident was not found', 404);
  }

  // Do not auto-approve visitor requests on creation.
  // Checked-in actions should be performed via the dedicated check-in endpoint.
  if (checkedInAt) {
    const chk = new Date(checkedInAt);
    if (Number.isNaN(chk.getTime())) {
      throw new AppError('Invalid check-in time', 400);
    }
    // Ignore checkedInAt provided on create — security should use check-in endpoint instead
    console.warn('Ignored checkedInAt on visitor creation; use check-in endpoint instead.');
  }

  const visitor = await Visitor.create({
    visitorName,
    phone,
    purpose,
    visitTo: resident._id,
    notes,
    createdBy: req.user._id,
    status: 'pending',
    checkedInAt: null,
    checkedInBy: null,
    approvedBy: null,
    responseTime: null,
  });

  // Notify resident by email when a new visitor request is created (pending)
  try {
    if (visitor.status === 'pending') {
      const residentEmail = resident.email;
      const subject = 'New visitor request';
      const text = `Hello ${resident.name},\n\nYou have a new visitor request from ${req.user.name || 'Security'}.\nVisitor: ${visitor.visitorName}\nPurpose: ${visitor.purpose}\nPhone: ${visitor.phone}\n\nPlease review and respond in the Resident portal.`;
      const html = `
        <div style="font-family:Arial,sans-serif;color:#111827">
          <h3 style="margin:0 0 8px">New visitor request</h3>
          <p>Hello ${resident.name},</p>
          <p>You have a new visitor request from <strong>${req.user.name || 'Security'}</strong>.</p>
          <ul>
            <li><strong>Visitor:</strong> ${visitor.visitorName}</li>
            <li><strong>Purpose:</strong> ${visitor.purpose}</li>
            <li><strong>Phone:</strong> ${visitor.phone}</li>
          </ul>
          <p>Please review and respond in the Resident portal.</p>
        </div>
      `;

      const sent = await sendMail({ to: residentEmail, subject, text, html });
      if (!sent) {
        console.warn('SMTP not configured - could not send visitor notification to', residentEmail);
      }
    }
  } catch (mailErr) {
    console.warn('Failed to send visitor notification:', mailErr?.message || mailErr);
  }

  res.status(201).json({ visitor });
});

export const respondToVisitor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (req.user.role !== 'user' && req.user.role !== 'admin') {
    throw new AppError('Only residents can approve or reject requests', 403);
  }

  if (!['approved', 'rejected'].includes(status)) {
    throw new AppError('Invalid response status', 400);
  }

  const visitor = await Visitor.findById(id);

  if (!visitor) {
    throw new AppError('Visitor not found', 404);
  }

  if (req.user.role !== 'admin' && visitor.visitTo.toString() !== req.user._id.toString()) {
    throw new AppError('You can only respond to your own visitor requests', 403);
  }

  if (!canAccessVisitor(visitor, req.user)) {
    throw new AppError('You cannot update this visitor', 403);
  }

  visitor.status = status;
  visitor.responseTime = new Date();
  visitor.approvedBy = status === 'approved' ? req.user._id : null;
  visitor.rejectedBy = status === 'rejected' ? req.user._id : null;

  await visitor.save();

  res.json({ visitor });
});

export const checkInVisitor = asyncHandler(async (req, res) => {
  if (req.user.role !== 'security' && req.user.role !== 'admin') {
    throw new AppError('Only security can check in visitors', 403);
  }

  const visitor = await Visitor.findById(req.params.id);

  if (!visitor) {
    throw new AppError('Visitor not found', 404);
  }

  if (visitor.status !== 'approved') {
    throw new AppError('Visitor must be approved before check in', 400);
  }

  const providedCheckInAt = req.body?.checkedInAt ? new Date(req.body.checkedInAt) : new Date();
  if (Number.isNaN(providedCheckInAt.getTime())) {
    throw new AppError('Invalid check-in time', 400);
  }

  visitor.checkedInAt = providedCheckInAt;
  visitor.checkedInBy = req.user._id;
  await visitor.save();

  res.json({ visitor });
});

export const checkOutVisitor = asyncHandler(async (req, res) => {
  if (req.user.role !== 'security' && req.user.role !== 'admin') {
    throw new AppError('Only security can check out visitors', 403);
  }

  const visitor = await Visitor.findById(req.params.id);

  if (!visitor) {
    throw new AppError('Visitor not found', 404);
  }

  if (visitor.status !== 'approved' && !visitor.checkedInAt) {
    throw new AppError('Visitor cannot be checked out in the current state', 400);
  }

  const providedCheckOutAt = req.body?.checkedOutAt ? new Date(req.body.checkedOutAt) : new Date();
  if (Number.isNaN(providedCheckOutAt.getTime())) {
    throw new AppError('Invalid check-out time', 400);
  }

  visitor.checkedOutAt = providedCheckOutAt;
  visitor.checkedOutBy = req.user._id;
  await visitor.save();

  res.json({ visitor });
});

export const getVisitorStats = asyncHandler(async (req, res) => {
  const baseMatch =
    req.user.role === 'admin'
      ? {}
      : req.user.role === 'security'
        ? { createdBy: req.user._id }
        : { visitTo: req.user._id };

  const [total, pending, approved, rejected, checkedIn, checkedOut] = await Promise.all([
    Visitor.countDocuments(baseMatch),
    Visitor.countDocuments({ ...baseMatch, status: 'pending' }),
    Visitor.countDocuments({ ...baseMatch, status: 'approved' }),
    Visitor.countDocuments({ ...baseMatch, status: 'rejected' }),
    Visitor.countDocuments({ ...baseMatch, checkedInAt: { $ne: null } }),
    Visitor.countDocuments({ ...baseMatch, checkedOutAt: { $ne: null } }),
  ]);

  res.json({
    stats: {
      total,
      pending,
      approved,
      rejected,
      checkedIn,
      checkedOut,
    },
  });
});

export const getRecentVisitors = asyncHandler(async (req, res) => {
  const query =
    req.user.role === 'admin'
      ? {}
      : req.user.role === 'security'
        ? { createdBy: req.user._id }
        : { visitTo: req.user._id };
  const visitors = await Visitor.find(query)
    .populate('visitTo', 'name flatNumber role')
    .populate('approvedBy', 'name role')
    .populate('rejectedBy', 'name role')
    .sort({ createdAt: -1 })
    .limit(6);

  res.json({ visitors });
});

export const getPendingRequests = asyncHandler(async (req, res) => {
  if (req.user.role === 'security') {
    const visitors = await Visitor.find({ createdBy: req.user._id, status: 'pending' })
      .populate('visitTo', 'name flatNumber role')
      .sort({ createdAt: -1 });
    return res.json({ visitors });
  }

  if (req.user.role === 'user') {
    const visitors = await Visitor.find({ visitTo: req.user._id, status: 'pending' })
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });
    return res.json({ visitors });
  }

  const visitors = await Visitor.find({ status: 'pending' })
    .populate('visitTo', 'name flatNumber role')
    .populate('createdBy', 'name role')
    .sort({ createdAt: -1 });

  res.json({ visitors });
});

export const getAllVisitorLogs = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const { status, resident, from, to } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (resident) filter.visitTo = resident;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const visitors = await Visitor.find(filter)
    .populate('visitTo', 'name email role flatNumber')
    .populate('createdBy', 'name email role')
    .populate('approvedBy', 'name email role')
    .populate('rejectedBy', 'name email role')
    .sort({ createdAt: -1 });

  res.json({ visitors });
});

export const deleteVisitorLog = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) {
    throw new AppError('Visitor not found', 404);
  }

  await Visitor.deleteOne({ _id: visitor._id });

  res.json({ message: 'Visitor entry deleted successfully' });
});

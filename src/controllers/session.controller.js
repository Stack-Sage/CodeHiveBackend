import { Session } from "../models/session.model.js";
import { User } from "../models/user.models.js";
import { Payment } from "../models/payment.model.js";
import { Notification } from "../models/notification.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

// Book a session (student initiates)
export const bookSession = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const studentId = req.user._id;
  const { topic, skill, message, proposedRate, proposedDates } = req.body;

  if (!topic || !skill || !proposedRate || !Array.isArray(proposedDates) || !proposedDates.length) {
    throw new ApiError(400, "All fields and at least one date/time are required");
  }
  if (studentId.toString() === teacherId) throw new ApiError(400, "You cannot book a session with yourself");

  const teacher = await User.findById(teacherId);
  if (!teacher || !teacher.roles.includes("educator")) {
    throw new ApiError(404, "Educator not found");
  }

  // Prevent duplicate pending requests
  const existing = await Session.findOne({
    student: studentId,
    teacher: teacherId,
    status: { $in: ["pending", "accepted", "paid"] }
  });
  if (existing) throw new ApiError(409, "You already have a pending or active session with this educator");

  const session = await Session.create({
    student: studentId,
    teacher: teacherId,
    topic,
    skill,
    message,
    proposedRate,
    proposedDates,
    status: "pending",
    statusHistory: [{ status: "pending", by: studentId }]
  });

  await Notification.create({
    user: teacherId,
    type: "session",
    message: `New session request from ${req.user.fullname}`,
    link: `/bookSession`
  });

  res.status(201).json(new ApiResponse(201, session, "Session booking request sent"));
});

// Teacher responds (accept/reject/cancel/propose new date)
export const respondSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { action, paymentMethod, newDates } = req.body;
  const userId = req.user._id;

  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, "Session not found");

  // Only teacher can accept/reject/cancel/propose
  if (String(session.teacher) !== String(userId)) throw new ApiError(403, "Not authorized");

  if (session.status !== "pending") throw new ApiError(400, "Session is not pending");

  if (action === "accept") {
    // Validate payment method
    if (!paymentMethod || (!paymentMethod.upi && !paymentMethod.bank && !paymentMethod.mobile)) {
      throw new ApiError(400, "At least one payment method (UPI, bank, or mobile) is required");
    }
    session.status = "accepted";
    session.teacherPaymentMethod = paymentMethod;
    session.statusHistory.push({ status: "accepted", by: userId });
    await Notification.create({
      user: session.student,
      type: "session",
      message: `Your session request was accepted by ${req.user.fullname}`,
      link: `/bookSession`
    });
  } else if (action === "reject" || action === "cancel") {
    session.status = "cancelled";
    session.statusHistory.push({ status: "cancelled", by: userId });
    await Notification.create({
      user: session.student,
      type: "session",
      message: `Your session request was cancelled by ${req.user.fullname}`,
      link: `/bookSession`
    });
  } else if (action === "propose_dates") {
    if (!Array.isArray(newDates) || !newDates.length) throw new ApiError(400, "New dates required");
    session.proposedDates = newDates;
    session.statusHistory.push({ status: "dates_proposed", by: userId });
    await Notification.create({
      user: session.student,
      type: "session",
      message: `Educator proposed new dates for your session.`,
      link: `/bookSession`
    });
  } else {
    throw new ApiError(400, "Invalid action");
  }
  await session.save();
  res.status(200).json(new ApiResponse(200, session, `Session ${action}ed`));
});

// Student or Teacher cancels session
export const cancelSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user._id;
  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, "Session not found");

  const isStudent = String(session.student) === String(userId);
  const isTeacher = String(session.teacher) === String(userId);

  if (!isStudent && !isTeacher) throw new ApiError(403, "Not authorized");

  // If session is pending (not paid), allow delete
  if (session.status === "pending" || session.status === "accepted") {
    await Session.findByIdAndDelete(sessionId);
    await Notification.create({
      user: isStudent ? session.teacher : session.student,
      type: "session",
      message: `Session was cancelled by ${isStudent ? "student" : "teacher"}.`,
      link: `/bookSession`
    });
    return res.status(200).json(new ApiResponse(200, {}, "Session cancelled and deleted"));
  }

  // If session is paid, handle refund logic
  if (session.status === "paid") {
    const payment = await Payment.findOne({ orderId: session.paymentId });
    if (!payment) throw new ApiError(400, "Payment not found for this session");

    let refundAmount = payment.amount;
    let refundType = "full";
    if (isStudent) {
      refundAmount = Math.round(payment.amount * 0.5);
      refundType = "half";
    }

    // TODO: Integrate with Razorpay refund API here if needed

    session.status = "refunded";
    session.payoutStatus = "refunded";
    session.statusHistory.push({ status: "refunded", by: userId });
    await session.save();

    await Notification.create({
      user: isStudent ? session.teacher : session.student,
      type: "session",
      message: `Session was cancelled by ${isStudent ? "student" : "teacher"}. ${isStudent ? "50%" : "100%"} refund processed.`,
      link: `/bookSession`
    });

    return res.status(200).json(new ApiResponse(200, { refundAmount, refundType }, `Session cancelled. ${isStudent ? "50%" : "100%"} refund processed.`));
  }

  throw new ApiError(400, "Cannot cancel session at this stage");
});

// Student pays for session (after accepted)
export const payForSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const studentId = req.user._id;
  const { paymentId } = req.body;

  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, "Session not found");
  if (String(session.student) !== String(studentId)) throw new ApiError(403, "Not authorized");
  if (session.status !== "accepted") throw new ApiError(400, "Session not accepted yet");

  const payment = await Payment.findById(paymentId);
  if (!payment || payment.status !== "success") throw new ApiError(400, "Payment not successful");

  const platformFee = Math.round(payment.amount * 0.05);
  const teacherAmount = payment.amount - platformFee;

  session.status = "paid";
  session.paymentId = payment._id;
  session.platformFee = platformFee;
  session.teacherAmount = teacherAmount;
  session.statusHistory.push({ status: "paid", by: studentId });
  session.payoutStatus = "pending";
  await session.save();

  await Notification.create({
    user: session.teacher,
    type: "payment",
    message: `Session with ${req.user.fullname} has been paid.`,
    link: `/bookSession`
  });

  res.status(200).json(new ApiResponse(200, session, "Session paid and confirmed"));
});

// Mark session as completed (teacher or student)
export const completeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user._id;
  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, "Session not found");
  if (![session.teacher.toString(), session.student.toString()].includes(userId.toString())) {
    throw new ApiError(403, "Not authorized");
  }
  if (session.status !== "paid") throw new ApiError(400, "Session must be paid before completion");
  session.status = "completed";
  session.statusHistory.push({ status: "completed", by: userId });
  session.payoutStatus = "paid";
  await session.save();
  await Notification.create({
    user: session.teacher,
    type: "session",
    message: `Session marked as completed. Payout will be processed.`,
    link: `/bookSession`
  });
  res.status(200).json(new ApiResponse(200, session, "Session marked as completed"));
});

// Refund session (admin or auto if cancelled before completion)
export const refundSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, "Session not found");
  if (session.status !== "paid") throw new ApiError(400, "Only paid sessions can be refunded");
  session.status = "refunded";
  session.payoutStatus = "refunded";
  session.statusHistory.push({ status: "refunded", by: req.user._id });
  await session.save();
  // TODO: Integrate with Razorpay refund API if needed
  await Notification.create({
    user: session.student,
    type: "session",
    message: `Session payment refunded.`,
    link: `/bookSession`
  });
  res.status(200).json(new ApiResponse(200, session, "Session refunded"));
});

// Get session history for a user (as student or teacher)
export const getSessionHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const sessions = await Session.find({
    $or: [
      { student: userId },
      { teacher: userId }
    ]
  })
    .populate("student", "fullname email")
    .populate("teacher", "fullname email")
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, sessions, "Session history"));
});

// Get session details (for dynamic [teacherId] booking page)
export const getSessionDetails = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await Session.findById(sessionId)
    .populate("student", "fullname email")
    .populate("teacher", "fullname email");
  if (!session) throw new ApiError(404, "Session not found");
  res.status(200).json(new ApiResponse(200, session, "Session details"));
});

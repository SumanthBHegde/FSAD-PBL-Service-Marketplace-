// Member 3: bookings, jobs and auto-assignment (prd.md sections 6, 7 and 9).
import Booking from "../models/Booking.js";
import { findCandidates, priceOf } from "../utils/assign.js";

// POST /api/bookings  { serviceId, date, slot, address, pincode }  -> auto-assigns a professional
export async function createBooking(req, res) {
  res.status(501).json({ message: "TODO: create booking with auto-assign" });
}

// GET /api/bookings/mine
export async function myBookings(req, res) {
  res.status(501).json({ message: "TODO: list my bookings" });
}

// PATCH /api/bookings/:id/cancel
export async function cancelBooking(req, res) {
  res.status(501).json({ message: "TODO: cancel booking" });
}

// PATCH /api/bookings/:id/pay
export async function payBooking(req, res) {
  res.status(501).json({ message: "TODO: simulated online payment" });
}

// PATCH /api/bookings/:id/review  { rating, review }
export async function reviewBooking(req, res) {
  res.status(501).json({ message: "TODO: review booking" });
}

// GET /api/jobs
export async function myJobs(req, res) {
  res.status(501).json({ message: "TODO: list assigned jobs" });
}

// PATCH /api/jobs/:id/status  { status: "in_progress" | "completed" }
export async function updateJobStatus(req, res) {
  res.status(501).json({ message: "TODO: update job status" });
}

// PATCH /api/jobs/:id/decline  -> auto-reassign
export async function declineJob(req, res) {
  res.status(501).json({ message: "TODO: decline and reassign" });
}

// PATCH /api/jobs/:id/cash
export async function markCashReceived(req, res) {
  res.status(501).json({ message: "TODO: mark cash received" });
}

// GET /api/admin/bookings
export async function allBookings(req, res) {
  res.status(501).json({ message: "TODO: list all bookings" });
}

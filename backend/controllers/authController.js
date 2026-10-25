// Member 1: auth and professional approval (prd.md sections 8 and 9).
import User from "../models/User.js";

// POST /api/auth/register  { name, email, password, phone }  -> customer
export async function register(req, res) {
  res.status(501).json({ message: "TODO: register customer" });
}

// POST /api/auth/register-pro  { name, email, password, phone, experienceYears }  -> pending professional
export async function registerPro(req, res) {
  res.status(501).json({ message: "TODO: register professional" });
}

// POST /api/auth/login  { email, password }  -> set "token" cookie
export async function login(req, res) {
  res.status(501).json({ message: "TODO: login" });
}

// POST /api/auth/logout  -> clear "token" cookie
export async function logout(req, res) {
  res.status(501).json({ message: "TODO: logout" });
}

// GET /api/auth/me  -> current user
export async function me(req, res) {
  res.status(501).json({ message: "TODO: current user" });
}

// GET /api/admin/pros?status=pending
export async function listPros(req, res) {
  res.status(501).json({ message: "TODO: list professionals" });
}

// PATCH /api/admin/pros/:id  { approvalStatus: "approved" | "rejected" }
export async function setApproval(req, res) {
  res.status(501).json({ message: "TODO: approve or reject professional" });
}

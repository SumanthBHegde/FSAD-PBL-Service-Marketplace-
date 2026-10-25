// Member 1: auth and professional approval (prd.md sections 8 and 9).
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const ONE_DAY = 24 * 60 * 60 * 1000;

// Create a JWT for the user, put it in an HttpOnly cookie and send the user back.
function sendToken(res, user, status = 200) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
  res.cookie("token", token, { httpOnly: true, sameSite: "lax", maxAge: ONE_DAY });
  res.status(status).json(user);
}

// Shared by both signups. The role comes from the server, never from req.body.
async function createUser(req, res, extra) {
  const { name, email, password, phone } = req.body ?? {};
  if (!name || !email || !password || !phone) {
    return res.status(400).json({ message: "Name, email, password and phone are required" });
  }
  if (await User.exists({ email: String(email).toLowerCase() })) {
    return res.status(409).json({ message: "Email already registered" });
  }
  const hash = await bcrypt.hash(password, 10); // bcrypt adds a random salt
  const user = await User.create({ name, email, phone, password: hash, ...extra });
  sendToken(res, user, 201);
}

// POST /api/auth/register  { name, email, password, phone }  -> customer
export async function register(req, res) {
  await createUser(req, res, { role: "customer" });
}

// POST /api/auth/register-pro  { name, email, password, phone, experienceYears }  -> pending professional
export async function registerPro(req, res) {
  await createUser(req, res, {
    role: "professional",
    approvalStatus: "pending",
    experienceYears: req.body?.experienceYears
  });
}

// POST /api/auth/login  { email, password }  -> set "token" cookie
export async function login(req, res) {
  const { email, password } = req.body ?? {};
  const user = await User.findOne({ email: String(email).toLowerCase() }).select("+password");
  if (!user || !(await bcrypt.compare(String(password), user.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  sendToken(res, user);
}

// POST /api/auth/logout  -> clear "token" cookie
export async function logout(req, res) {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
}

// GET /api/auth/me  -> current user
export async function me(req, res) {
  res.json(req.user);
}

// GET /api/admin/pros?status=pending
export async function listPros(req, res) {
  res.status(501).json({ message: "TODO: list professionals" });
}

// PATCH /api/admin/pros/:id  { approvalStatus: "approved" | "rejected" }
export async function setApproval(req, res) {
  res.status(501).json({ message: "TODO: approve or reject professional" });
}

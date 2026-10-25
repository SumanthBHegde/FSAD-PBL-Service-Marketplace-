import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Reads the "token" cookie, verifies it and loads the user into req.user.
export async function protect(req, res, next) {
  try {
    const { id } = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    req.user = await User.findById(id);
  } catch {
    // missing or invalid token: req.user stays undefined
  }
  if (!req.user) return res.status(401).json({ message: "Please log in" });
  next();
}

// Usage: allow("admin") or allow("customer", "professional"). Use after protect.
export function allow(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Not allowed" });
    next();
  };
}

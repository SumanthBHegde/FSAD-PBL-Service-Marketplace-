// Member 2: services and professional profile (prd.md section 9).
import Service from "../models/Service.js";
import User from "../models/User.js";

// GET /api/services?category=
export async function listServices(req, res) {
  res.status(501).json({ message: "TODO: list services" });
}

// GET /api/services/:id
export async function getService(req, res) {
  res.status(501).json({ message: "TODO: get service" });
}

// POST /api/services  { name, category, description, minPrice, maxPrice }
export async function createService(req, res) {
  res.status(501).json({ message: "TODO: create service" });
}

// PATCH /api/services/:id
export async function updateService(req, res) {
  res.status(501).json({ message: "TODO: update service" });
}

// PUT /api/pro/profile  { services: [{ service, price }], pincodes, workingDays }
export async function updateProfile(req, res) {
  res.status(501).json({ message: "TODO: update professional profile" });
}

// Creates the admin account and starter services. Safe to run more than once.
import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import Service from "./models/Service.js";

const services = [
  { name: "AC General Service", category: "ac", minPrice: 500, maxPrice: 900 },
  { name: "Home Deep Cleaning", category: "cleaning", minPrice: 1500, maxPrice: 3000 },
  { name: "Wall Painting (per room)", category: "painting", minPrice: 2000, maxPrice: 4000 },
  { name: "Tap and Leak Repair", category: "plumbing", minPrice: 200, maxPrice: 500 },
  { name: "Fan and Switch Repair", category: "electrical", minPrice: 200, maxPrice: 500 },
  { name: "Washing Machine Repair", category: "appliance", minPrice: 400, maxPrice: 800 }
];

await connectDB();

const email = process.env.ADMIN_EMAIL;
if (!(await User.exists({ email }))) {
  await User.create({
    name: "Admin",
    email,
    phone: "0000000000",
    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10),
    role: "admin"
  });
  console.log("Admin created: " + email);
}

for (const s of services) {
  await Service.updateOne({ name: s.name }, { $setOnInsert: s }, { upsert: true });
}
console.log("Services seeded: " + services.length);

await mongoose.disconnect();

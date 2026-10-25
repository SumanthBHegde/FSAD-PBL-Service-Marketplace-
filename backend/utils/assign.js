// Member 3: auto-assignment, the main feature (prd.md section 6).
import User from "../models/User.js";
import Booking from "../models/Booking.js";

// Return free, eligible professionals for the slot, least busy that day first.
export async function findCandidates({ serviceId, date, slot, pincode, exclude = [] }) {
  // TODO (Member 3): filter, remove busy, rank by workload
  return [];
}

// The professional's own price for a service.
export function priceOf(pro, serviceId) {
  return pro.services.find((s) => s.service.equals(serviceId)).price;
}

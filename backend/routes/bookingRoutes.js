import { Router } from "express";
import { protect, allow } from "../middleware/auth.js";
import * as ctrl from "../controllers/bookingController.js";

const router = Router();

router.post("/bookings", protect, allow("customer"), ctrl.createBooking);
router.get("/bookings/mine", protect, allow("customer"), ctrl.myBookings);
router.patch("/bookings/:id/cancel", protect, allow("customer"), ctrl.cancelBooking);
router.patch("/bookings/:id/pay", protect, allow("customer"), ctrl.payBooking);
router.patch("/bookings/:id/review", protect, allow("customer"), ctrl.reviewBooking);

router.get("/jobs", protect, allow("professional"), ctrl.myJobs);
router.patch("/jobs/:id/status", protect, allow("professional"), ctrl.updateJobStatus);
router.patch("/jobs/:id/decline", protect, allow("professional"), ctrl.declineJob);
router.patch("/jobs/:id/cash", protect, allow("professional"), ctrl.markCashReceived);

router.get("/admin/bookings", protect, allow("admin"), ctrl.allBookings);

export default router;

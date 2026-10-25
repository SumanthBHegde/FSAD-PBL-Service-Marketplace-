// Member 3: list all bookings (GET /api/admin/bookings).
import React from "react";

const e = React.createElement;

export default function AdminBookings() {
  return e("div", null, e("h2", null, "All bookings"), e("p", { className: "text-muted" }, "Coming soon."));
}

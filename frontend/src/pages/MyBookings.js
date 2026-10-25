// Member 3: list (GET /api/bookings/mine), cancel, pay, review.
import React from "react";

const e = React.createElement;

export default function MyBookings() {
  return e("div", null, e("h2", null, "My bookings"), e("p", { className: "text-muted" }, "Coming soon."));
}

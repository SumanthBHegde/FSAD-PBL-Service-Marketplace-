// Member 3: date, slot, address, PIN code form, POST /api/bookings (auto-assign).
import React from "react";

const e = React.createElement;

export default function BookService() {
  return e("div", null, e("h2", null, "Book a service"), e("p", { className: "text-muted" }, "Coming soon."));
}

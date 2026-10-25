// Member 2: list services (GET /api/services) with a Book link to /book/:serviceId.
import React from "react";

const e = React.createElement;

export default function Services() {
  return e("div", null, e("h2", null, "Services"), e("p", { className: "text-muted" }, "Coming soon."));
}

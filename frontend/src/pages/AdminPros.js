// Member 1: list pending pros (GET /api/admin/pros), approve or reject.
import React from "react";

const e = React.createElement;

export default function AdminPros() {
  return e("div", null, e("h2", null, "Professional approvals"), e("p", { className: "text-muted" }, "Coming soon."));
}

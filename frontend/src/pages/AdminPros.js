// Member 1: admin approves or rejects professionals.
import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const e = React.createElement;

export default function AdminPros() {
  const [pros, setPros] = useState([]);
  const [error, setError] = useState("");

  function load() {
    api("/api/admin/pros").then(setPros).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  function decide(id, approvalStatus) {
    api("/api/admin/pros/" + id, { method: "PATCH", body: { approvalStatus } })
      .then(load)
      .catch((err) => setError(err.message));
  }

  return e(
    "div",
    null,
    e("h2", null, "Professionals"),
    error && e("div", { className: "alert alert-danger" }, error),
    e(
      "table",
      { className: "table" },
      e("thead", null, e("tr", null, ["Name", "Email", "Phone", "Experience", "Status", ""].map((h) => e("th", { key: h }, h)))),
      e(
        "tbody",
        null,
        pros.map((p) =>
          e(
            "tr",
            { key: p._id },
            e("td", null, p.name),
            e("td", null, p.email),
            e("td", null, p.phone),
            e("td", null, (p.experienceYears ?? 0) + " yrs"),
            e("td", null, p.approvalStatus),
            e(
              "td",
              null,
              p.approvalStatus !== "approved" &&
                e("button", { className: "btn btn-sm btn-success me-2", onClick: () => decide(p._id, "approved") }, "Approve"),
              p.approvalStatus !== "rejected" &&
                e("button", { className: "btn btn-sm btn-outline-danger", onClick: () => decide(p._id, "rejected") }, "Reject")
            )
          )
        )
      )
    )
  );
}

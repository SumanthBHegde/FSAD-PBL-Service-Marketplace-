// Shared: landing page with a backend health check.
import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const e = React.createElement;

export default function Home() {
  const [health, setHealth] = useState("checking...");

  useEffect(() => {
    api("/api/health")
      .then((data) => setHealth("API " + data.status + ", database " + data.db))
      .catch((err) => setHealth("API unreachable: " + err.message));
  }, []);

  return e(
    "div",
    null,
    e("h1", null, "HomeEase"),
    e("p", { className: "lead" }, "Book trusted home services in Bengaluru."),
    e("p", { className: "text-muted small" }, health)
  );
}

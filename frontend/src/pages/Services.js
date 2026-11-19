import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { e, categories, select, alert, money, useRemote } from "../components/ui.js";

export default function Services() {
  const [params, setParams] = useSearchParams();
  const pin = params.get("pincode") || "";
  const hasPin = /^[1-9]\d{5}$/.test(pin);
  const [draft, setDraft] = useState(pin);
  const [category, setCategory] = useState("");
  const query = new URLSearchParams({ pincode: pin });
  if (category) query.set("category", category);
  const { data, error, loading } = useRemote(hasPin ? "/api/services?" + query : null);
  function search(event) {
    event.preventDefault();
    setParams({ pincode: draft });
  }

  return e("section", { className: "directory" },
    e("header", { className: "directory-head" },
      e("h1", null, "Home services in Bengaluru"),
      e("form", { onSubmit: search, className: "pin-search" },
        e("label", { htmlFor: "area-pin" }, "Find professionals in your PIN code"),
        e("div", { className: "input-group" },
          e("input", { id: "area-pin", className: "form-control", value: draft, placeholder: "e.g. 560001",
            required: true, inputMode: "numeric", autoComplete: "postal-code", pattern: "[1-9][0-9]{5}", maxLength: 6,
            onChange: (event) => setDraft(event.target.value) }),
          e("button", { className: "btn btn-primary" }, "Find services")))),
    hasPin && e("section", { className: "directory-results", "aria-live": "polite" },
      e("div", { className: "results-head" }, e("h2", null, "Services in " + pin),
        select("Category", { value: category, onChange: (ev) => setCategory(ev.target.value) },
          [["", "All categories"], ...categories.map((c) => [c, c === "ac" ? "AC" : c[0].toUpperCase() + c.slice(1)])])),
      error ? alert(error) : loading ? e("p", null, "Checking coverage…") :
      data.length === 0 ? e("p", null, "No professionals offer matching services here. Try another PIN code or category.") :
      data.map((s) => e("article", { key: s._id, className: "service-entry" },
        e("div", null, e("h3", null, s.name), s.description && e("p", null, s.description)),
        e("span", null, money(s.minPrice) + " – " + money(s.maxPrice)),
        e(Link, { to: "/book/" + s._id + "?pincode=" + pin, className: "btn btn-outline-primary" }, "Book service")))));
}

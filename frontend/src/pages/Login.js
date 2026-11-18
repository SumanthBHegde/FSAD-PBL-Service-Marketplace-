// Member 1: login form.
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.js";

const e = React.createElement;

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const destination = /^\/book\/[a-f0-9]{24}(?:\?pincode=[1-9]\d{5})?$/.test(state?.from) ? state.from : "/services";
  const [chooseSessions, setChooseSessions] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError(""); setBusy(true);
    try {
      const { otherSessions, ...user } = await api("/api/auth/login", { method: "POST", body: form });
      setForm({ email: "", password: "" });
      setUser(user);
      if (otherSessions) setChooseSessions(true);
      else navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  async function signOutOthers() {
    setBusy(true);
    try {
      await api("/api/auth/logout-others", { method: "POST" });
      navigate(destination, { replace: true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (chooseSessions) return e("section", { className: "session-choice", "aria-labelledby": "session-title" },
    e("h1", { id: "session-title" }, "Sign out of other devices?"),
    e("p", null, "Your account is also signed in elsewhere. This device will stay signed in."),
    error && e("p", { role: "alert" }, error),
    e("button", { className: "btn btn-primary me-2", disabled: busy, onClick: () => navigate(destination, { replace: true }) }, "Keep devices signed in"),
    e("button", { className: "btn btn-outline-secondary", disabled: busy, onClick: signOutOthers }, "Sign out other devices"));

  const input = (name, type) =>
    e("input", {
      className: "form-control mb-2",
      type,
      placeholder: name,
      "aria-label": name,
      ...(name === "experienceYears" ? { min: 0, step: "any" } : {}),
      required: true,
      value: form[name],
      onChange: (event) => setForm({ ...form, [name]: event.target.value })
    });

  return e(
    "form",
    { className: "col-md-4", onSubmit: submit },
    e("h2", null, "Login"),
    error && e("div", { className: "alert alert-danger" }, error),
    input("email", "email"),
    input("password", "password"),
    e("button", { className: "btn btn-primary", disabled: busy }, busy ? "Logging in…" : "Login")
  );
}

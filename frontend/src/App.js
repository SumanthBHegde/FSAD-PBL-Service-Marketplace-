import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.js";
import Login from "./pages/Login.js";
import Register from "./pages/Register.js";
import AdminPros from "./pages/AdminPros.js";
import Services from "./pages/Services.js";
import ProProfile from "./pages/ProProfile.js";
import AdminServices from "./pages/AdminServices.js";
import BookService from "./pages/BookService.js";
import MyBookings from "./pages/MyBookings.js";
import ProJobs from "./pages/ProJobs.js";
import AdminBookings from "./pages/AdminBookings.js";

const e = React.createElement;

// TODO (Member 1): show links based on the logged-in user's role.
const links = [
  ["/services", "Services"],
  ["/bookings", "My bookings"],
  ["/pro/profile", "Pro profile"],
  ["/pro/jobs", "Pro jobs"],
  ["/admin/pros", "Admin: pros"],
  ["/admin/services", "Admin: services"],
  ["/admin/bookings", "Admin: bookings"],
  ["/login", "Login"],
  ["/register", "Register"]
];

function Navbar() {
  return e(
    "nav",
    { className: "navbar navbar-expand bg-dark navbar-dark px-3 mb-4" },
    e(Link, { className: "navbar-brand", to: "/" }, "HomeEase"),
    e(
      "div",
      { className: "navbar-nav flex-wrap" },
      links.map(([to, label]) => e(Link, { key: to, className: "nav-link", to }, label))
    )
  );
}

export default function App() {
  return e(
    React.Fragment,
    null,
    e(Navbar),
    e(
      "main",
      { className: "container" },
      e(
        Routes,
        null,
        e(Route, { path: "/", element: e(Home) }),
        e(Route, { path: "/login", element: e(Login) }),
        e(Route, { path: "/register", element: e(Register) }),
        e(Route, { path: "/admin/pros", element: e(AdminPros) }),
        e(Route, { path: "/services", element: e(Services) }),
        e(Route, { path: "/pro/profile", element: e(ProProfile) }),
        e(Route, { path: "/admin/services", element: e(AdminServices) }),
        e(Route, { path: "/book/:serviceId", element: e(BookService) }),
        e(Route, { path: "/bookings", element: e(MyBookings) }),
        e(Route, { path: "/pro/jobs", element: e(ProJobs) }),
        e(Route, { path: "/admin/bookings", element: e(AdminBookings) })
      )
    )
  );
}

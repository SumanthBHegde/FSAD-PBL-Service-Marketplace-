import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { AuthProvider } from "./AuthContext.js";
import App from "./App.js";

const e = React.createElement;

createRoot(document.getElementById("root")).render(
  e(BrowserRouter, null, e(AuthProvider, null, e(App)))
);

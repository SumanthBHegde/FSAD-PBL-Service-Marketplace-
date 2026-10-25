// Member 1: holds the logged-in user for the whole app.
import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const e = React.createElement;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // On page load, ask the server who is logged in (the cookie is sent automatically).
  useEffect(() => {
    api("/api/auth/me").then(setUser).catch(() => setUser(null));
  }, []);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  return e(AuthContext.Provider, { value: { user, setUser, logout } }, children);
}

// Usage in any page: const { user, setUser, logout } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}

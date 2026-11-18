import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api.js";
const e = React.createElement;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, updateUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const revision = useRef(0);
  const setUser = useCallback((value) => {
    revision.current += 1;
    updateUser(value);
    setLoading(false);
  }, []);
  useEffect(() => {
    let current = true;
    let sequence = 0;
    async function sync() {
      const started = revision.current;
      const request = ++sequence;
      const latest = () => current && request === sequence && started === revision.current;
      try {
        const value = await api("/api/auth/me");
        if (latest()) updateUser((old) => JSON.stringify(old) === JSON.stringify(value) ? old : value);
      } catch (error) {
        if (latest() && error.status === 401) updateUser(null);
      } finally { if (latest()) setLoading(false); }
    }
    function whenVisible() { if (!document.hidden) sync(); }
    sync();
    const timer = window.setInterval(whenVisible, 15000);
    window.addEventListener("focus", whenVisible);
    document.addEventListener("visibilitychange", whenVisible);
    return () => {
      current = false;
      clearInterval(timer);
      window.removeEventListener("focus", whenVisible);
      document.removeEventListener("visibilitychange", whenVisible);
    };
  }, [setUser]);
  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
  }
  return e(AuthContext.Provider, { value: { user, setUser, loading, logout } }, children);
}
export function useAuth() { return useContext(AuthContext); }

// Member 1: holds the logged-in user for the whole app.
import React, { createContext, useContext, useState } from "react";

const e = React.createElement;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // TODO (Member 1): on first load, call GET /api/auth/me to restore the session,
  // and add login / logout helpers that call the API and update user.

  return e(AuthContext.Provider, { value: { user, setUser } }, children);
}

export function useAuth() {
  return useContext(AuthContext);
}

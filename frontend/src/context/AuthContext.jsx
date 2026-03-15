import React, { createContext, useContext, useState, useCallback } from "react";
import axios from "axios";

// Use VITE_API_URL if set; otherwise same host as the page on port 8000 (for dev from any IP)
const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://127.0.0.1:8000");

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      const event = new CustomEvent("auth-logout");
      window.dispatchEvent(event);
    }
    return Promise.reject(err);
  }
);

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);

  const setToken = useCallback((newToken) => {
    setTokenState(newToken);
    if (newToken) {
      api.defaults.headers.common["Authorization"] = `Token ${newToken}`;
    } else {
      delete api.defaults.headers.common["Authorization"];
    }
  }, []);

  const login = useCallback(
    async (username, password) => {
      const { data } = await api.post("/api/auth/login/", { username, password });
      setToken(data.token);
      setUser(data.user);
      return data;
    },
    [setToken]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout/");
    } catch (_) {}
    setToken(null);
    setUser(null);
  }, [setToken]);

  const fetchMe = useCallback(async () => {
    const { data } = await api.get("/api/auth/me/");
    setUser(data);
    return data;
  }, []);

  const initFromToken = useCallback(
    (storedToken) => {
      if (!storedToken) return;
      setToken(storedToken);
      api.get("/api/auth/me/").then(({ data }) => setUser(data)).catch(() => setToken(null));
    },
    [setToken]
  );

  React.useEffect(() => {
    const handleLogout = () => logout();
    window.addEventListener("auth-logout", handleLogout);
    return () => window.removeEventListener("auth-logout", handleLogout);
  }, [logout]);

  const value = {
    token,
    user,
    login,
    logout,
    fetchMe,
    initFromToken,
    api,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { api };

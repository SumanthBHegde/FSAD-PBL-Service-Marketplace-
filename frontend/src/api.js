// Shared fetch wrapper: sends JSON and the auth cookie, throws the server's message on error.
// Usage: api("/api/services")  or  api("/api/auth/login", { method: "POST", body: { email, password } })
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

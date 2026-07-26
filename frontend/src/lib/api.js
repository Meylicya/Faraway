const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const token = localStorage.getItem("faraway_token");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "request failed");
  return data;
}

export const api = {
  signup: (body) => request("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  guest: () => request("/api/auth/guest", { method: "POST" }),
  joinOpenRoom: () => request("/api/rooms/join-open", { method: "POST" }),
  createRoom: (invitedEmail) =>
    request("/api/rooms", { method: "POST", body: JSON.stringify({ invitedEmail }) }),
  myRoom: () => request("/api/rooms/mine"),
  pendingInvite: () => request("/api/rooms/pending-invite"),
  acceptInvite: (roomId) => request(`/api/rooms/${roomId}/accept`, { method: "POST" }),
  setCountdown: (roomId, countdownTarget) =>
    request(`/api/rooms/${roomId}/countdown`, {
      method: "PATCH",
      body: JSON.stringify({ countdownTarget }),
    }),
};

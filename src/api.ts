const API = "/api";

import type { Topic } from "./data.js";

export type PublicProfile = {
  id: string;
  name: string;
  bio: string;
  joinedAt: string;
  x: string;
  linkedin: string;
};

export type User = PublicProfile & {
  email: string;
  newsletter: boolean;
  interests: Topic[];
  workingOn: string;
};

export type ProfileInput = {
  name: string;
  bio: string;
  x: string;
  linkedin: string;
};

export type PrefsInput = {
  interests: Topic[];
  workingOn: string;
};

export type ThreadComment = {
  id: string;
  userId: string;
  author: string;
  body: string;
  createdAt: string;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || res.statusText);
  }
  return data;
}

export function getMe() {
  return request<{ user: User | null; saves: string[] }>("/me");
}

export function checkUsername(name: string, init: RequestInit = {}) {
  return request<{ available: boolean }>(
    `/usernames/${encodeURIComponent(name)}`,
    init,
  );
}

export function signup(body: {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  newsletter: boolean;
}) {
  return request<{ user: User }>("/signup", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function login(body: { email: string; password: string }) {
  return request<{ user: User }>("/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function logout() {
  return request<{ ok: boolean }>("/logout", { method: "POST" });
}

export function subscribeNewsletter() {
  return request<{ user: User }>("/newsletter", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getPublicProfile(name: string) {
  return request<{ user: PublicProfile }>(`/users/${encodeURIComponent(name)}`);
}

export function updateProfile(body: ProfileInput) {
  return request<{ user: User }>("/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function updatePrefs(body: PrefsInput) {
  return request<{ user: User }>("/prefs", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function listComments(paperId: string) {
  return request<{ comments: ThreadComment[] }>(
    `/papers/${encodeURIComponent(paperId)}/comments`,
  );
}

export function postComment(paperId: string, body: string) {
  return request<{ comment: ThreadComment }>(
    `/papers/${encodeURIComponent(paperId)}/comments`,
    { method: "POST", body: JSON.stringify({ body }) },
  );
}

export function setSaved(paperId: string, on: boolean) {
  return request<{ saves: string[] }>("/saves", {
    method: "PUT",
    body: JSON.stringify({ paperId, on }),
  });
}

export type DigestToken = {
  id: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
};

export function listTokens() {
  return request<{ tokens: DigestToken[] }>("/tokens");
}

export function createToken() {
  return request<DigestToken & { token: string }>("/tokens", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function revokeToken(id: string) {
  return request<{ ok: boolean }>(`/tokens/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

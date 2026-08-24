export const MIN_PASSWORD = 10;
export const MAX_PASSWORD = 128;
export const MIN_USERNAME = 3;
export const MAX_USERNAME = 24;
export const MAX_EMAIL = 254;

const USERNAME_OK = /^[a-z][a-z0-9_]{2,23}$/;
const EMAIL_OK =
  /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,63})+$/;

const RESERVED = new Set([
  "about",
  "account",
  "admin",
  "administrator",
  "api",
  "auth",
  "board",
  "digest",
  "help",
  "host",
  "later",
  "login",
  "logout",
  "me",
  "mod",
  "moderator",
  "newsletter",
  "null",
  "owner",
  "paperscroll",
  "root",
  "routine",
  "signup",
  "support",
  "system",
  "undefined",
  "welcome",
  "www",
]);

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password12",
  "password123",
  "1234567890",
  "123456789",
  "qwerty1234",
  "qwertyuiop",
  "letmein123",
  "welcome123",
  "admin12345",
  "iloveyou12",
  "monkey1234",
  "dragon1234",
  "paperscroll",
  "paperscroll1",
  "paperscroll12",
]);

export function normalizeUsername(raw?: string | null) {
  return String(raw || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();
}

export function normalizeEmail(raw?: string | null) {
  return String(raw || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();
}

export function usernameIssue(raw?: string | null) {
  const name = normalizeUsername(raw);
  if (name.length < MIN_USERNAME || name.length > MAX_USERNAME) {
    return `Username should be ${MIN_USERNAME}–${MAX_USERNAME} characters.`;
  }
  if (!USERNAME_OK.test(name)) {
    return "Username: start with a letter, then letters, numbers, or underscore.";
  }
  if (RESERVED.has(name)) {
    return "That username is reserved.";
  }
  return "";
}

export function emailIssue(raw?: string | null) {
  const email = normalizeEmail(raw);
  if (!email || email.length > MAX_EMAIL) {
    return "Enter a valid email.";
  }
  if (email.includes("..") || email.includes(" ")) {
    return "Enter a valid email.";
  }
  if (!EMAIL_OK.test(email)) {
    return "Enter a valid email.";
  }
  return "";
}

export function passwordIssue(
  password: string,
  { username = "", email = "" }: { username?: string; email?: string } = {},
) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD) {
    return `Password should be ${MIN_PASSWORD}+ characters.`;
  }
  if (password.length > MAX_PASSWORD) {
    return `Password should be under ${MAX_PASSWORD} characters.`;
  }
  if (/\s/.test(password)) {
    return "Password cannot contain spaces.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password needs a letter and a number.";
  }
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    return "Choose a less common password.";
  }
  const user = normalizeUsername(username);
  const mail = normalizeEmail(email);
  const local = mail.split("@")[0] || "";
  if (user.length >= 3 && lower.includes(user)) {
    return "Password cannot contain your username.";
  }
  if (local.length >= 3 && lower.includes(local)) {
    return "Password cannot contain your email.";
  }
  return "";
}

export function passwordStrength(
  password: string,
  ctx: { username?: string; email?: string } = {},
) {
  if (!password) return { score: 0, label: "", issue: "" };
  const issue = passwordIssue(password, ctx);
  if (issue) return { score: 0, label: issue, issue };
  let score = 1;
  if (password.length >= 12) score += 1;
  if (
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  ) {
    score += 1;
  }
  const labels = ["", "Okay", "Good", "Strong"];
  return { score: Math.min(3, score), label: labels[Math.min(3, score)], issue: "" };
}

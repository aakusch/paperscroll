const useNeon =
  process.env.VERCEL === "1" || process.env.PAPERSCROLL_DATABASE === "neon";

const store = useNeon
  ? await import("./neon-store.mjs")
  : await import("./sqlite-store.mjs");

export const q = store.q;
export const ready = store.ready;

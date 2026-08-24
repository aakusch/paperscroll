import { useEffect, useState } from "react";
import { checkUsername } from "./api";
import { normalizeUsername, usernameIssue } from "./identity";

export type NameStatus = "idle" | "checking" | "free" | "taken" | "invalid";

export function useUsernameAvailability(raw: string, current?: string) {
  const issue = usernameIssue(raw);
  const handle = normalizeUsername(raw);
  const unchanged = Boolean(current && handle === normalizeUsername(current));
  const shouldCheck = Boolean(raw.trim() && !issue && !unchanged);
  const [remote, setRemote] = useState<{
    handle: string;
    status: NameStatus;
    hint: string;
  } | null>(null);

  useEffect(() => {
    if (!shouldCheck) return;
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      checkUsername(handle, { signal: ac.signal })
        .then((data) => {
          setRemote({
            handle,
            status: data.available ? "free" : "taken",
            hint: data.available ? "Available." : "That username is already taken.",
          });
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setRemote({ handle, status: "idle", hint: "" });
        });
    }, 320);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [handle, shouldCheck]);

  if (!raw.trim()) return { status: "idle" as const, hint: "" };
  if (issue) return { status: "invalid" as const, hint: issue };
  if (unchanged) return { status: "free" as const, hint: "" };
  if (remote?.handle === handle) return { status: remote.status, hint: remote.hint };
  return { status: "checking" as const, hint: "Checking…" };
}

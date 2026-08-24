/** Only https links to hosts we intend to open in a new tab. */

function hostOf(raw: string) {
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.protocol = "https:";
    url.username = "";
    url.password = "";
    return url;
  } catch {
    return null;
  }
}

function allow(url: URL, hosts: string[]) {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function safeGithubUrl(raw?: string | null) {
  const url = hostOf(String(raw || "").trim());
  if (!url || !allow(url, ["github.com"])) return undefined;
  return url.toString();
}

export function safePaperUrl(raw?: string | null) {
  const url = hostOf(String(raw || "").trim());
  if (!url || !allow(url, ["arxiv.org", "huggingface.co"])) return undefined;
  return url.toString();
}

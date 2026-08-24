import { handleApi } from "../server/app.mjs";
// Vercel compiles the TypeScript digest graph to .js inside the function bundle.
import { buildDigest } from "../src/agentDigest.js";

function restoreApiUrl(req) {
  const url = new URL(req.url || "/api", "http://internal");
  const routedPath = url.searchParams.get("__paperscroll_path");
  if (routedPath == null) return;
  url.searchParams.delete("__paperscroll_path");
  if (url.pathname === "/api/dispatch") {
    url.pathname = `/api${routedPath ? `/${routedPath}` : ""}`;
  }
  req.url = `${url.pathname}${url.search}`;
}

export default async function handler(req, res) {
  restoreApiUrl(req);
  const handled = await handleApi(req, res, { digest: buildDigest });
  if (!handled) {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
}

#!/usr/bin/env node
import { createServer } from "node:http";
import { handleApi } from "./app.mjs";

const PORT = Number(process.env.PORT || 8787);

const server = createServer(async (req, res) => {
  const handled = await handleApi(req, res);
  if (!handled) {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.error(`PaperScroll API on http://127.0.0.1:${PORT}`);
});

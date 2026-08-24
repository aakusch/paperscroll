import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error plain Node plugin
import { paperscrollApi } from "./server/vite-plugin.mjs";

export default defineConfig({
  plugins: [react(), paperscrollApi()],
});


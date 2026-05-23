/**
 * TanStack Start preview expects dist/server/server.js but Cloudflare build outputs index.js.
 * Copy index.js -> server.js after production build (desktop / vite preview).
 */
import fs from "node:fs";
import path from "node:path";

const serverDir = path.join(process.cwd(), "dist", "server");
const indexFile = path.join(serverDir, "index.js");
const serverFile = path.join(serverDir, "server.js");

if (!fs.existsSync(indexFile)) {
  console.warn("[ensure-server-preview-entry] dist/server/index.js not found, skipping.");
  process.exit(0);
}

fs.copyFileSync(indexFile, serverFile);
console.log("[ensure-server-preview-entry] dist/server/server.js ready for vite preview.");

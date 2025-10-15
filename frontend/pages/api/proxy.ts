import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../../../");
const ALLOWED_DIRS = [
  path.join(PROJECT_ROOT, "backend/uploads"),
  path.join(PROJECT_ROOT, "backend/uploads/doctor_documents"),
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    res.status(400).send("Missing url parameter");
    return;
  }

  // Always resolve the file path relative to the project root
  // e.g., url = "backend/uploads/doctor_documents/xxx.jpg"
  const safePath = path.normalize(url).replace(/^(\.\.[\/\\])+/, "");
  const absPath = path.join(PROJECT_ROOT, safePath);

  // Security: ensure the resolved path is within allowed directories (normalize slashes for Windows/Unix)
  function normalizeSlashes(p: string) {
    return p.replace(/\\/g, "/");
  }
  const absPathNorm = normalizeSlashes(absPath);
  const allowedDirsNorm = ALLOWED_DIRS.map(normalizeSlashes);

  // Debug logging
  // eslint-disable-next-line no-console
  console.log("Proxy debug: absPath =", absPath);
  // eslint-disable-next-line no-console
  console.log("Proxy debug: allowedDirs =", ALLOWED_DIRS);

  const isAllowed = allowedDirsNorm.some((dir) => absPathNorm.startsWith(dir));
  if (!isAllowed) {
    res.status(403).send("Access denied");
    return;
  }

  // Check if file exists
  if (!fs.existsSync(absPath)) {
    // eslint-disable-next-line no-console
    console.log("Proxy debug: file does NOT exist at", absPath);
    res.status(404).send("File not found");
    return;
  }

  // Set content type based on extension
  const ext = path.extname(absPath).toLowerCase();
  let contentType = "application/octet-stream";
  if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
  else if (ext === ".png") contentType = "image/png";
  else if (ext === ".pdf") contentType = "application/pdf";

  // Stream the file
  res.setHeader("Content-Type", contentType);
  const stream = fs.createReadStream(absPath);
  stream.pipe(res);
}

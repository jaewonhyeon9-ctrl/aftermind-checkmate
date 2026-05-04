import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const svgPath = path.join(root, "public/icons/icon.svg");
const outDir = path.join(root, "public/icons");

if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });

const svg = await readFile(svgPath);

const sizes = [
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
  { size: 180, name: "apple-touch-icon.png" },
  { size: 32, name: "favicon-32.png" },
];

for (const { size, name } of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, name));
  console.log(`✓ ${name}`);
}

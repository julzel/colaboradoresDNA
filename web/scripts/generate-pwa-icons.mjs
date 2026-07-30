import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceLogo = join(projectRoot, "assets/images/dnature-logo.svg");
const iconsDirectory = join(projectRoot, "public/icons");
const background = { r: 251, g: 253, b: 253, alpha: 1 };

const icons = [
  { name: "icon-192.png", padding: 18, size: 192 },
  { name: "icon-512.png", padding: 48, size: 512 },
  { name: "icon-maskable-512.png", padding: 88, size: 512 },
  { name: "apple-touch-icon.png", padding: 17, size: 180 },
];

await mkdir(iconsDirectory, { recursive: true });

await Promise.all(
  icons.map(async ({ name, padding, size }) => {
    const artworkSize = size - padding * 2;
    const artwork = await sharp(sourceLogo, { density: 384 })
      .resize(artworkSize, artworkSize, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background,
      },
    })
      .composite([{ input: artwork, gravity: "centre" }])
      .png()
      .toFile(join(iconsDirectory, name));
  }),
);

console.log(`Generated ${icons.length} PWA icons from ${sourceLogo}`);

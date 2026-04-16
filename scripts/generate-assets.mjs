/**
 * Generates favicon PNG and OG preview image using Playwright.
 * Run with: node scripts/generate-assets.mjs
 */
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { chromium } = _require('/opt/node22/lib/node_modules/playwright');
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const staticDir = resolve(__dirname, '../static');

const ogImageSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f0a1a"/>
      <stop offset="100%" stop-color="#1a0f2e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6c5ce7"/>
      <stop offset="100%" stop-color="#fd79a8"/>
    </linearGradient>
    <linearGradient id="tile-correct" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00b894"/>
      <stop offset="100%" stop-color="#00cec9"/>
    </linearGradient>
    <linearGradient id="tile-present" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fdcb6e"/>
      <stop offset="100%" stop-color="#e17055"/>
    </linearGradient>
    <linearGradient id="tile-absent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2d3436"/>
      <stop offset="100%" stop-color="#636e72"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="tile-shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Subtle grid pattern -->
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" stroke-width="0.3" opacity="0.05"/>
  </pattern>
  <rect width="1200" height="630" fill="url(#grid)"/>

  <!-- Purple glow blob top-left -->
  <ellipse cx="100" cy="150" rx="200" ry="200" fill="#6c5ce7" opacity="0.08"/>
  <!-- Pink glow blob bottom-right -->
  <ellipse cx="1100" cy="500" rx="200" ry="180" fill="#fd79a8" opacity="0.08"/>

  <!-- Top accent line -->
  <rect x="0" y="0" width="1200" height="4" fill="url(#accent)"/>

  <!-- Game tiles - left side decoration -->
  <!-- Row 1 -->
  <rect x="80" y="160" width="76" height="76" rx="10" fill="url(#tile-correct)" filter="url(#tile-shadow)"/>
  <text x="118" y="213" font-family="Arial Black, Arial, sans-serif" font-size="40" font-weight="900" fill="white" text-anchor="middle">S</text>

  <rect x="172" y="160" width="76" height="76" rx="10" fill="url(#tile-absent)" filter="url(#tile-shadow)"/>
  <text x="210" y="213" font-family="Arial Black, Arial, sans-serif" font-size="40" font-weight="900" fill="#b2bec3" text-anchor="middle">A</text>

  <rect x="264" y="160" width="76" height="76" rx="10" fill="url(#tile-present)" filter="url(#tile-shadow)"/>
  <text x="302" y="213" font-family="Arial Black, Arial, sans-serif" font-size="40" font-weight="900" fill="white" text-anchor="middle">L</text>

  <rect x="356" y="160" width="76" height="76" rx="10" fill="url(#tile-correct)" filter="url(#tile-shadow)"/>
  <text x="394" y="213" font-family="Arial Black, Arial, sans-serif" font-size="40" font-weight="900" fill="white" text-anchor="middle">U</text>

  <rect x="448" y="160" width="76" height="76" rx="10" fill="url(#tile-absent)" filter="url(#tile-shadow)"/>
  <text x="486" y="213" font-family="Arial Black, Arial, sans-serif" font-size="40" font-weight="900" fill="#b2bec3" text-anchor="middle">T</text>

  <!-- Row 2 -->
  <rect x="80" y="252" width="76" height="76" rx="10" fill="url(#tile-correct)" filter="url(#tile-shadow)"/>
  <text x="118" y="305" font-family="Arial Black, Arial, sans-serif" font-size="40" font-weight="900" fill="white" text-anchor="middle">S</text>

  <rect x="172" y="252" width="76" height="76" rx="10" fill="url(#tile-correct)" filter="url(#tile-shadow)"/>
  <text x="210" y="305" font-family="Arial Black, Arial, sans-serif" font-size="40" font-weight="900" fill="white" text-anchor="middle">O</text>

  <rect x="264" y="252" width="76" height="76" rx="10" fill="url(#tile-correct)" filter="url(#tile-shadow)"/>
  <text x="302" y="305" font-family="Arial Black, Arial, sans-serif" font-size="40" font-weight="900" fill="white" text-anchor="middle">L</text>

  <rect x="356" y="252" width="76" height="76" rx="10" fill="url(#tile-correct)" filter="url(#tile-shadow)"/>
  <text x="394" y="305" font-family="Arial Black, Arial, sans-serif" font-size="40" font-weight="900" fill="white" text-anchor="middle">U</text>

  <rect x="448" y="252" width="76" height="76" rx="10" fill="url(#tile-correct)" filter="url(#tile-shadow)"/>
  <text x="486" y="305" font-family="Arial Black, Arial, sans-serif" font-size="40" font-weight="900" fill="white" text-anchor="middle">T</text>

  <!-- Row 3 (faded/empty) -->
  <rect x="80" y="344" width="76" height="76" rx="10" fill="none" stroke="#3d3553" stroke-width="2" opacity="0.6"/>
  <rect x="172" y="344" width="76" height="76" rx="10" fill="none" stroke="#3d3553" stroke-width="2" opacity="0.6"/>
  <rect x="264" y="344" width="76" height="76" rx="10" fill="none" stroke="#3d3553" stroke-width="2" opacity="0.6"/>
  <rect x="356" y="344" width="76" height="76" rx="10" fill="none" stroke="#3d3553" stroke-width="2" opacity="0.6"/>
  <rect x="448" y="344" width="76" height="76" rx="10" fill="none" stroke="#3d3553" stroke-width="2" opacity="0.6"/>

  <!-- SUTOM title - right side -->
  <text x="780" y="290" font-family="Arial Black, Arial, sans-serif" font-size="130" font-weight="900" fill="url(#accent)" text-anchor="middle" filter="url(#glow)">SUTOM</text>

  <!-- Subtitle -->
  <text x="780" y="345" font-family="Arial, sans-serif" font-size="28" fill="#b2bec3" text-anchor="middle" letter-spacing="6">JEU DE MOTS</text>

  <!-- Divider line -->
  <rect x="640" y="375" width="280" height="2" fill="url(#accent)" rx="1" opacity="0.6"/>

  <!-- Description -->
  <text x="780" y="420" font-family="Arial, sans-serif" font-size="22" fill="#74689a" text-anchor="middle">Devinez le mot du jour en français</text>

  <!-- Bottom decoration dots -->
  <circle cx="590" cy="550" r="6" fill="#6c5ce7" opacity="0.7"/>
  <circle cx="620" cy="550" r="6" fill="#8b75f0" opacity="0.5"/>
  <circle cx="650" cy="550" r="6" fill="#fd79a8" opacity="0.7"/>

  <!-- Bottom accent line -->
  <rect x="0" y="626" width="1200" height="4" fill="url(#accent)"/>
</svg>`;

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6c5ce7"/>
      <stop offset="100%" stop-color="#fd79a8"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#bg)"/>
  <text x="32" y="44" font-family="Arial Black, Arial, sans-serif" font-size="36" font-weight="900" fill="white" text-anchor="middle">S</text>
</svg>`;

async function svgToPng(svg, width, height, outputPath) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width, height });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head><style>* { margin: 0; padding: 0; } body { background: transparent; }</style></head>
    <body>${svg}</body>
    </html>
  `);
  const screenshot = await page.screenshot({
    clip: { x: 0, y: 0, width, height },
    omitBackground: false,
  });
  await browser.close();
  writeFileSync(outputPath, screenshot);
  console.log(`✓ Generated ${outputPath}`);
}

(async () => {
  const faviconSvg180 = faviconSvg.replace('width="512" height="512"', 'width="180" height="180"');
  const faviconSvg512 = faviconSvg;

  await svgToPng(ogImageSvg, 1200, 630, `${staticDir}/og-image.png`);
  await svgToPng(faviconSvg512, 512, 512, `${staticDir}/favicon-512.png`);
  await svgToPng(faviconSvg180, 180, 180, `${staticDir}/apple-touch-icon.png`);
  console.log('All assets generated!');
})();

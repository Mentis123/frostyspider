// One-off asset generator (run manually: node scripts/generate-assets.mjs).
// Requires sharp (npm install --no-save sharp). Generates the PWA icons from a
// frosty-spider SVG and re-encodes the splash screen as WebP.
import sharp from 'sharp';

// Frosty spider mark: icy gradient tile, snowflake spokes, spider body + 8 legs
const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="#1e4a73"/>
      <stop offset="60%" stop-color="#13304f"/>
      <stop offset="100%" stop-color="#0b1a2e"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>

  <!-- snowflake spokes behind the spider -->
  <g stroke="#9fd4f5" stroke-width="10" stroke-linecap="round" opacity="0.45">
    <line x1="256" y1="56" x2="256" y2="456"/>
    <line x1="83" y1="156" x2="429" y2="356"/>
    <line x1="83" y1="356" x2="429" y2="156"/>
  </g>

  <!-- spider legs -->
  <g stroke="#e8f6ff" stroke-width="16" stroke-linecap="round" fill="none">
    <path d="M210 250 Q150 215 120 160"/>
    <path d="M205 275 Q130 265 95 225"/>
    <path d="M205 300 Q135 315 100 365"/>
    <path d="M215 320 Q170 365 160 415"/>
    <path d="M302 250 Q362 215 392 160"/>
    <path d="M307 275 Q382 265 417 225"/>
    <path d="M307 300 Q377 315 412 365"/>
    <path d="M297 320 Q342 365 352 415"/>
  </g>

  <!-- spider body -->
  <circle cx="256" cy="300" r="62" fill="#e8f6ff"/>
  <circle cx="256" cy="208" r="38" fill="#e8f6ff"/>
  <!-- eyes -->
  <circle cx="242" cy="200" r="7" fill="#13304f"/>
  <circle cx="270" cy="200" r="7" fill="#13304f"/>
  <!-- abdomen snowflake dot -->
  <g stroke="#13304f" stroke-width="7" stroke-linecap="round">
    <line x1="256" y1="276" x2="256" y2="324"/>
    <line x1="235" y1="288" x2="277" y2="312"/>
    <line x1="235" y1="312" x2="277" y2="288"/>
  </g>
</svg>`;

const svg = Buffer.from(ICON_SVG);
await sharp(svg).resize(512, 512).png().toFile('public/icon-512.png');
await sharp(svg).resize(192, 192).png().toFile('public/icon-192.png');
console.log('icons written');

await sharp('public/splash_screen.png')
  .webp({ quality: 82 })
  .toFile('public/splash_screen.webp');
console.log('splash webp written');

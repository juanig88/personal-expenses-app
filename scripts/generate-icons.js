const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create a simple SVG icon with a wallet symbol
const svgIcon = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#171717" rx="96"/>
  <g transform="translate(128, 128)">
    <path d="M256 64H64C28.65 64 0 92.65 0 128v256c0 35.35 28.65 64 64 64h192c35.35 0 64-28.65 64-64V128c0-35.35-28.65-64-64-64zm0 320H64V128h192v256zm64-192h64c17.67 0 32 14.33 32 32s-14.33 32-32 32h-64c-17.67 0-32-14.33-32-32s14.33-32 32-32z" fill="#fafafa"/>
  </g>
</svg>
`;

const publicDir = path.join(__dirname, '..', 'public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192 icon
sharp(Buffer.from(svgIcon))
  .resize(192, 192)
  .png()
  .toFile(path.join(publicDir, 'icon-192x192.png'))
  .then(() => {
    console.log('✓ Generated icon-192x192.png');
    
    // Generate 512x512 icon
    return sharp(Buffer.from(svgIcon))
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512x512.png'));
  })
  .then(() => {
    console.log('✓ Generated icon-512x512.png');
    console.log('✓ All icons generated successfully!');
  })
  .catch((err) => {
    console.error('Error generating icons:', err);
    process.exit(1);
  });

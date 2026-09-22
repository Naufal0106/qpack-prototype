import QRCode from 'qrcode';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const qrDir = path.resolve(__dirname, '../../assets/qr');
if (!fs.existsSync(qrDir)) {
  fs.mkdirSync(qrDir, { recursive: true });
}

// Canonical demo packages
const demoPackages = [
  { id: 'QP-2027-000001', label: 'Q-Pack Cassava Mailer M' },
  { id: 'QP-2027-000002', label: 'Q-Pack Marine Chitosan Mailer L' },
  { id: 'QP-2027-000003', label: 'Q-Pack Corn & Bamboo Courier Pouch S' }
];

export async function generateDemoQRCodes(customBaseUrl = null) {
  // Always prioritize explicit production URL if specified, then APP_BASE_URL, defaulting to production HTTPS
  const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--prod') || !customBaseUrl;
  const baseUrl = customBaseUrl || process.env.APP_BASE_URL || (isProduction ? 'https://qpackprototype.vercel.app' : 'http://localhost:3000');

  console.log(`[QR Generator] Base URL configured: ${baseUrl}`);
  console.log('Generating machine-readable QR Code assets in assets/qr/...');

  for (const pkg of demoPackages) {
    const canonicalUrl = `${baseUrl.replace(/\/$/, '')}/p/${pkg.id}`;
    const pngPath = path.join(qrDir, `${pkg.id}.png`);
    const svgPath = path.join(qrDir, `${pkg.id}.svg`);

    // Generate PNG
    await QRCode.toFile(pngPath, canonicalUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#1d5d18', // Q-Pack brand dark green
        light: '#ffffff'
      }
    });

    // Generate SVG
    const svgString = await QRCode.toString(canonicalUrl, {
      type: 'svg',
      margin: 2,
      color: {
        dark: '#1d5d18',
        light: '#ffffff'
      }
    });
    fs.writeFileSync(svgPath, svgString, 'utf8');

    console.log(`✅ Generated QR for ${pkg.id} -> ${canonicalUrl}`);
  }

  // Generate Universal Packaging QR Code (Target: /scan)
  const scanUrl = `${baseUrl.replace(/\/$/, '')}/scan`;
  const qrPngPath = path.join(qrDir, 'qpack-qr.png');
  const qrSvgPath = path.join(qrDir, 'qpack-qr.svg');
  const legacyPngPath = path.join(qrDir, 'qpack-impact-qr.png');
  const legacySvgPath = path.join(qrDir, 'qpack-impact-qr.svg');

  const qrOptions = {
    width: 500,
    margin: 2,
    color: {
      dark: '#0e350c', // Deep forest green
      light: '#ffffff'
    }
  };

  await QRCode.toFile(qrPngPath, scanUrl, qrOptions);
  await QRCode.toFile(legacyPngPath, scanUrl, qrOptions);

  const qrSvgString = await QRCode.toString(scanUrl, {
    type: 'svg',
    margin: 2,
    color: {
      dark: '#0e350c',
      light: '#ffffff'
    }
  });
  fs.writeFileSync(qrSvgPath, qrSvgString, 'utf8');
  fs.writeFileSync(legacySvgPath, qrSvgString, 'utf8');

  console.log(`✅ Generated Universal Packaging QR -> ${scanUrl}`);
}

// Run if directly called
if (process.argv[1] && process.argv[1].endsWith('generateQRCodes.js')) {
  const forceProd = process.argv.includes('--prod') || !process.env.APP_BASE_URL;
  const targetUrl = forceProd ? 'https://qpackprototype.vercel.app' : process.env.APP_BASE_URL;
  generateDemoQRCodes(targetUrl).catch(console.error);
}

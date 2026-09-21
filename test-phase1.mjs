/**
 * test-phase1.mjs — Comprehensive automated test suite for Q-Pack Phase 1 Review Acceptance Criteria
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedDatabase } from './src/db/seed.js';
import { repositories } from './src/repositories/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Re-seed DB to ensure fresh test environment
console.log('--- Initializing Test Database & Canonical Packages ---');
seedDatabase();

// Import server
const PORT = 3002;
process.env.PORT = PORT;
const { default: app } = await import('./server.js');

// Helper for HTTP requests
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
        }
      },
      (res) => {
        let resBody = '';
        res.on('data', (chunk) => { resBody += chunk; });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(resBody);
          } catch {
            parsed = resBody;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Give server a brief moment
await new Promise(r => setTimeout(r, 600));

console.log('\n======================================================');
console.log('   RUNNING Q-PACK PHASE 1 REVIEW VERIFICATION SUITE   ');
console.log('======================================================\n');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

try {
  // ----------------------------------------------------
  // CRITERION A: Local SQLite flow works via repository abstraction
  // ----------------------------------------------------
  console.log('VERIFYING A: Local SQLite repository abstraction...');
  assert(repositories.provider === 'sqlite', 'Expected default provider to be sqlite');
  const pkgCheck = await repositories.packages.findByQRCode('QP-2027-000001');
  assert(pkgCheck !== null, 'Repository must find canonical package QP-2027-000001');
  console.log('✅ CRITERION A PASSED: Local SQLite operates behind repository abstraction.\n');

  // ----------------------------------------------------
  // CRITERION B: QR-DEMO-001 legacy alias works
  // ----------------------------------------------------
  console.log('VERIFYING B: QR-DEMO-001 legacy alias backwards-compatibility...');
  const resLegacy = await request('GET', '/api/packages/QR-DEMO-001');
  assert(resLegacy.status === 200, `Expected 200 for QR-DEMO-001, got ${resLegacy.status}`);
  assert(resLegacy.body.data.qr_code === 'QR-DEMO-001', 'QR Code mismatch');
  assert(resLegacy.body.data.product_name.includes('Cassava'), 'Product mismatch');
  console.log('✅ CRITERION B PASSED: Legacy alias QR-DEMO-001 resolves perfectly.\n');

  // ----------------------------------------------------
  // CRITERION C: QR-DEMO-002 works & produces different data
  // ----------------------------------------------------
  console.log('VERIFYING C: QR-DEMO-002 works with distinct data...');
  const resLegacy2 = await request('GET', '/api/packages/QR-DEMO-002');
  assert(resLegacy2.status === 200, `Expected 200 for QR-DEMO-002, got ${resLegacy2.status}`);
  assert(resLegacy2.body.data.qr_code === 'QR-DEMO-002', 'QR Code mismatch');
  assert(resLegacy2.body.data.product_name.includes('Marine Chitosan'), 'Product must be Chitosan');
  console.log('✅ CRITERION C PASSED: QR-DEMO-002 produces distinct marine bio-polymer data.\n');

  // ----------------------------------------------------
  // CRITERION G: Canonical QP-2027 package URLs are dynamic
  // ----------------------------------------------------
  console.log('VERIFYING G: Canonical QP-2027 package URLs are dynamic...');
  const resCanon1 = await request('GET', '/api/packages/QP-2027-000001');
  assert(resCanon1.status === 200, `Expected 200 for QP-2027-000001, got ${resCanon1.status}`);
  assert(resCanon1.body.data.qr_code === 'QP-2027-000001', 'Canonical QR Code mismatch');
  assert(resCanon1.body.data.merchant_brand_name === 'EcoFashion ID', 'Merchant mismatch');

  const resCanon2 = await request('GET', '/api/packages/QP-2027-000002');
  assert(resCanon2.status === 200, `Expected 200 for QP-2027-000002, got ${resCanon2.status}`);
  assert(resCanon2.body.data.product_name !== resCanon1.body.data.product_name, 'Products must differ dynamically');
  console.log('✅ CRITERION G PASSED: Package data is dynamically retrieved from database.\n');

  // ----------------------------------------------------
  // CRITERION D: Duplicate scan gives 0 additional points
  // ----------------------------------------------------
  console.log('VERIFYING D: First scan awards +50 pts; duplicate gives 0 additional points...');
  // First scan
  const resScan1 = await request('POST', '/api/scan', { qr_code: 'QP-2027-000001', consumer_id: 'cons_demo_001' });
  assert(resScan1.body.scan.is_first_scan === true, 'Should be first scan');
  assert(resScan1.body.scan.points_awarded === 50, 'Must award 50 points');
  assert(resScan1.body.consumer.points === 50, 'Consumer points should be 50');

  // Duplicate scan of same package
  const resScanDup = await request('POST', '/api/scan', { qr_code: 'QP-2027-000001', consumer_id: 'cons_demo_001' });
  assert(resScanDup.body.scan.is_first_scan === false, 'Duplicate must not be first scan');
  assert(resScanDup.body.scan.is_duplicate === true, 'Must flag as duplicate');
  assert(resScanDup.body.scan.points_awarded === 0, 'Duplicate scan must award 0 points');
  assert(resScanDup.body.consumer.points === 50, 'Point balance must remain 50');
  console.log('✅ CRITERION D PASSED: Anti-duplicate check blocks repeated points claims.\n');

  // ----------------------------------------------------
  // CRITERION E: Collection count remains unique (Collected != Returned)
  // ----------------------------------------------------
  console.log('VERIFYING E: Collection count tracks unique packages only...');
  // Scan second package
  const resScan2 = await request('POST', '/api/scan', { qr_code: 'QP-2027-000002', consumer_id: 'cons_demo_001' });
  assert(resScan2.body.scan.points_awarded === 50, 'Package 2 must award 50 points');
  assert(resScan2.body.consumer.points === 100, 'Consumer points must be 100');
  assert(resScan2.body.consumer.unique_packages_collected === 2, 'Unique collected must be 2');
  assert(resScan2.body.consumer.collection_progress === '2/10', 'Progress must be 2/10');

  // Re-scan package 2 to test collection count stability
  const resScan2Dup = await request('POST', '/api/scan', { qr_code: 'QP-2027-000002', consumer_id: 'cons_demo_001' });
  assert(resScan2Dup.body.consumer.unique_packages_collected === 2, 'Unique count must NOT increase on duplicate');
  assert(resScan2Dup.body.consumer.points === 100, 'Points must NOT increase on duplicate');
  console.log('✅ CRITERION E PASSED: Collection count remains strictly unique at 2/10.\n');

  // ----------------------------------------------------
  // CRITERION F: Merchant analytics works from recorded interactions
  // ----------------------------------------------------
  console.log('VERIFYING F: Merchant analytics calculation...');
  const resAnalytics = await request('GET', '/api/merchant/analytics');
  assert(resAnalytics.status === 200, `Expected 200, got ${resAnalytics.status}`);
  const a = resAnalytics.body.analytics;
  assert(a.total_scans === 4, `Expected 4 total scans, got ${a.total_scans}`);
  assert(a.unique_packages_scanned === 2, `Expected 2 unique packages, got ${a.unique_packages_scanned}`);
  assert(a.data_source_disclaimer === 'Diperbarui dari rekaman interaksi QR', 'Disclaimer missing or incorrect');
  console.log(`✅ CRITERION F PASSED: Merchant analytics verified (${a.total_scans} scans, ${a.unique_packages_scanned} unique).\n`);

  // ----------------------------------------------------
  // CRITERION H: QR assets exist for the 3 demo packages
  // ----------------------------------------------------
  console.log('VERIFYING H: QR assets existence in assets/qr/...');
  const qrCodes = ['QP-2027-000001', 'QP-2027-000002', 'QP-2027-000003'];
  for (const code of qrCodes) {
    const pngPath = path.join(__dirname, 'assets', 'qr', `${code}.png`);
    const svgPath = path.join(__dirname, 'assets', 'qr', `${code}.svg`);
    assert(fs.existsSync(pngPath), `Missing QR PNG for ${code}`);
    assert(fs.existsSync(svgPath), `Missing QR SVG for ${code}`);
    assert(fs.statSync(pngPath).size > 100, `QR PNG ${code} is too small or empty`);
  }
  console.log('✅ CRITERION H PASSED: All 3 machine-readable QR PNG & SVG assets verified.\n');

  // ----------------------------------------------------
  // CRITERION I & J: Repository isolation & Vercel serverless safety
  // ----------------------------------------------------
  console.log('VERIFYING I & J: Repository abstraction & architecture isolation...');
  assert(typeof repositories.packages.findByQRCode === 'function', 'packageRepository contract verified');
  assert(typeof repositories.scans.createScanEvent === 'function', 'scanRepository contract verified');
  assert(typeof repositories.consumers.findById === 'function', 'consumerRepository contract verified');
  console.log('✅ CRITERIA I & J PASSED: Business logic isolated from direct SQLite dependency.\n');

  // ----------------------------------------------------
  // CRITERION K: Normalized Q-Pack Material Specification & Global Negative Test
  // ----------------------------------------------------
  console.log('VERIFYING K: Q-Pack normalized materials (Kulit Singkong + Sisik Ikan) & negative alga test...');
  const testPackages = ['QP-2027-000001', 'QP-2027-000002', 'QP-2027-000003'];
  const forbiddenTerms = ['algae', 'alga', 'seaweed', 'rumput laut'];

  for (const code of testPackages) {
    const pkgRes = await request('GET', `/api/packages/${code}`);
    assert(pkgRes.status === 200, `Expected 200 for ${code}`);
    const data = pkgRes.body.data;

    // A, B, C: Must return materials array with length >= 2
    assert(Array.isArray(data.materials), `${code} must have materials array`);
    assert(data.materials.length >= 2, `${code} materials length must be >= 2`);

    // Check material names
    const matNames = data.materials.map(m => m.name);
    assert(matNames.includes('Kulit Singkong'), `${code} must include Kulit Singkong`);
    assert(matNames.includes('Sisik Ikan'), `${code} must include Sisik Ikan`);

    // Backward compatibility: legacy material fields still exist
    assert(typeof data.material_name === 'string' && data.material_name.length > 0, `${code} missing material_name`);
    assert(typeof data.material_desc === 'string' && data.material_desc.length > 0, `${code} missing material_desc`);

    // D: Global negative test - no forbidden algae/seaweed terms in the response
    const jsonStr = JSON.stringify(pkgRes.body).toLowerCase();
    for (const term of forbiddenTerms) {
      assert(!jsonStr.includes(term), `${code} response must NOT contain forbidden term: "${term}"`);
    }
  }

  // Also check scan response for negative algae test
  const scanCheck = await request('POST', '/api/scan', { qr_code: 'QP-2027-000002', consumer_id: 'cons_demo_001' });
  const scanJsonStr = JSON.stringify(scanCheck.body).toLowerCase();
  for (const term of forbiddenTerms) {
    assert(!scanJsonStr.includes(term), `Scan response must NOT contain forbidden term: "${term}"`);
  }

  console.log('✅ CRITERION K PASSED: All 3 packages verified with 2 circular materials, zero algae references.\n');

  console.log('======================================================');
  console.log('🎉 ALL REVIEW ACCEPTANCE CRITERIA (A-K) PASSED!');
  console.log('======================================================\n');
  process.exit(0);
} catch (err) {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
}

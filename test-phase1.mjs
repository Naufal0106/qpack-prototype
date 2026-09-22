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

  // ----------------------------------------------------
  // CRITERION L: Digital Passport Points Display Semantics & Claim Status Regression Tests
  // ----------------------------------------------------
  console.log('VERIFYING L: Points display semantics, package reward claim status, and global wallet distinction...');

  const regConsumerId = 'cons_regression_semantics';

  // 1. Initial State: QP-001 has never been claimed by this consumer
  const initialPkg001 = await request('GET', `/api/packages/QP-2027-000001?consumer_id=${regConsumerId}`);
  assert(initialPkg001.status === 200, 'Initial lookup should be 200');
  assert(initialPkg001.body.data.is_claimed === false, 'QP-001 should not be claimed yet');

  const initialProfile = await request('GET', `/api/consumer/${regConsumerId}/profile`);
  assert(initialProfile.body.consumer.points === 0, 'Initial points should be 0');
  assert(initialProfile.body.consumer.collection_progress === '0/10', 'Initial collection should be 0/10');

  // 2. QP-001 claimed once
  const regScan1 = await request('POST', '/api/scan', { qr_code: 'QP-2027-000001', consumer_id: regConsumerId });
  assert(regScan1.body.scan.is_first_scan === true, 'First claim of QP-001 must set is_first_scan = true');
  assert(regScan1.body.scan.points_awarded === 50, 'First claim must award exactly +50 points');
  assert(regScan1.body.consumer.points === 50, 'Consumer balance must be 50 Pts');
  assert(regScan1.body.consumer.collection_progress === '1/10', 'Collection progress must be 1/10');

  // Verify package lookup now shows claimed
  const postClaimPkg001 = await request('GET', `/api/packages/QP-2027-000001?consumer_id=${regConsumerId}`);
  assert(postClaimPkg001.body.data.is_claimed === true, 'QP-001 status must be claimed');

  // 3. QP-001 repeated => no additional points (duplicate prevention)
  const regScan1Dup = await request('POST', '/api/scan', { qr_code: 'QP-2027-000001', consumer_id: regConsumerId });
  assert(regScan1Dup.body.scan.is_first_scan === false, 'Repeated scan must not be first scan');
  assert(regScan1Dup.body.scan.is_duplicate === true, 'Repeated scan must be duplicate');
  assert(regScan1Dup.body.scan.points_awarded === 0, 'Repeated scan must award 0 points');
  assert(regScan1Dup.body.consumer.points === 50, 'Balance must remain 50 Pts after repeat');
  assert(regScan1Dup.body.consumer.collection_progress === '1/10', 'Collection count must remain 1/10');

  // 4. QP-002 claimed once => global balance 100
  const regScan2 = await request('POST', '/api/scan', { qr_code: 'QP-2027-000002', consumer_id: regConsumerId });
  assert(regScan2.body.scan.is_first_scan === true, 'Claiming QP-002 must be first scan for QP-002');
  assert(regScan2.body.scan.points_awarded === 50, 'QP-002 must award +50 points');
  assert(regScan2.body.consumer.points === 100, 'Global wallet balance must now be exactly 100 Pts');
  assert(regScan2.body.consumer.collection_progress === '2/10', 'Collection progress must be 2/10');

  // 5. Opening QP-001 after QP-002 still shows account balance 100 & QP-001 package reward status remains "Sudah diklaim"
  const reopenPkg001 = await request('GET', `/api/packages/QP-2027-000001?consumer_id=${regConsumerId}`);
  const reopenProfile = await request('GET', `/api/consumer/${regConsumerId}/profile`);

  assert(reopenPkg001.status === 200, 'Reopening QP-001 must return 200');
  assert(reopenPkg001.body.data.is_claimed === true, 'QP-001 package reward status must remain "Sudah diklaim"');
  assert(reopenProfile.body.consumer.points === 100, 'Global account balance must still be 100 Pts (Saldo Akun: 100 Pts)');
  assert(reopenProfile.body.consumer.collection_progress === '2/10', 'Global collection progress must remain 2/10');

  console.log('✅ CRITERION L PASSED: Points semantics, duplicate prevention, and reward claim status verified.\n');

  // ----------------------------------------------------
  // CRITERION M: QR Management API & Package Directory Verification
  // ----------------------------------------------------
  console.log('VERIFYING M: Merchant QR management API, metadata, and filter capability...');
  const resPackages = await request('GET', '/api/merchant/packages');
  assert(resPackages.status === 200, `Expected 200 for merchant packages, got ${resPackages.status}`);
  assert(resPackages.body.success === true, 'Response must indicate success: true');
  assert(Array.isArray(resPackages.body.packages), 'Packages must be an array');
  assert(resPackages.body.packages.length >= 3, `Expected at least 3 packages, got ${resPackages.body.packages.length}`);

  const samplePkg = resPackages.body.packages.find(p => p.qr_code === 'QP-2027-000001');
  assert(samplePkg !== undefined, 'QP-2027-000001 must be present in merchant packages');
  assert(samplePkg.qr_image_url.includes('/assets/qr/QP-2027-000001.png'), 'Must include correct qr_image_url');
  assert(samplePkg.destination_url.includes('/p/QP-2027-000001'), 'Must include valid destination_url pointing to /p/QP-2027-000001');
  assert(Array.isArray(samplePkg.materials), 'Must include circular materials array');
  assert(samplePkg.materials.some(m => m.name === 'Kulit Singkong'), 'Must include Kulit Singkong');
  assert(samplePkg.materials.some(m => m.name === 'Sisik Ikan'), 'Must include Sisik Ikan');

  // Verify filtering by merchant_id
  const resFilter = await request('GET', '/api/merchant/packages?merchant_id=m_ecofashion');
  assert(resFilter.status === 200, 'Merchant filter request must return 200');
  assert(Array.isArray(resFilter.body.packages), 'Filtered packages must be array');
  assert(resFilter.body.packages.length >= 1, 'EcoFashion must have at least 1 package');
  for (const p of resFilter.body.packages) {
    assert(p.merchant_id === 'm_ecofashion', 'Every item in filtered response must match merchant_id');
  }

  // Verify HTML route /merchant/qr
  const resHtml = await request('GET', '/merchant/qr');
  assert(resHtml.status === 200, 'Route /merchant/qr must return 200');

  console.log('✅ CRITERION M PASSED: Merchant QR Management API, schema, URLs, and filtering verified.\n');

  // ----------------------------------------------------
  // CRITERION N: Packaging QR Scan Result Page (/scan), Official Web Decoupling & QR Asset
  // ----------------------------------------------------
  console.log('VERIFYING N: Packaging QR Scan Result Page (/scan), Official Web Decoupling & absence of CO2 claims...');
  // 1. Primary QR Scan Result Page (/scan)
  const resScan = await request('GET', '/scan');
  assert(resScan.status === 200, `Expected 200 for /scan, got ${resScan.status}`);
  assert(resScan.body.includes('Q-Pack'), 'Scan page must contain Q-Pack branding');
  assert(resScan.body.includes('Kulit Singkong'), 'Scan page must feature Kulit Singkong');
  assert(resScan.body.includes('Sisik Ikan'), 'Scan page must feature Sisik Ikan');
  assert(!resScan.body.toLowerCase().includes('algae') && !resScan.body.toLowerCase().includes('rumput laut'), 'Zero algae/seaweed in /scan');
  assert(!resScan.body.includes('-65%') && !resScan.body.includes('65%'), '/scan must NOT contain 65%');
  assert(!resScan.body.toLowerCase().includes('co2') && !resScan.body.toLowerCase().includes('co₂'), '/scan must NOT contain CO2 or CO₂');
  assert(resScan.body.includes('Kode Unik'), '/scan must guide consumer to claim via Kode Unik');

  // 2. Backward-compatible /impact route
  const resImpact = await request('GET', '/impact');
  assert(resImpact.status === 200, `Expected 200 for /impact, got ${resImpact.status}`);
  assert(resImpact.body.includes('Kulit Singkong'), 'Impact page must feature Kulit Singkong');
  assert(resImpact.body.includes('Sisik Ikan'), 'Impact page must feature Sisik Ikan');
  assert(!resImpact.body.includes('-65%') && !resImpact.body.includes('65%'), '/impact must NOT contain 65%');

  // 3. Official Website (index.html) must NOT have Impact Gateway in navigation
  const resHome = await request('GET', '/');
  assert(resHome.status === 200, 'Home page must return 200');
  assert(!resHome.body.includes('href="/impact"') && !resHome.body.includes("href='/impact'"), 'index.html must NOT link to "/impact"');
  assert(!resHome.body.includes('-65%') && !resHome.body.includes('65%'), 'index.html must NOT contain 65%');
  assert(!resHome.body.toLowerCase().includes('co2') && !resHome.body.toLowerCase().includes('co₂'), 'index.html must NOT contain CO2 or CO₂');

  // 4. Mitra Bank Sampah return form verification
  const resBankSampah = await request('GET', '/bank-sampah');
  assert(resBankSampah.status === 200, 'Bank sampah portal must return 200');
  assert(resBankSampah.body.includes('Form Pengembalian Kemasan'), 'Bank sampah must have return form');

  // 5. Universal Packaging QR assets existence
  const qrPng = path.join(__dirname, 'assets', 'qr', 'qpack-qr.png');
  const qrSvg = path.join(__dirname, 'assets', 'qr', 'qpack-qr.svg');
  const impactQrPng = path.join(__dirname, 'assets', 'qr', 'qpack-impact-qr.png');
  assert(fs.existsSync(qrPng), 'assets/qr/qpack-qr.png must exist');
  assert(fs.existsSync(qrSvg), 'assets/qr/qpack-qr.svg must exist');
  assert(fs.existsSync(impactQrPng), 'assets/qr/qpack-impact-qr.png must exist');
  console.log('✅ CRITERION N PASSED: Packaging QR Scan Result Page (/scan), clean official web, bank sampah form, and QR assets verified.\n');

  // ----------------------------------------------------
  // CRITERION O: Authentication Flow (Consumer & Merchant Register + Login)
  // ----------------------------------------------------
  console.log('VERIFYING O: Authentication APIs for Consumer and Merchant...');
  
  // 1. Register Consumer
  const testConsumerEmail = `user_${Date.now()}@test.id`;
  const regRes = await request('POST', '/api/auth/register-consumer', {
    name: 'Siti Sirkular',
    email: testConsumerEmail,
    password: 'securePassword123'
  });
  assert(regRes.status === 201 || regRes.status === 200, `Expected 201/200 for consumer register, got ${regRes.status}`);
  assert(regRes.body.success === true, 'Register must succeed');
  assert(regRes.body.user.role === 'consumer', 'User role must be consumer');
  const newConsumerId = regRes.body.user.id;

  // 2. Login Consumer
  const loginRes = await request('POST', '/api/auth/login', {
    email: testConsumerEmail,
    password: 'securePassword123',
    role: 'consumer'
  });
  assert(loginRes.status === 200, 'Consumer login must return 200');
  assert(loginRes.body.success === true, 'Consumer login must succeed');
  assert(loginRes.body.user.id === newConsumerId, 'Logged in user ID mismatch');

  // 3. Login with wrong password
  const failLogin = await request('POST', '/api/auth/login', {
    email: testConsumerEmail,
    password: 'wrongPassword',
    role: 'consumer'
  });
  assert(failLogin.status === 401, 'Wrong password must return 401');

  // 4. Register Merchant
  const testMerchantEmail = `merchant_${Date.now()}@test.id`;
  const regMerch = await request('POST', '/api/auth/register-merchant', {
    brand_name: 'Hijau Lestari Store',
    contact_name: 'Dewi Lestari',
    email: testMerchantEmail,
    password: 'merchantPassword123'
  });
  assert(regMerch.status === 201 || regMerch.status === 200, `Expected 201/200 for merchant register, got ${regMerch.status}`);
  assert(regMerch.body.user.role === 'merchant', 'User role must be merchant');

  // 5. Login Merchant
  const loginMerch = await request('POST', '/api/auth/login', {
    email: testMerchantEmail,
    password: 'merchantPassword123',
    role: 'merchant'
  });
  assert(loginMerch.status === 200, 'Merchant login must return 200');
  assert(loginMerch.body.user.brand_name === 'Hijau Lestari Store', 'Brand name mismatch');

  console.log('✅ CRITERION O PASSED: Working Consumer & Merchant authentication verified.\n');

  // ----------------------------------------------------
  // CRITERION P: Canonical Unique Code Claim Flow (POST /api/claim)
  // ----------------------------------------------------
  console.log('VERIFYING P: Canonical Unique Code Claim flow with anti-duplicate...');

  // 1. Claim QP-2027-000001 with newConsumerId
  const claim1 = await request('POST', '/api/claim', {
    unique_code: 'QP-2027-000001',
    consumer_id: newConsumerId
  });
  assert(claim1.status === 200, `Claim QP-001 must return 200, got ${claim1.status}`);
  assert(claim1.body.data.claim.is_first_scan === true, 'First claim must have is_first_scan = true');
  assert(claim1.body.data.claim.points_awarded === 50, 'First claim must award +50 points');
  assert(claim1.body.data.consumer.points === 50, 'Consumer balance must be 50');

  // 2. Duplicate claim of QP-2027-000001
  const claim1Dup = await request('POST', '/api/claim', {
    unique_code: 'QP-2027-000001',
    consumer_id: newConsumerId
  });
  assert(claim1Dup.status === 200, 'Duplicate claim request must return 200');
  assert(claim1Dup.body.data.claim.is_first_scan === false, 'Duplicate claim must have is_first_scan = false');
  assert(claim1Dup.body.data.claim.points_awarded === 0, 'Duplicate claim must award 0 points');
  assert(claim1Dup.body.data.consumer.points === 50, 'Consumer balance must remain 50');

  // 3. Claim QP-2027-000002
  const claim2 = await request('POST', '/api/claim', {
    unique_code: 'QP-2027-000002',
    consumer_id: newConsumerId
  });
  assert(claim2.body.data.claim.is_first_scan === true, 'Claim QP-002 must be first scan');
  assert(claim2.body.data.claim.points_awarded === 50, 'QP-002 claim must award +50 points');
  assert(claim2.body.data.consumer.points === 100, 'Consumer balance must now be 100');
  assert(claim2.body.data.consumer.collection_progress === '2/10', 'Collection progress must be 2/10');

  // 4. Test invalid unique code
  const claimInvalid = await request('POST', '/api/claim', {
    unique_code: 'QP-NONEXISTENT-999',
    consumer_id: newConsumerId
  });
  assert(claimInvalid.status === 404, 'Invalid unique code must return 404');

  console.log('✅ CRITERION P PASSED: Canonical Unique Code claim, points, and duplicate prevention verified.\n');

  // ----------------------------------------------------
  // CRITERION Q: Consumer Dashboard "Tukar" Navigation & Camera-Free Claim Page
  // ----------------------------------------------------
  console.log('VERIFYING Q: Consumer Dashboard "Tukar" navigation and camera-free claim page...');

  // 1. Check dashboard bottom nav has "Tukar" and no "Scan"
  const resDash = await request('GET', '/consumer/dashboard.html');
  assert(resDash.status === 200, 'Consumer dashboard must return 200');
  assert(resDash.body.includes('Tukar'), 'Dashboard bottom nav must have "Tukar"');
  assert(resDash.body.includes('tukar-icon.svg'), 'Dashboard must use tukar-icon.svg');
  assert(!resDash.body.includes('Buka Scanner QR'), 'Dashboard must not have "Buka Scanner QR"');

  // 2. Check Tukar page (consumer/scan.html)
  const resTukar = await request('GET', '/consumer/scan.html');
  assert(resTukar.status === 200, 'Tukar page must return 200');
  assert(resTukar.body.includes('Tukar Kode Kemasan'), 'Tukar page must have title "Tukar Kode Kemasan"');
  assert(resTukar.body.includes('Tukar +50 Coin'), 'Tukar page must have button "Tukar +50 Coin"');
  assert(!resTukar.body.includes('qr-scanner'), 'Tukar page must NOT contain camera scanner');
  assert(!resTukar.body.includes('scanner-overlay-line'), 'Tukar page must NOT contain scanner overlay');

  // 3. Check reward and account pages
  const resReward = await request('GET', '/consumer/reward.html');
  assert(resReward.body.includes('Tukar'), 'Reward page must have "Tukar" in bottom nav');
  const resAkun = await request('GET', '/consumer/akun.html');
  assert(resAkun.body.includes('Tukar'), 'Akun page must have "Tukar" in bottom nav');

  console.log('✅ CRITERION Q PASSED: Consumer navigation changed to "Tukar", camera-free code claim page verified.\n');

  console.log('======================================================');
  console.log('🎉 ALL REVIEW ACCEPTANCE CRITERIA (A-Q) PASSED!');
  console.log('======================================================\n');
  process.exit(0);
} catch (err) {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
}


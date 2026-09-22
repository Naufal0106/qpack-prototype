/**
 * test-production.mjs — Live HTTP verification against deployed Vercel & Supabase application
 */

const TARGET_URL = (process.env.TARGET_URL || 'https://qpackprototype.vercel.app').replace(/\/$/, '');

console.log('======================================================');
console.log(`   RUNNING LIVE PRODUCTION VERIFICATION ON VERCEL     `);
console.log(`   Target: ${TARGET_URL}                               `);
console.log('======================================================\n');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[Production Assertion Failed] ${message}`);
  }
}

async function request(path, options = {}) {
  const url = `${TARGET_URL}${path}`;
  await new Promise(r => setTimeout(r, 400));
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 QPackVerifier/1.0',
      ...options.headers
    },
    signal: AbortSignal.timeout(20000),
    ...options
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, text };
}

try {
  // 1. Production Health Endpoint (Task 10)
  console.log('TEST P1: Verifying Production Health Endpoint (/api/health)...');
  const healthRes = await request('/api/health');
  console.log('Health response:', healthRes.body);
  assert(healthRes.status === 200, `Expected 200, got ${healthRes.status}`);
  assert(healthRes.body.status === 'ok', 'Status should be ok');
  console.log('✅ TEST P1 PASSED: /api/health responded 200 OK.\n');

  // 2. Production Diagnostic Endpoint (Task 11: Database verification)
  console.log('TEST P2: Verifying Database Provider Diagnostic (/api/diagnostic)...');
  const diagRes = await request('/api/diagnostic');
  console.log('Diagnostic response:', diagRes.body);
  assert(diagRes.status === 200, `Expected 200, got ${diagRes.status}`);
  assert(diagRes.body.database_provider === 'supabase', `Expected database_provider "supabase", got ${diagRes.body.database_provider}`);
  console.log('✅ TEST P2 PASSED: Verified production is using Supabase persistent database.\n');

  // 3. Package Lookup & Digital Passport (Task 8 - QR-001)
  console.log('TEST P3: Verifying Package Lookup for QP-2027-000001...');
  const pkgRes1 = await request('/api/packages/QP-2027-000001');
  assert(pkgRes1.status === 200, `Expected 200, got ${pkgRes1.status}`);
  assert(pkgRes1.body.data.qr_code === 'QP-2027-000001', 'QR Code mismatch');
  assert(pkgRes1.body.data.product_name.includes('Cassava'), 'Product mismatch');
  assert(Array.isArray(pkgRes1.body.data.materials), 'Must have materials array');
  assert(pkgRes1.body.data.materials.length >= 2, 'Must have at least 2 materials');
  const matNames = pkgRes1.body.data.materials.map(m => m.name);
  assert(matNames.includes('Kulit Singkong'), 'Must include Kulit Singkong');
  assert(matNames.includes('Sisik Ikan'), 'Must include Sisik Ikan');
  const forbiddenTerms = ['algae', 'alga', 'seaweed', 'rumput laut'];
  const jsonStr = JSON.stringify(pkgRes1.body).toLowerCase();
  for (const term of forbiddenTerms) {
    assert(!jsonStr.includes(term), `Response must not include forbidden term: ${term}`);
  }
  console.log('✅ TEST P3 PASSED: QP-2027-000001 retrieved with 2 waste materials, zero algae.\n');

  // Generate a unique test consumer ID for production verification to guarantee clean isolated test state
  const testConsumerId = `prod_tester_${Date.now()}`;

  // 4. First Scan -> +50 points, collection progress 1/10 (Task 8)
  console.log(`TEST P4: Testing First Scan with consumer [${testConsumerId}]...`);
  const scanRes1 = await request('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ qr_code: 'QP-2027-000001', consumer_id: testConsumerId })
  });
  assert(scanRes1.status === 200, `Expected 200, got ${scanRes1.status}`);
  assert(scanRes1.body.scan.is_first_scan === true, 'is_first_scan must be true');
  assert(scanRes1.body.scan.points_awarded === 50, 'Points awarded must be 50');
  assert(scanRes1.body.consumer.points === 50, 'Points must be 50');
  assert(scanRes1.body.consumer.unique_packages_collected === 1, 'Collected must be 1');
  assert(scanRes1.body.consumer.collection_progress === '1/10', 'Progress must be 1/10');
  console.log('✅ TEST P4 PASSED: First scan awarded +50 points, collection progress is 1/10.\n');

  // 5. Scan Same QR Again -> Duplicate prevention, 0 points (Task 8)
  console.log('TEST P5: Scanning QP-2027-000001 again (Anti-Duplicate Claim)...');
  const scanResDup = await request('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ qr_code: 'QP-2027-000001', consumer_id: testConsumerId })
  });
  assert(scanResDup.status === 200, `Expected 200, got ${scanResDup.status}`);
  assert(scanResDup.body.scan.is_first_scan === false, 'is_first_scan must be false');
  assert(scanResDup.body.scan.is_duplicate === true, 'is_duplicate must be true');
  assert(scanResDup.body.scan.points_awarded === 0, 'Points awarded on duplicate must be 0');
  assert(scanResDup.body.consumer.points === 50, 'Points balance must remain 50');
  assert(scanResDup.body.consumer.unique_packages_collected === 1, 'Collection count must remain 1');
  console.log('✅ TEST P5 PASSED: Repeated scan gave 0 additional points, collection progress remained 1/10.\n');

  // 6. Scan QR-002 -> Distinct data, +50 points, collection progress 2/10 (Task 8)
  console.log('TEST P6: Scanning QP-2027-000002 (Second Package)...');
  const scanRes2 = await request('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ qr_code: 'QP-2027-000002', consumer_id: testConsumerId })
  });
  assert(scanRes2.status === 200, `Expected 200, got ${scanRes2.status}`);
  assert(scanRes2.body.package.product_name.includes('Marine Chitosan'), 'Product must be Marine Chitosan');
  assert(Array.isArray(scanRes2.body.package.materials), 'Must have materials array');
  assert(scanRes2.body.package.materials.length >= 2, 'Must have at least 2 materials');
  const scan2JsonStr = JSON.stringify(scanRes2.body).toLowerCase();
  for (const term of forbiddenTerms) {
    assert(!scan2JsonStr.includes(term), `Scan 2 response must not include forbidden term: ${term}`);
  }
  assert(scanRes2.body.scan.points_awarded === 50, 'Points awarded must be 50');
  assert(scanRes2.body.consumer.points === 100, 'Points balance must be 100');
  assert(scanRes2.body.consumer.unique_packages_collected === 2, 'Collection must be 2');
  assert(scanRes2.body.consumer.collection_progress === '2/10', 'Progress must be 2/10');
  console.log('✅ TEST P6 PASSED: QR-002 produced distinct package data, 2 circular materials, zero algae, +50 points.\n');

  // 7. Merchant Analytics from Production Database (Task 9)
  console.log('TEST P7: Verifying Merchant Analytics from Production Database...');
  const analyticsRes = await request('/api/merchant/analytics');
  assert(analyticsRes.status === 200, `Expected 200, got ${analyticsRes.status}`);
  assert(analyticsRes.body.analytics.total_scans >= 3, 'Total scans must be >= 3');
  assert(analyticsRes.body.analytics.unique_packages_scanned >= 2, 'Unique packages scanned must be >= 2');
  assert(analyticsRes.body.analytics.data_source_disclaimer === 'Diperbarui dari rekaman interaksi QR', 'Disclaimer verified');
  console.log('✅ TEST P7 PASSED: Merchant analytics reading accurately from production database.\n');

  // 8. Reopening QP-001 after QP-002: Semantics & Claim Status Confirmation
  console.log('TEST P8: Verifying Points Semantics & Claim Status on Reopening QP-001...');
  const reopenPkgRes = await request(`/api/packages/QP-2027-000001?consumer_id=${testConsumerId}`);
  assert(reopenPkgRes.status === 200, `Expected 200, got ${reopenPkgRes.status}`);
  assert(reopenPkgRes.body.data.is_claimed === true, 'QP-001 status must remain "Sudah diklaim"');

  const reopenProfileRes = await request(`/api/consumer/${testConsumerId}/profile`);
  assert(reopenProfileRes.status === 200, `Expected 200, got ${reopenProfileRes.status}`);
  assert(reopenProfileRes.body.consumer.points === 100, 'Global wallet balance must still be 100 Pts (Saldo Akun: 100 Pts)');
  assert(reopenProfileRes.body.consumer.collection_progress === '2/10', 'Global collection progress must remain 2/10');
  console.log('✅ TEST P8 PASSED: Reopened QP-001 confirmed Saldo Akun: 100 Pts and Reward Kemasan status: Sudah diklaim.\n');

  // 9. Merchant Packages Listing & QR Management API on Production
  console.log('TEST P9: Verifying Merchant Packages & QR Management on Production...');
  const packagesRes = await request('/api/merchant/packages');
  assert(packagesRes.status === 200, `Expected 200, got ${packagesRes.status}`);
  assert(packagesRes.body.success === true, 'Success must be true');
  assert(Array.isArray(packagesRes.body.packages), 'Packages must be array');
  assert(packagesRes.body.packages.length >= 3, 'Must have at least 3 packages in production database');
  const prodPkg1 = packagesRes.body.packages.find(p => p.qr_code === 'QP-2027-000001');
  assert(prodPkg1 !== undefined, 'QP-2027-000001 must exist in merchant packages response');
  assert(prodPkg1.qr_image_url.includes('QP-2027-000001.png'), 'Must have qr_image_url');
  assert(prodPkg1.destination_url.includes('/p/QP-2027-000001'), 'Must have destination_url');
  assert(Array.isArray(prodPkg1.materials), 'Must have circular materials array');
  assert(prodPkg1.materials.some(m => m.name === 'Kulit Singkong'), 'Must include Kulit Singkong');
  assert(prodPkg1.materials.some(m => m.name === 'Sisik Ikan'), 'Must include Sisik Ikan');
  console.log('✅ TEST P9 PASSED: Production QR Management API verified with full metadata and URLs.\n');

  // 10. Verify /scan, /impact, bank-sampah, and home page on production
  console.log('TEST P10: Verifying /scan, decoupled official home, bank-sampah, and absence of CO2 claims...');
  // Primary QR Scan Result Page (/scan)
  const scanRes = await request('/scan');
  assert(scanRes.status === 200, `Expected 200 for /scan, got ${scanRes.status}`);
  assert(scanRes.text.includes('Kulit Singkong'), '/scan must feature Kulit Singkong');
  assert(scanRes.text.includes('Sisik Ikan'), '/scan must feature Sisik Ikan');
  assert(!scanRes.text.includes('-65%') && !scanRes.text.includes('65%'), '/scan must NOT contain 65%');
  assert(!scanRes.text.toLowerCase().includes('co2') && !scanRes.text.toLowerCase().includes('co₂'), '/scan must NOT contain CO2 or CO₂');

  // Backward-compatible /impact alias
  const impactRes = await request('/impact');
  assert(impactRes.status === 200, `Expected 200 for /impact, got ${impactRes.status}`);
  assert(!impactRes.text.includes('-65%') && !impactRes.text.includes('65%'), '/impact must NOT contain 65%');

  // Official Home page
  const homeRes = await request('/');
  assert(homeRes.status === 200, `Expected 200 for /, got ${homeRes.status}`);
  assert(!homeRes.text.includes('href="/impact"') && !homeRes.text.includes("href='/impact'"), 'Home page must NOT link to /impact');
  assert(!homeRes.text.includes('-65%') && !homeRes.text.includes('65%'), 'Home page must NOT contain 65%');
  assert(!homeRes.text.toLowerCase().includes('co2') && !homeRes.text.toLowerCase().includes('co₂'), 'Home page must NOT contain CO2 or CO₂');

  // Mitra Bank Sampah return form
  const bankSampahRes = await request('/bank-sampah');
  assert(bankSampahRes.status === 200, `Expected 200 for /bank-sampah, got ${bankSampahRes.status}`);
  assert(bankSampahRes.text.includes('Form Pengembalian Kemasan'), 'Bank sampah must have return form');

  console.log('✅ TEST P10 PASSED: Verified production /scan, decoupled official home, bank-sampah form, and zero CO2 claims.\n');

  console.log('======================================================');
  console.log('🎉 ALL PRODUCTION VERIFICATION TESTS (P1-P10) PASSED!');
  console.log('======================================================\n');
  process.exit(0);
} catch (err) {
  console.error('\n❌ PRODUCTION TEST FAILED:', err.message);
  process.exit(1);
}

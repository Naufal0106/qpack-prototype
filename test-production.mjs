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
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
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
  console.log('✅ TEST P3 PASSED: QP-2027-000001 retrieved from production Supabase.\n');

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
  assert(scanRes2.body.scan.points_awarded === 50, 'Points awarded must be 50');
  assert(scanRes2.body.consumer.points === 100, 'Points balance must be 100');
  assert(scanRes2.body.consumer.unique_packages_collected === 2, 'Collection must be 2');
  assert(scanRes2.body.consumer.collection_progress === '2/10', 'Progress must be 2/10');
  console.log('✅ TEST P6 PASSED: QR-002 produced distinct package data, +50 points, collection progress is 2/10.\n');

  // 7. Merchant Analytics from Production Database (Task 9)
  console.log('TEST P7: Verifying Merchant Analytics from Production Database...');
  const analyticsRes = await request('/api/merchant/analytics');
  assert(analyticsRes.status === 200, `Expected 200, got ${analyticsRes.status}`);
  assert(analyticsRes.body.analytics.total_scans >= 3, 'Total scans must be >= 3');
  assert(analyticsRes.body.analytics.unique_packages_scanned >= 2, 'Unique packages scanned must be >= 2');
  assert(analyticsRes.body.analytics.data_source_disclaimer === 'Diperbarui dari rekaman interaksi QR', 'Disclaimer verified');
  console.log('✅ TEST P7 PASSED: Merchant analytics reading accurately from production database.\n');

  console.log('======================================================');
  console.log('🎉 ALL PRODUCTION VERIFICATION TESTS PASSED!');
  console.log('======================================================\n');
  process.exit(0);
} catch (err) {
  console.error('\n❌ PRODUCTION TEST FAILED:', err.message);
  process.exit(1);
}

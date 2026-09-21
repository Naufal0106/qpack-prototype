import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageRepository, consumerRepository, scanRepository, DB_PROVIDER } from './src/repositories/index.js';
import { ScanService } from './src/services/scanService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ENVIRONMENT = process.env.NODE_ENV || (DB_PROVIDER === 'supabase' ? 'production' : 'development');

app.use(cors());
app.use(express.json());

// Serve static assets, pages, and stylesheets
app.use(express.static(__dirname));

// ==========================================
// REST API ENDPOINTS
// ==========================================

// 1. Health Endpoint (Task 10)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: DB_PROVIDER,
    environment: ENVIRONMENT
  });
});

// 2. Diagnostic Endpoint (Task 11 & Production Diagnostics)
app.get('/api/diagnostic', async (req, res) => {
  try {
    let projectRef = 'local-sqlite';
    let packagesCount = 0;
    let canonicalQrExists = false;
    let matchingQrCodes = [];
    let queryError = null;
    let testPackage = null;

    if (DB_PROVIDER === 'supabase') {
      const url = process.env.SUPABASE_URL || '';
      const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
      projectRef = match ? match[1] : (url ? url.split('//')[1]?.split('.')[0] : 'not_configured');

      const client = packageRepository.getClient();

      // Query 1: count packages (Task 2)
      const countRes = await client.from('packages').select('*', { count: 'exact', head: true });
      if (countRes.error) {
        queryError = `count query error: ${countRes.error.message}`;
      } else {
        packagesCount = countRes.count || 0;
      }

      // Query 2: canonical QR query (Task 2)
      const samplesRes = await client
        .from('packages')
        .select('id, qr_code, status')
        .in('qr_code', ['QP-2027-000001', 'QP-2027-000002', 'QP-2027-000003']);

      if (samplesRes.error) {
        queryError = queryError ? `${queryError}; samples query error: ${samplesRes.error.message}` : `samples query error: ${samplesRes.error.message}`;
      } else if (samplesRes.data) {
        matchingQrCodes = samplesRes.data.map(p => p.qr_code);
        canonicalQrExists = matchingQrCodes.includes('QP-2027-000001');
      }

      // Query 3: full repository lookup test
      try {
        testPackage = await packageRepository.findByQRCode('QP-2027-000001');
      } catch (repoErr) {
        queryError = queryError ? `${queryError}; lookup error: ${repoErr.message}` : `lookup error: ${repoErr.message}`;
      }
    } else {
      packagesCount = await packageRepository.count();
      testPackage = await packageRepository.findByQRCode('QP-2027-000001');
      canonicalQrExists = !!testPackage;
      matchingQrCodes = testPackage ? [testPackage.qr_code] : [];
    }

    res.json({
      status: 'ok',
      database_provider: DB_PROVIDER,
      environment: ENVIRONMENT,
      project_ref: projectRef,
      packages_count: packagesCount,
      canonical_qr_exists: canonicalQrExists,
      matching_qr_codes: matchingQrCodes,
      sample_record_verified: !!testPackage,
      sample_package_id: testPackage ? testPackage.qr_code : null,
      lookup_test: !!testPackage,
      query_error: queryError,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database_provider: DB_PROVIDER,
      error: err.message
    });
  }
});

// 3. GET /api/packages/:qr_code — Digital Passport Lookup
app.get('/api/packages/:qr_code', async (req, res) => {
  try {
    const { qr_code } = req.params;
    const consumer_id = req.query.consumer_id || null;
    const packageData = await packageRepository.findByQRCode(qr_code);

    if (!packageData) {
      return res.status(404).json({
        success: false,
        error: 'Package Not Found',
        message: `Kemasan dengan kode '${qr_code}' tidak terdaftar di sistem Q-Pack.`,
        dataSource: DB_PROVIDER
      });
    }

    let is_claimed = false;
    if (consumer_id) {
      const consumer = await consumerRepository.findOrCreate(consumer_id);
      is_claimed = await scanRepository.hasConsumerScannedPackage(packageData.package_id, consumer.id);
    }

    res.json({
      success: true,
      data: {
        ...packageData,
        is_claimed
      },
      meta: {
        dataSource: DB_PROVIDER,
        environment: ENVIRONMENT
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /api/scan — Record scan event, award points (anti-duplication), track collection
app.post('/api/scan', async (req, res) => {
  try {
    const { qr_code } = req.body;
    const consumer_id = req.body.consumer_id || 'cons_demo_001';

    if (!qr_code) {
      return res.status(400).json({
        success: false,
        error: 'Missing QR Code',
        message: 'Kode QR wajib disertakan.'
      });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Client';

    const result = await ScanService.processScan({
      qrCode: qr_code,
      consumerId: consumer_id,
      ipAddress,
      userAgent
    });

    res.json({
      success: true,
      ...result,
      meta: {
        dataSource: DB_PROVIDER,
        environment: ENVIRONMENT
      }
    });
  } catch (err) {
    if (err.code === 'PACKAGE_NOT_FOUND' || err.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Package Not Found',
        message: err.message,
        dataSource: DB_PROVIDER
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. GET /api/consumer/:consumer_id/profile — Point balance and collection progress
app.get('/api/consumer/:consumer_id/profile', async (req, res) => {
  try {
    const { consumer_id } = req.params;
    const profile = await ScanService.getConsumerProfile(consumer_id);
    res.json({
      success: true,
      ...profile,
      meta: {
        dataSource: DB_PROVIDER
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. GET /api/merchant/analytics — QR interaction metrics
app.get('/api/merchant/analytics', async (req, res) => {
  try {
    const merchant_id = req.query.merchant_id || null;
    const analytics = await ScanService.getMerchantAnalytics(merchant_id);
    res.json({
      success: true,
      analytics,
      meta: {
        dataSource: DB_PROVIDER
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6b. GET /api/merchant/packages — List packages with QR metadata & destination URLs
app.get('/api/merchant/packages', async (req, res) => {
  try {
    const merchant_id = req.query.merchant_id || null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const packages = await packageRepository.findAll({ merchantId: merchant_id, limit });

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const baseUrl = process.env.APP_BASE_URL || `${protocol}://${host}`;

    const formattedPackages = packages.map(pkg => ({
      ...pkg,
      qr_image_url: `/assets/qr/${encodeURIComponent(pkg.qr_code)}.png`,
      destination_url: `${baseUrl}/p/${encodeURIComponent(pkg.qr_code)}`
    }));

    res.json({
      success: true,
      packages: formattedPackages,
      total: formattedPackages.length,
      meta: {
        dataSource: DB_PROVIDER,
        environment: ENVIRONMENT
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. POST /api/demo/reset — Reset demo data
app.post('/api/demo/reset', async (req, res) => {
  try {
    const result = await ScanService.resetDemoData();
    res.json({
      ...result,
      meta: { dataSource: DB_PROVIDER }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// FRONTEND ROUTING
// ==========================================

// Route /p/:qr_code -> Canonical Package Digital Passport
app.get('/p/:qr_code', (req, res) => {
  res.sendFile(path.join(__dirname, 'consumer', 'hasil-scan.html'));
});

// Route /merchant/qr & /merchant/packages -> QR Management Dashboard
app.get(['/merchant/qr', '/merchant/packages'], (req, res) => {
  res.sendFile(path.join(__dirname, 'merchant', 'qr.html'));
});

// Route /404 -> Package Not Found
app.get('/404', (req, res) => {
  res.sendFile(path.join(__dirname, '404.html'));
});

// Start Server locally if run directly
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Q-Pack Server running at http://localhost:${PORT}`);
    console.log(`Provider: ${DB_PROVIDER.toUpperCase()} | Environment: ${ENVIRONMENT}`);
    console.log(`Health Check: http://localhost:${PORT}/api/health`);
    console.log(`Diagnostic: http://localhost:${PORT}/api/diagnostic`);
    console.log(`Canonical Demo: http://localhost:${PORT}/p/QP-2027-000001`);
  });
}

export default app;

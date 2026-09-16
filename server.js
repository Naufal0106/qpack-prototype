import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageRepository, DB_PROVIDER } from './src/repositories/index.js';
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

// 2. Diagnostic Endpoint (Task 11: Proves database provider in use)
app.get('/api/diagnostic', async (req, res) => {
  try {
    const testPackage = await packageRepository.findByQRCode('QP-2027-000001');
    res.json({
      status: 'ok',
      database_provider: DB_PROVIDER,
      environment: ENVIRONMENT,
      lookup_source: DB_PROVIDER === 'supabase' ? 'Supabase PostgreSQL (Production)' : 'SQLite (Local Development)',
      sample_record_verified: !!testPackage,
      sample_package_id: testPackage ? testPackage.qr_code : null,
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
    const packageData = await packageRepository.findByQRCode(qr_code);

    if (!packageData) {
      return res.status(404).json({
        success: false,
        error: 'Package Not Found',
        message: `Kemasan dengan kode '${qr_code}' tidak terdaftar di sistem Q-Pack.`,
        dataSource: DB_PROVIDER
      });
    }

    res.json({
      success: true,
      data: packageData,
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

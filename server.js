import express from 'express';
import cors from 'cors';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { packageRepository, consumerRepository, scanRepository, merchantRepository, DB_PROVIDER } from './src/repositories/index.js';
import { ScanService } from './src/services/scanService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ENVIRONMENT = process.env.NODE_ENV || (DB_PROVIDER === 'supabase' ? 'production' : 'development');

function hashPassword(password) {
  const salt = 'qpack_salt_2027';
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function verifyPassword(password, storedHash) {
  if (!storedHash) {
    // For seeded demo accounts without pre-hashed passwords, allow 'qpack123'
    return password === 'qpack123';
  }
  return hashPassword(password) === storedHash;
}

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

// 4b. POST /api/claim — Claim reward points using unique code printed on physical package
app.post('/api/claim', async (req, res) => {
  try {
    const unique_code = req.body.unique_code || req.body.qr_code;
    const consumer_id = req.body.consumer_id || 'cons_demo_001';

    if (!unique_code) {
      return res.status(400).json({
        success: false,
        error: 'Missing Unique Code',
        message: 'Kode unik kemasan fisik wajib disertakan.'
      });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Client';

    const result = await ScanService.processClaim({
      uniqueCode: unique_code,
      consumerId: consumer_id,
      ipAddress,
      userAgent
    });

    res.json({
      success: true,
      data: result,
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

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// POST /api/auth/register-consumer
app.post('/api/auth/register-consumer', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nama, email, dan password wajib diisi.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
    }

    const existing = await consumerRepository.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email sudah terdaftar. Silakan login.' });
    }

    const id = `cons_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const passwordHash = hashPassword(password);
    const consumer = await consumerRepository.createConsumer({
      id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      points: 0
    });

    res.status(201).json({
      success: true,
      message: 'Registrasi konsumen berhasil!',
      user: {
        id: consumer.id,
        name: consumer.name,
        email: consumer.email,
        role: 'consumer',
        points: consumer.points || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/register-merchant
app.post('/api/auth/register-merchant', async (req, res) => {
  try {
    const name = req.body.name || req.body.contact_name;
    const { brand_name, email, password } = req.body;
    if (!name || !brand_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nama, nama brand, email, dan password wajib diisi.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
    }

    const existing = await merchantRepository.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email merchant sudah terdaftar. Silakan login.' });
    }

    const id = `m_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const passwordHash = hashPassword(password);
    const merchant = await merchantRepository.createMerchant({
      id,
      name: name.trim(),
      brand_name: brand_name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash
    });

    res.status(201).json({
      success: true,
      message: 'Registrasi merchant berhasil!',
      user: {
        id: merchant.id,
        name: merchant.name,
        brand_name: merchant.brand_name,
        email: merchant.email,
        role: 'merchant'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role = 'consumer' } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
    }

    if (role === 'merchant') {
      const merchant = await merchantRepository.findByEmail(email);
      if (!merchant) {
        return res.status(401).json({ success: false, message: 'Akun merchant dengan email tersebut tidak ditemukan.' });
      }
      if (!verifyPassword(password, merchant.password_hash)) {
        return res.status(401).json({ success: false, message: 'Password merchant salah.' });
      }
      return res.json({
        success: true,
        message: 'Login merchant berhasil!',
        user: {
          id: merchant.id,
          name: merchant.name,
          brand_name: merchant.brand_name,
          email: merchant.email,
          role: 'merchant'
        }
      });
    }

    // Default: consumer
    const consumer = await consumerRepository.findByEmail(email);
    if (!consumer) {
      return res.status(401).json({ success: false, message: 'Akun konsumen dengan email tersebut tidak ditemukan.' });
    }
    if (!verifyPassword(password, consumer.password_hash)) {
      return res.status(401).json({ success: false, message: 'Password konsumen salah.' });
    }

    return res.json({
      success: true,
      message: 'Login konsumen berhasil!',
      user: {
        id: consumer.id,
        name: consumer.name,
        email: consumer.email,
        role: 'consumer',
        points: consumer.points || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', async (req, res) => {
  try {
    const user_id = req.query.id;
    const role = req.query.role || 'consumer';
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'User ID diperlukan.' });
    }

    if (role === 'merchant') {
      const merchant = await merchantRepository.findById(user_id);
      if (!merchant) return res.status(404).json({ success: false, message: 'Merchant tidak ditemukan.' });
      return res.json({
        success: true,
        user: { id: merchant.id, name: merchant.name, brand_name: merchant.brand_name, email: merchant.email, role: 'merchant' }
      });
    }

    const consumer = await consumerRepository.findById(user_id);
    if (!consumer) return res.status(404).json({ success: false, message: 'Konsumen tidak ditemukan.' });
    return res.json({
      success: true,
      user: { id: consumer.id, name: consumer.name, email: consumer.email, role: 'consumer', points: consumer.points || 0 }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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

// Route /scan & /qr -> QR Scan Result Page (Physical Packaging QR Destination)
app.get(['/scan', '/qr'], (req, res) => {
  res.sendFile(path.join(__dirname, 'scan.html'));
});

// Route /impact -> Backward-compatible alias for existing QR scans and tests
app.get('/impact', (req, res) => {
  res.sendFile(path.join(__dirname, 'scan.html'));
});

// Route /login -> Login Page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Route /register-consumer -> Consumer Registration
app.get('/register-consumer', (req, res) => {
  res.sendFile(path.join(__dirname, 'register-consumer.html'));
});

// Route /register-merchant -> Merchant Registration
app.get('/register-merchant', (req, res) => {
  res.sendFile(path.join(__dirname, 'register-merchant.html'));
});

// Route /p/:qr_code -> Canonical Package Digital Passport
app.get('/p/:qr_code', (req, res) => {
  res.sendFile(path.join(__dirname, 'consumer', 'hasil-scan.html'));
});

// Route /merchant/qr & /merchant/packages -> QR Management Dashboard
app.get(['/merchant/qr', '/merchant/packages'], (req, res) => {
  res.sendFile(path.join(__dirname, 'merchant', 'qr.html'));
});

// Route /bank-sampah -> Mitra Bank Sampah Portal
app.get('/bank-sampah', (req, res) => {
  res.sendFile(path.join(__dirname, 'bank-sampah.html'));
});

// Route /consumer -> Consumer Dashboard
app.get('/consumer', (req, res) => {
  res.redirect('/consumer/dashboard.html');
});

// Route /consumer/tukar -> Consumer Tukar Kode Page
app.get(['/consumer/tukar', '/consumer/tukar.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'consumer', 'scan.html'));
});

// Route /merchant -> Merchant Dashboard
app.get('/merchant', (req, res) => {
  res.redirect('/merchant/dashboard.html');
});

// Clean Merchant Routes
app.get(['/merchant/dashboard', '/merchant/dashboard.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'merchant', 'dashboard.html'));
});
app.get(['/merchant/produk', '/merchant/produk.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'merchant', 'produk.html'));
});
app.get(['/merchant/pesanan', '/merchant/status-order', '/merchant/status-order.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'merchant', 'status-order.html'));
});
app.get(['/merchant/checkout', '/merchant/checkout.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'merchant', 'checkout.html'));
});
app.get(['/merchant/esg', '/merchant/esg.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'merchant', 'esg.html'));
});
app.get(['/merchant/laporan', '/merchant/ai-report', '/merchant/laporan.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'merchant', 'laporan.html'));
});
app.get(['/merchant/akun', '/merchant/akun.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'merchant', 'akun.html'));
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

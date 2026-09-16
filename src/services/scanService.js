import crypto from 'node:crypto';
import { packageRepository, consumerRepository, scanRepository } from '../repositories/index.js';

const POINTS_PER_FIRST_SCAN = parseInt(process.env.POINTS_PER_SCAN || '50', 10);
const COLLECTION_TARGET = parseInt(process.env.COLLECTION_TARGET || '10', 10);

export class ScanService {
  /**
   * Process a package scan:
   * 1. Validates package existence in database
   * 2. Checks if consumer already claimed reward for this package
   * 3. Awards +50 points only on first unique scan
   * 4. Updates "Collected" count (NOT "Returned")
   * 5. Logs audit scan event
   */
  static async processScan({ qrCode, consumerId = 'cons_demo_001', ipAddress = '127.0.0.1', userAgent = 'Demo' }) {
    if (!qrCode) {
      throw new Error('Kode QR wajib disertakan.');
    }

    // 1. Database lookup
    const packageData = await packageRepository.findByQRCode(qrCode);
    if (!packageData) {
      const err = new Error(`Kemasan dengan kode '${qrCode}' tidak terdaftar di sistem Q-Pack.`);
      err.status = 404;
      err.code = 'PACKAGE_NOT_FOUND';
      throw err;
    }

    // 2. Ensure consumer exists
    const consumer = await consumerRepository.findOrCreate(consumerId, {
      name: 'Budi Santoso',
      email: `${consumerId}@qpack.id`,
      points: 0
    });

    // 3. Duplicate check
    const isDuplicate = await scanRepository.hasConsumerScannedPackage(packageData.package_id, consumer.id);

    let pointsAwarded = 0;
    let message = '';

    const scanId = `scan_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    if (!isDuplicate) {
      // First unique scan for this package by this consumer
      pointsAwarded = POINTS_PER_FIRST_SCAN;
      await scanRepository.createScanEvent({
        id: scanId,
        packageId: packageData.package_id,
        consumerId: consumer.id,
        pointsAwarded,
        ipAddress,
        userAgent
      });

      // Increment consumer point balance
      await consumerRepository.addPoints(consumer.id, pointsAwarded);
      message = `Selamat! Anda mendapatkan +${pointsAwarded} Poin Q-Pack. Kemasan berhasil ditambahkan ke koleksi Anda.`;
    } else {
      // Duplicate scan: log audit event with 0 points
      await scanRepository.createScanEvent({
        id: scanId,
        packageId: packageData.package_id,
        consumerId: consumer.id,
        pointsAwarded: 0,
        ipAddress,
        userAgent
      });
      message = 'Kemasan ini sudah pernah Anda klaim sebelumnya. Poin dan koleksi unik tidak digandakan.';
    }

    // 4. Retrieve refreshed consumer metrics
    const consumerStats = await this.getConsumerProfile(consumer.id);

    return {
      package: packageData,
      scan: {
        id: scanId,
        is_first_scan: !isDuplicate,
        is_duplicate: isDuplicate,
        points_awarded: pointsAwarded,
        message,
        scanned_at: new Date().toISOString()
      },
      consumer: consumerStats.consumer
    };
  }

  /**
   * Get consumer profile with explicit gamification semantics:
   * - unique_packages_collected (Collected != Returned)
   * - collection_progress: "X/10"
   */
  static async getConsumerProfile(consumerId) {
    const consumer = await consumerRepository.findOrCreate(consumerId);
    const stats = await scanRepository.getConsumerScanStats(consumer.id);
    const recentScans = await scanRepository.getRecentScansByConsumer(consumer.id, 10);

    const uniqueCollected = stats.uniquePackagesScanned;
    const progressPercentage = Math.min(100, Math.round((uniqueCollected / COLLECTION_TARGET) * 100));

    return {
      consumer: {
        id: consumer.id,
        name: consumer.name,
        email: consumer.email,
        points: consumer.points,
        unique_packages_collected: uniqueCollected,
        total_scans: stats.totalScans,
        collection_target: COLLECTION_TARGET,
        collection_progress: `${uniqueCollected}/${COLLECTION_TARGET}`,
        collection_percentage: progressPercentage,
        // Explicit distinction between Collected and Returned
        status_collected: `${uniqueCollected} kemasan unik terkumpul`,
        status_returned: '0 kemasan dikembalikan (fitur sirkular tahap berikutnya)'
      },
      recent_scans: recentScans
    };
  }

  /**
   * Get merchant analytics from recorded QR interactions
   */
  static async getMerchantAnalytics(merchantId = null) {
    const totalScans = await scanRepository.countTotalScans(merchantId);
    const uniquePackagesScanned = await scanRepository.countUniquePackagesScanned(merchantId);
    const totalPackagesCreated = await packageRepository.count(merchantId);
    const uniqueConsumers = await scanRepository.countUniqueConsumers(merchantId);

    const engagementRate = totalPackagesCreated > 0
      ? Math.round((uniquePackagesScanned / totalPackagesCreated) * 100)
      : 0;

    const recentScans = await scanRepository.getRecentScans(5, merchantId);

    return {
      total_scans: totalScans,
      unique_packages_scanned: uniquePackagesScanned,
      total_packages_created: totalPackagesCreated,
      unique_consumers: uniqueConsumers,
      consumer_engagement_rate: `${engagementRate}%`,
      data_source_disclaimer: 'Diperbarui dari rekaman interaksi QR',
      recent_scans: recentScans
    };
  }

  /**
   * Reset demo data for presentation/judging
   */
  static async resetDemoData() {
    await scanRepository.clearAll();
    await consumerRepository.resetAllPoints();
    return { success: true, message: 'Data demo pemindaian dan poin berhasil direset.' };
  }
}

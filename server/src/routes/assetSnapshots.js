const express = require('express');
const router = express.Router();
const assetSnapshotController = require('../controllers/assetSnapshotController');
const auth = require('../middleware/auth');

// 일별 자산 변화 조회
router.get('/daily-changes', auth, assetSnapshotController.getDailyAssetChanges);

// 히스토리 스냅샷 생성 (관리자용)
router.post('/create-historical', auth, assetSnapshotController.createHistoricalSnapshots);

// 특정 날짜 스냅샷 생성
router.post('/create', auth, assetSnapshotController.createSnapshot);

// 저장된 스냅샷 목록 조회
router.get('/list', auth, assetSnapshotController.getSnapshots);

module.exports = router; 
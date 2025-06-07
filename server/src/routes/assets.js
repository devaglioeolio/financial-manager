const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const auth = require('../middleware/auth');

// 모든 자산 라우트에 인증 미들웨어 적용
router.use(auth);

// 자산 목록 조회
router.get('/', assetController.getAssets);

// 월별 자산 현황 조회
router.get('/monthly', assetController.getMonthlyAssets);

// 일별 자산 현황 조회
router.get('/daily', assetController.getDailyAssets);

// 자산 추가
router.post('/', assetController.addAsset);

// 자산 거래 추가 (매수/매도)
router.post('/:id/transactions', assetController.addTransaction);

// 자산 수정
router.put('/:id', assetController.updateAsset);

// 자산 삭제
router.delete('/:id', assetController.deleteAsset);

module.exports = router; 
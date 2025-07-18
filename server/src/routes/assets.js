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
// 기존 방식 - 단순 생성일자 기준 sum (문제 있음)
// router.get('/daily', assetController.getDailyAssets);

// 새로운 방식 - 환율/주가 반영된 스냅샷 기반
const assetSnapshotController = require('../controllers/assetSnapshotController');
router.get('/daily', assetSnapshotController.getDailyAssetChanges);

// 최근 거래 내역 조회
router.get('/transactions/recent', assetController.getRecentTransactions);

// 환율 정보 조회
router.get('/exchange-rates', assetController.getExchangeRates);

// 환율 강제 새로고침 (위젯용)
router.post('/exchange-rates/refresh', assetController.refreshExchangeRates);

// 환율 데이터 초기화 (개발용)
router.post('/exchange-rates/initialize', assetController.initializeExchangeRates);

// 해외주식 실시간 수익률 조회
router.get('/foreign-stock-returns', assetController.getForeignStockReturns);

// 자산 추가
router.post('/', assetController.addAsset);

// 자산 거래 추가 (매수/매도)
router.post('/:id/transactions', assetController.addTransaction);

// 자산 수정
router.put('/:id', assetController.updateAsset);

// 자산 삭제
router.delete('/:id', assetController.deleteAsset);

module.exports = router; 
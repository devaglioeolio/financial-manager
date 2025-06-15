const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const stockCodeController = require('../controllers/stockCodeController');

// 종목 검색
router.get('/search', stockCodeController.searchStocks);

// 특정 종목 상세 조회
router.get('/:market/:ticker', stockCodeController.getStockDetail);

// 시장별 종목 수 통계
router.get('/stats/markets', stockCodeController.getMarketStats);

// 인기 종목 조회
router.get('/popular', stockCodeController.getPopularStocks);

module.exports = router; 
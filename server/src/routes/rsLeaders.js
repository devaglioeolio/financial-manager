const express = require('express');
const router = express.Router();
const rsLeaderController = require('../controllers/rsLeaderController');
const auth = require('../middleware/auth');

/**
 * @route GET /api/rs-leaders/market
 * @desc 시장별 RS 리더 조회
 * @access Private
 */
router.get('/market', auth, rsLeaderController.getMarketLeaders);

/**
 * @route GET /api/rs-leaders/advanced
 * @desc 고급 주도주 스크리닝
 * @access Private
 */
router.get('/advanced', auth, rsLeaderController.getAdvancedLeaders);

/**
 * @route GET /api/rs-leaders/all-markets
 * @desc 모든 시장의 상위 RS 종목 조회
 * @access Private
 */
router.get('/all-markets', auth, rsLeaderController.getAllMarketsTopRS);

/**
 * @route GET /api/rs-leaders/stats
 * @desc 시장별 RS 통계 조회
 * @access Private
 */
router.get('/stats', auth, rsLeaderController.getMarketRSStats);

/**
 * @route POST /api/rs-leaders/calculate
 * @desc RS 계산 수동 트리거
 * @access Private
 */
router.post('/calculate', auth, rsLeaderController.triggerRSCalculation);

module.exports = router; 
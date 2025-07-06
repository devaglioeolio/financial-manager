const express = require('express');
const router = express.Router();
const simpleRSController = require('../controllers/simpleRSController');
const auth = require('../middleware/auth');

/**
 * @route GET /api/simple-rs/top
 * @desc RS 리더 조회
 * @access Private
 */
router.get('/top', auth, simpleRSController.getTopRS);

/**
 * @route GET /api/simple-rs/advanced
 * @desc 고급 필터링 RS 리더 조회
 * @access Private
 */
router.get('/advanced', auth, simpleRSController.getAdvancedRS);

/**
 * @route GET /api/simple-rs/stats
 * @desc RS 통계 조회
 * @access Private
 */
router.get('/stats', auth, simpleRSController.getStats);

/**
 * @route GET /api/simple-rs/status
 * @desc 서비스 상태 조회
 * @access Private
 */
router.get('/status', auth, simpleRSController.getServiceStatus);

/**
 * @route POST /api/simple-rs/calculate
 * @desc RS 계산 수동 트리거
 * @access Private
 */
router.post('/calculate', auth, simpleRSController.triggerCalculation);

module.exports = router; 
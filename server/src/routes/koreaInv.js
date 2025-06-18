const express = require('express');
const router = express.Router();
const koreaInvController = require('../controllers/koreaInvController');
const auth = require('../middleware/auth'); // 인증 미들웨어

/**
 * 한국투자증권 API 라우트
 * Route → Controller → Service 패턴 적용
 */

/**
 * GET /api/korea-inv/overseas/chart/:symbol
 * 해외주식 기간별 시세 조회
 * 쿼리 파라미터: period, startDate, endDate
 */
router.get('/overseas/chart/:symbol', auth, koreaInvController.getOverseasChart);

/**
 * GET /api/korea-inv/overseas/price/:symbol
 * 해외주식 현재가 조회
 * 쿼리 파라미터: excd (거래소코드)
 */
router.get('/overseas/price/:symbol', auth, koreaInvController.getOverseasPrice);

/**
 * POST /api/korea-inv/overseas/chart/batch
 * 여러 종목의 기간별 시세 일괄 조회
 * Body: { symbols: string[], period?: string, startDate?: string, endDate?: string }
 */
router.post('/overseas/chart/batch', auth, koreaInvController.getBatchOverseasChart);

/**
 * POST /api/korea-inv/overseas/price/batch
 * 여러 종목의 현재가 일괄 조회
 * Body: { symbols: string[], excd?: string }
 */
router.post('/overseas/price/batch', auth, koreaInvController.getBatchOverseasPrice);

/**
 * GET /api/korea-inv/websocket/token
 * 웹소켓 인증키 조회
 */
router.get('/websocket/token', auth, koreaInvController.getWebsocketToken);

/**
 * GET /api/korea-inv/health
 * API 상태 확인
 */
router.get('/health', koreaInvController.healthCheck);

module.exports = router;

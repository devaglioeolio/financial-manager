const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const watchlistController = require('../controllers/watchlistController');

// 모든 라우트에 인증 미들웨어 적용
router.use(auth);

// 관심종목 목록 조회
router.get('/', watchlistController.getWatchlist);

// 관심종목에 추가
router.post('/', watchlistController.addToWatchlist);

// 관심종목에서 제거
router.delete('/:id', watchlistController.removeFromWatchlist);

// 관심종목 통계
router.get('/stats', watchlistController.getWatchlistStats);

// 특정 종목의 관심종목 상태 확인
router.get('/check/:market/:ticker', watchlistController.checkWatchlistStatus);

module.exports = router; 
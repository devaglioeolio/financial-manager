const express = require('express');
const router = express.Router();
const trendsController = require('../controllers/trendsController');
const auth = require('../middleware/auth');

// 사용자 보유 종목의 트렌드 분석 (임시로 인증 제거)
router.get('/user-stocks', trendsController.getUserStockTrends);

// 특정 키워드의 트렌드 데이터 조회
router.get('/keyword/:keyword', trendsController.getKeywordTrend);

// 여러 키워드 비교
router.post('/compare', trendsController.compareKeywords);

// 상관관계 계산
router.post('/correlation', trendsController.calculateCorrelation);

module.exports = router; 
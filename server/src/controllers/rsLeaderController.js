const relativeStrengthService = require('../services/relativeStrengthService');

/**
 * 시장 리더 조회
 */
exports.getMarketLeaders = async (req, res) => {
  try {
    const { market = 'NAS', limit = 50 } = req.query;
    
    // 유효한 시장 코드인지 확인
    const validMarkets = ['NAS', 'NYS', 'AMS', 'TSE', 'HKS', 'SHS', 'SZS'];
    if (!validMarkets.includes(market)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 시장 코드입니다.'
      });
    }
    
    const leaders = await relativeStrengthService.getMarketLeaders(market, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        market: market,
        leaders: leaders,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('시장 리더 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '시장 리더 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 고급 주도주 스크리닝
 */
exports.getAdvancedLeaders = async (req, res) => {
  try {
    const { market = 'NAS' } = req.query;
    
    // 스크리닝 기준 설정
    const criteria = {
      minRS: parseFloat(req.query.minRS) || 5,
      minVolume: parseInt(req.query.minVolume) || 1000000,
      minPrice: parseFloat(req.query.minPrice) || 10,
      maxPrice: parseFloat(req.query.maxPrice) || 1000,
      minDailyGain: parseFloat(req.query.minDailyGain) || 2,
      limit: parseInt(req.query.limit) || 30
    };
    
    const leaders = await relativeStrengthService.getAdvancedLeaders(market, criteria);
    
    res.json({
      success: true,
      data: {
        market: market,
        criteria: criteria,
        leaders: leaders,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('고급 주도주 스크리닝 오류:', error);
    res.status(500).json({
      success: false,
      message: '고급 주도주 스크리닝 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 모든 시장의 상위 RS 종목 조회
 */
exports.getAllMarketsTopRS = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const markets = ['NAS', 'NYS', 'AMS'];
    
    const allLeaders = {};
    
    for (const market of markets) {
      try {
        const leaders = await relativeStrengthService.getMarketLeaders(market, parseInt(limit));
        allLeaders[market] = leaders;
      } catch (error) {
        console.error(`${market} 시장 리더 조회 오류:`, error);
        allLeaders[market] = [];
      }
    }
    
    res.json({
      success: true,
      data: {
        markets: allLeaders,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('전체 시장 RS 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '전체 시장 RS 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * RS 계산 수동 트리거
 */
exports.triggerRSCalculation = async (req, res) => {
  try {
    // 백그라운드에서 RS 계산 시작
    relativeStrengthService.triggerRSCalculation()
      .catch(error => {
        console.error('RS 계산 실행 오류:', error);
      });
    
    res.json({
      success: true,
      message: 'RS 계산이 백그라운드에서 시작되었습니다.',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('RS 계산 트리거 오류:', error);
    res.status(500).json({
      success: false,
      message: 'RS 계산 트리거 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 시장별 RS 통계 조회
 */
exports.getMarketRSStats = async (req, res) => {
  try {
    const { market = 'NAS' } = req.query;
    
    const StockPriceHistory = require('../models/StockPriceHistory');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 시장 통계 계산
    const stats = await StockPriceHistory.aggregate([
      {
        $match: {
          market: market,
          date: today,
          relativeStrength: { $ne: 0 }
        }
      },
      {
        $group: {
          _id: null,
          totalStocks: { $sum: 1 },
          avgRS: { $avg: '$relativeStrength' },
          maxRS: { $max: '$relativeStrength' },
          minRS: { $min: '$relativeStrength' },
          positiveRS: {
            $sum: {
              $cond: { if: { $gt: ['$relativeStrength', 0] }, then: 1, else: 0 }
            }
          },
          negativeRS: {
            $sum: {
              $cond: { if: { $lt: ['$relativeStrength', 0] }, then: 1, else: 0 }
            }
          }
        }
      }
    ]);
    
    const result = stats.length > 0 ? stats[0] : {
      totalStocks: 0,
      avgRS: 0,
      maxRS: 0,
      minRS: 0,
      positiveRS: 0,
      negativeRS: 0
    };
    
    res.json({
      success: true,
      data: {
        market: market,
        stats: {
          totalStocks: result.totalStocks,
          avgRS: Math.round(result.avgRS * 100) / 100,
          maxRS: Math.round(result.maxRS * 100) / 100,
          minRS: Math.round(result.minRS * 100) / 100,
          positiveRS: result.positiveRS,
          negativeRS: result.negativeRS,
          positivePercentage: result.totalStocks > 0 ? Math.round((result.positiveRS / result.totalStocks) * 100) : 0
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('시장 RS 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '시장 RS 통계 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}; 
const simpleRSService = require('../services/simpleRSService');

/**
 * RS 리더 조회
 */
exports.getTopRS = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const result = simpleRSService.getTopRS(parseInt(limit));
    
    res.json({
      success: true,
      data: {
        leaders: result.leaders,
        totalCount: result.totalCount,
        lastUpdate: result.lastUpdate,
        message: result.message
      }
    });
    
  } catch (error) {
    console.error('RS 리더 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: 'RS 리더 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 고급 필터링 RS 리더 조회
 */
exports.getAdvancedRS = async (req, res) => {
  try {
    const criteria = {
      minRS: parseFloat(req.query.minRS) || 0,
      minPrice: parseFloat(req.query.minPrice) || 0,
      maxPrice: parseFloat(req.query.maxPrice) || 10000,
      minDailyGain: parseFloat(req.query.minDailyGain) || -100,
      limit: parseInt(req.query.limit) || 30
    };
    
    const result = simpleRSService.getAdvancedRS(criteria);
    
    res.json({
      success: true,
      data: {
        leaders: result.leaders,
        criteria: result.criteria,
        totalCount: result.totalCount,
        lastUpdate: result.lastUpdate,
        message: result.message
      }
    });
    
  } catch (error) {
    console.error('고급 RS 필터링 오류:', error);
    res.status(500).json({
      success: false,
      message: '고급 RS 필터링 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * RS 통계 조회
 */
exports.getStats = async (req, res) => {
  try {
    const stats = simpleRSService.getStats();
    
    res.json({
      success: true,
      data: {
        stats: stats
      }
    });
    
  } catch (error) {
    console.error('RS 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: 'RS 통계 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * RS 계산 수동 트리거
 */
exports.triggerCalculation = async (req, res) => {
  try {
    // 백그라운드에서 RS 계산 시작
    simpleRSService.triggerCalculation()
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
 * 서비스 상태 조회
 */
exports.getServiceStatus = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        isRunning: true,
        dataCount: simpleRSService.rsData.size,
        lastUpdate: simpleRSService.lastUpdate,
        isCalculating: simpleRSService.isCalculating
      }
    });
    
  } catch (error) {
    console.error('서비스 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서비스 상태 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}; 
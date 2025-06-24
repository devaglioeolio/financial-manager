const StockCode = require('../models/StockCode');

// 종목 검색 (티커 또는 회사명으로)
exports.searchStocks = async (req, res) => {
  try {
    const { query, market, limit = 20, exact = false } = req.query;
    
    console.log('종목 검색 요청:', { query, market, limit, exact });
    
    if (!query || query.length < 1) {
      return res.status(400).json({
        success: false,
        message: '검색어를 입력해주세요. (최소 1글자)'
      });
    }
    
    // 먼저 전체 종목 수 확인
    const totalCount = await StockCode.countDocuments();
    console.log('전체 종목 수:', totalCount);
    
    if (totalCount === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: '종목 데이터가 없습니다. 데이터를 import 해주세요.',
        query: query
      });
    }
    
    // 검색 조건 구성
    const searchCondition = {
      isActive: true
    };
    
    // 시장 필터
    if (market && ['NAS', 'NYS', 'AMS'].includes(market.toUpperCase())) {
      searchCondition.market = market.toUpperCase();
    }
    
    let results = [];
    
    // exact=true인 경우 정확한 티커 매칭만 수행
    if (exact === 'true' || exact === true) {
      const exactMatch = await StockCode.findOne({
        ...searchCondition,
        ticker: query.toUpperCase()
      }).select('market ticker koreanName englishName stockType');
      
      if (exactMatch) {
        results = [exactMatch];
      }
    } else {
      // 단순화된 검색 - 하나의 조건으로 통합
      const searchPattern = {
        ...searchCondition,
        $or: [
          { ticker: { $regex: query.toUpperCase(), $options: 'i' } },
          { englishName: { $regex: query, $options: 'i' } },
          { koreanName: { $regex: query, $options: 'i' } }
        ]
      };
      
      console.log('검색 조건:', JSON.stringify(searchPattern, null, 2));
      
      results = await StockCode.find(searchPattern)
        .limit(parseInt(limit))
        .sort({ ticker: 1 })
        .select('market ticker koreanName englishName stockType');
    }
    
    console.log('검색 결과 수:', results.length);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      query: query,
      exact: exact === 'true' || exact === true
    });
    
  } catch (error) {
    console.error('종목 검색 에러:', error);
    res.status(500).json({
      success: false,
      message: '종목 검색 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 특정 종목 상세 조회
exports.getStockDetail = async (req, res) => {
  try {
    const { market, ticker } = req.params;
    
    const stock = await StockCode.findOne({
      market: market.toUpperCase(),
      ticker: ticker.toUpperCase(),
      isActive: true
    });
    
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: '해당 종목을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      data: stock
    });
    
  } catch (error) {
    console.error('종목 상세 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '종목 상세 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 시장별 종목 수 통계
exports.getMarketStats = async (req, res) => {
  try {
    const stats = await StockCode.aggregate([
      { $match: { isActive: true } },
      { 
        $group: {
          _id: '$market',
          count: { $sum: 1 },
          stockCount: { 
            $sum: { 
              $cond: [{ $eq: ['$stockType', '2'] }, 1, 0] 
            }
          },
          etfCount: { 
            $sum: { 
              $cond: [{ $eq: ['$stockType', '3'] }, 1, 0] 
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      data: stats,
      total: stats.reduce((sum, stat) => sum + stat.count, 0)
    });
    
  } catch (error) {
    console.error('시장 통계 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '시장 통계 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 인기 종목 조회 (자주 검색되는 종목들)
exports.getPopularStocks = async (req, res) => {
  try {
    const { market, limit = 10 } = req.query;
    
    const searchCondition = { isActive: true };
    if (market && ['NAS', 'NYS', 'AMS'].includes(market.toUpperCase())) {
      searchCondition.market = market.toUpperCase();
    }
    
    // 유명한 종목들 (하드코딩)
    const popularTickers = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'AMD', 'INTC'];
    
    const stocks = await StockCode.find({
      ...searchCondition,
      ticker: { $in: popularTickers }
    })
    .limit(parseInt(limit))
    .sort({ ticker: 1 })
    .select('market ticker koreanName englishName stockType');
    
    res.json({
      success: true,
      data: stocks,
      count: stocks.length
    });
    
  } catch (error) {
    console.error('인기 종목 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '인기 종목 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}; 
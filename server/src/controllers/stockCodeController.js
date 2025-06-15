const StockCode = require('../models/StockCode');

// 종목 검색 (티커 또는 회사명으로)
exports.searchStocks = async (req, res) => {
  try {
    const { query, market, limit = 20, exact = false } = req.query;
    
    if (!query || query.length < 1) {
      return res.status(400).json({
        success: false,
        message: '검색어를 입력해주세요. (최소 1글자)'
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
      // 기존 부분 검색 로직
      const searchOptions = [
        // 정확한 티커 매칭 (우선순위 높음)
        { ...searchCondition, ticker: query.toUpperCase() },
        
        // 티커 시작 부분 매칭
        { ...searchCondition, ticker: { $regex: `^${query.toUpperCase()}`, $options: 'i' } },
        
        // 영어 회사명 검색
        { ...searchCondition, englishName: { $regex: query, $options: 'i' } },
        
        // 한글 회사명 검색 (있는 경우)
        { ...searchCondition, koreanName: { $regex: query, $options: 'i' } }
      ];
      
      const seenTickers = new Set();
      
      // 각 검색 조건별로 결과 수집 (중복 제거)
      for (const condition of searchOptions) {
        const stocks = await StockCode.find(condition)
          .limit(parseInt(limit))
          .sort({ ticker: 1 })
          .select('market ticker koreanName englishName stockType');
        
        for (const stock of stocks) {
          const key = `${stock.market}-${stock.ticker}`;
          if (!seenTickers.has(key)) {
            seenTickers.add(key);
            results.push(stock);
          }
        }
        
        if (results.length >= parseInt(limit)) break;
      }
      
      results = results.slice(0, parseInt(limit));
    }
    
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
    if (market && ['NASDAQ', 'NYSE', 'AMEX'].includes(market.toUpperCase())) {
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
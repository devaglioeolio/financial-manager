const GoogleTrendsService = require('../services/googleTrendsService');

// 사용자 보유 종목의 트렌드 분석
exports.getUserStockTrends = async (req, res) => {
  try {
    console.log('트렌드 분석 API 호출됨');
    
    // 임시 테스트용: 사용자 ID가 없으면 더미 분석 실행
    let userId = req.user?._id;
    
    if (!userId) {
      console.log('인증되지 않은 사용자 - 더미 분석 실행');
      // 더미 데이터로 분석 결과 반환
      const dummyAnalysis = await GoogleTrendsService.analyzeDummyStocks();
      
      return res.json({
        success: true,
        data: dummyAnalysis
      });
    }
    
    console.log(`사용자 ID: ${userId}`);
    
    const analysis = await GoogleTrendsService.analyzeUserStockTrends(userId);
    
    console.log('트렌드 분석 완료');
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('사용자 주식 트렌드 분석 실패:', error);
    res.status(500).json({
      success: false,
      message: '트렌드 분석 중 오류가 발생했습니다.',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// 특정 키워드의 트렌드 데이터 조회
exports.getKeywordTrend = async (req, res) => {
  try {
    const { keyword } = req.params;
    const { timeframe = 'today 12-m', geo = 'KR' } = req.query;
    
    console.log(`키워드 트렌드 검색: ${keyword}`);
    
    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '키워드를 입력해주세요.'
      });
    }
    
    const trendData = await GoogleTrendsService.getTrendData(keyword, timeframe, geo);
    const relatedKeywords = await GoogleTrendsService.getRelatedKeywords(keyword, geo);
    
    console.log(`키워드 검색 완료: ${keyword}, 데이터 ${trendData.length}개`);
    
    res.json({
      success: true,
      data: {
        keyword,
        trendData,
        relatedKeywords,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('키워드 트렌드 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '키워드 트렌드 조회 중 오류가 발생했습니다.',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// 여러 키워드 비교
exports.compareKeywords = async (req, res) => {
  try {
    const { keywords } = req.body;
    const { timeframe = 'today 12-m', geo = 'KR' } = req.query;
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        message: '비교할 키워드 배열을 입력해주세요.'
      });
    }
    
    if (keywords.length > 5) {
      return res.status(400).json({
        success: false,
        message: '최대 5개의 키워드까지 비교할 수 있습니다.'
      });
    }
    
    const comparisonData = await GoogleTrendsService.compareKeywords(keywords, timeframe, geo);
    
    res.json({
      success: true,
      data: {
        keywords,
        comparisonData,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('키워드 비교 실패:', error);
    res.status(500).json({
      success: false,
      message: '키워드 비교 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

// 상관관계 계산
exports.calculateCorrelation = async (req, res) => {
  try {
    const { keyword, priceData } = req.body;
    
    if (!keyword || !priceData || !Array.isArray(priceData)) {
      return res.status(400).json({
        success: false,
        message: '키워드와 가격 데이터를 입력해주세요.'
      });
    }
    
    // 트렌드 데이터 가져오기
    const trendData = await GoogleTrendsService.getTrendData(keyword);
    
    // 날짜 기준으로 데이터 매칭
    const matchedData = [];
    const trendMap = new Map();
    
    trendData.forEach(trend => {
      trendMap.set(trend.date, trend.value);
    });
    
    priceData.forEach(price => {
      if (trendMap.has(price.date)) {
        matchedData.push({
          date: price.date,
          trendValue: trendMap.get(price.date),
          priceValue: price.value
        });
      }
    });
    
    if (matchedData.length < 10) {
      return res.status(400).json({
        success: false,
        message: '상관관계 계산을 위한 충분한 데이터가 없습니다. (최소 10개 필요)'
      });
    }
    
    // 상관관계 계산
    const trendValues = matchedData.map(d => d.trendValue);
    const priceValues = matchedData.map(d => d.priceValue);
    const correlation = GoogleTrendsService.calculateCorrelation(trendValues, priceValues);
    
    // 상관관계 해석
    let interpretation = '';
    if (Math.abs(correlation) >= 0.7) {
      interpretation = '강한 상관관계';
    } else if (Math.abs(correlation) >= 0.4) {
      interpretation = '중간 상관관계';
    } else if (Math.abs(correlation) >= 0.2) {
      interpretation = '약한 상관관계';
    } else {
      interpretation = '상관관계 없음';
    }
    
    res.json({
      success: true,
      data: {
        keyword,
        correlation: Math.round(correlation * 1000) / 1000,
        interpretation,
        direction: correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'none',
        dataPoints: matchedData.length,
        matchedData,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('상관관계 계산 실패:', error);
    res.status(500).json({
      success: false,
      message: '상관관계 계산 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}; 
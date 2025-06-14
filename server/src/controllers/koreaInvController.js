const koreaInvestmentService = require('../services/koreaInvestment');

/**
 * 한국투자증권 API 컨트롤러
 * Route → Controller → Service 패턴 적용
 */

/**
 * 해외주식 기간별 시세 조회
 */
exports.getOverseasChart = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = 'D', startDate = '', endDate = '' } = req.query;

    // 입력값 검증
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: '종목코드(symbol)가 필요합니다.'
      });
    }

    // 기간 코드 검증
    const validPeriods = ['D', 'W', 'M'];
    if (!validPeriods.includes(period.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 기간 코드입니다. (D: 일봉, W: 주봉, M: 월봉)'
      });
    }

    // 한국투자증권 API 호출
    const result = await koreaInvestmentService.getOverseasDailyChart(symbol.toUpperCase(), period.toUpperCase(), startDate, endDate);

    res.json({
      success: true,
      data: result,
      message: '해외주식 기간별 시세 조회 성공'
    });

  } catch (error) {
    console.error('해외주식 기간별 시세 조회 에러:', error.message);
    res.status(500).json({
      success: false,
      message: '해외주식 기간별 시세 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 해외주식 현재가 조회
 */
exports.getOverseasPrice = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { excd = 'NAS' } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: '종목코드(symbol)가 필요합니다.'
      });
    }

    // 거래소 코드 검증
    const validExchanges = ['NAS', 'NYS', 'AMS', 'TSE', 'HKS', 'SHS', 'SZS','BAY','BAQ','BAA'];
    if (!validExchanges.includes(excd.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 거래소 코드입니다. (NAS: 나스닥, NYS: 뉴욕 등)'
      });
    }

    // 한국투자증권 API 호출
    const result = await koreaInvestmentService.getOverseasCurrentPrice(symbol.toUpperCase(), excd.toUpperCase());

    res.json({
      success: true,
      data: result,
      message: '해외주식 현재가 조회 성공'
    });

  } catch (error) {
    console.error('해외주식 현재가 조회 에러:', error.message);
    res.status(500).json({
      success: false,
      message: '해외주식 현재가 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 여러 종목의 기간별 시세 일괄 조회
 */
exports.getBatchOverseasChart = async (req, res) => {
  try {
    const { symbols, period = 'D', startDate = '', endDate = '' } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        message: '종목코드 배열(symbols)이 필요합니다.'
      });
    }

    if (symbols.length > 10) {
      return res.status(400).json({
        success: false,
        message: '한 번에 조회할 수 있는 종목은 최대 10개입니다.'
      });
    }

    const results = [];
    const errors = [];

    // 순차적으로 API 호출 (API 제한 고려)
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      try {
        console.log(`[${i + 1}/${symbols.length}] ${symbol} 조회 중...`);
        
        const result = await koreaInvestmentService.getOverseasDailyChart(symbol.toUpperCase(), period.toUpperCase(), startDate, endDate);
        results.push(result);
        
        // API 제한 방지를 위한 지연 (마지막 요청 제외)
        if (i < symbols.length - 1) {
          console.log('API 제한 방지를 위해 1초 대기...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
        }
      } catch (error) {
        console.error(`${symbol} 조회 실패:`, error.message);
        errors.push({
          symbol: symbol,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: results,
      errors: errors,
      totalRequested: symbols.length,
      successCount: results.length,
      errorCount: errors.length,
      message: `${results.length}개 종목 기간별 시세 조회 완료`
    });

  } catch (error) {
    console.error('일괄 기간별 시세 조회 에러:', error.message);
    res.status(500).json({
      success: false,
      message: '일괄 기간별 시세 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 여러 종목의 현재가 일괄 조회
 */
exports.getBatchOverseasPrice = async (req, res) => {
  try {
    const { symbols, excd = 'NAS' } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        message: '종목코드 배열(symbols)이 필요합니다.'
      });
    }

    if (symbols.length > 20) {
      return res.status(400).json({
        success: false,
        message: '한 번에 조회할 수 있는 종목은 최대 20개입니다.'
      });
    }

    const results = [];
    const errors = [];

    // 순차적으로 API 호출
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      try {
        console.log(`[${i + 1}/${symbols.length}] ${symbol} 현재가 조회 중...`);
        
        const result = await koreaInvestmentService.getOverseasCurrentPrice(symbol.toUpperCase(), excd.toUpperCase());
        results.push(result);
        
        // API 제한 방지를 위한 지연
        if (i < symbols.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 대기
        }
      } catch (error) {
        console.error(`${symbol} 현재가 조회 실패:`, error.message);
        errors.push({
          symbol: symbol,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: results,
      errors: errors,
      totalRequested: symbols.length,
      successCount: results.length,
      errorCount: errors.length,
      message: `${results.length}개 종목 현재가 조회 완료`
    });

  } catch (error) {
    console.error('일괄 현재가 조회 에러:', error.message);
    res.status(500).json({
      success: false,
      message: '일괄 현재가 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 해외 주식 수익률 계산
 * @param {Array} assets - 자산 데이터
 * @param {string} mode - "realtime" 또는 "snapshot"
 * @returns {Array} 수익률이 계산된 자산 배열
 */
const calculateForeignStockReturns = async (assets, mode = 'snapshot') => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - (1 * 24 * 60 * 60 * 1000));
    
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };
    
    const yesterdayStr = formatDate(yesterday);
    const todayStr = formatDate(today);

    // 해외주식 필터링 - 원래 조건으로 복원
    const foreignStocks = assets.filter(asset => {
      const ticker = asset.details?.get ? asset.details.get('ticker') : asset.details?.ticker;
      
      return asset.mainCategory === 'STOCK' && 
             asset.subCategory === 'FOREIGN' &&
             asset.details && 
             ticker;
    });

    const results = [];

    for (const asset of foreignStocks) {
      const ticker = asset.details?.get ? asset.details.get('ticker') : asset.details?.ticker;
      const exchangeCode = asset.details?.get ? asset.details.get('exchangeCode') : asset.details?.exchangeCode;

      try {
        let stockData;
        let currentPrice;
        
        if (mode === 'realtime') {
          // 실시간 모드: 현재가 조회
          stockData = await koreaInvestmentService.getOverseasCurrentPrice(ticker, exchangeCode || 'NAS');
          currentPrice = stockData.price;
        } else {
          // 스냅샷 모드: 일일 차트 데이터로 어제 종가 가져오기
          stockData = await koreaInvestmentService.getOverseasDailyChart(ticker, 'D', yesterdayStr, todayStr);
          
          if (stockData.basicData && stockData.basicData.length > 0) {
            const currentData = stockData.basicData[0];
            currentPrice = currentData.close;
          } else {
            throw new Error('기간별 시세 데이터가 없습니다.');
          }
        }

        // 평균매수가 (USD)
        const avgPurchasePrice = asset.getAveragePurchasePriceInOriginal();
        
        // 현재 가치 계산
        const currentValue = asset.totalQuantity * currentPrice;
        const purchaseValue = asset.totalQuantity * avgPurchasePrice;
        
        // 손익 계산
        const unrealizedGain = currentValue - purchaseValue;
        const returnRate = purchaseValue > 0 ? (unrealizedGain / purchaseValue) * 100 : 0;
        
        results.push({
          assetId: asset._id,
          name: asset.name,
          symbol: ticker,
          quantity: asset.totalQuantity,
          avgPurchasePrice: avgPurchasePrice,
          currentPrice: currentPrice,
          currentValue: currentValue,
          purchaseValue: purchaseValue,
          unrealizedGain: unrealizedGain,
          returnRate: returnRate,
          change: mode === 'realtime' ? stockData.change : (stockData.basicData[0]?.change || 0),
          changePercent: mode === 'realtime' ? stockData.changePercent : (stockData.basicData[0]?.change_percent || 0),
          currency: 'USD',
          lastUpdate: new Date().toISOString()
        });
        
      } catch (stockError) {
        results.push({
          assetId: asset._id,
          name: asset.name,
          symbol: ticker,
          error: stockError.message
        });
      }
    }

    return results;
  } catch (error) {
    throw error;
  }
};

/**
 * API 상태 확인
 */
exports.healthCheck = (req, res) => {
  res.json({
    success: true,
    message: '한국투자증권 API 서비스 정상 작동 중',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
};

// 함수를 내보내기
exports.calculateForeignStockReturns = calculateForeignStockReturns;

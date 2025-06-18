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
 * @param {string} targetDate - 스냅샷 모드일 때 조회할 특정 날짜 (YYYY-MM-DD)
 * @returns {Array} 수익률이 계산된 자산 배열
 */
const calculateForeignStockReturns = async (assets, mode = 'snapshot', targetDate = null) => {
  try {
    console.log(`=== calculateForeignStockReturns ===`);
    console.log(`mode: ${mode}, targetDate: ${targetDate}`);
    
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };
    
    // 날짜 계산 로직 개선
    let queryStartDate, queryEndDate;
    
    if (mode === 'realtime') {
      // 실시간 모드: 날짜 불필요
      queryStartDate = null;
      queryEndDate = null;
    } else {
      // 스냅샷 모드: 특정 날짜 또는 어제 날짜 사용
      if (targetDate) {
        // 특정 날짜가 주어진 경우 (YYYY-MM-DD -> YYYYMMDD)
        queryEndDate = targetDate.replace(/-/g, '');
        // 시작 날짜는 해당 날짜로 설정 (단일 날짜 조회)
        queryStartDate = queryEndDate;
      } else {
        // 기본값: 어제 날짜
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - (1 * 24 * 60 * 60 * 1000));
        queryStartDate = formatDate(yesterday);
        queryEndDate = formatDate(today);
      }
    }
    
    console.log(`Date range: ${queryStartDate} ~ ${queryEndDate}`);

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
      const market = asset.details?.get ? asset.details.get('market') : asset.details?.market;

      try {
        let stockData;
        let currentPrice;
        
        if (mode === 'realtime') {
          // 실시간 모드: 현재가 조회
          console.log(`${ticker} 현재가 조회 중...`);
          stockData = await koreaInvestmentService.getOverseasCurrentPrice(ticker, market || 'NAS');
          currentPrice = stockData.price;
        } else {
          // 스냅샷 모드: 특정 날짜의 종가 가져오기
          console.log(`${ticker} 종가 조회 중 (${queryStartDate} ~ ${queryEndDate})...`);
          stockData = await koreaInvestmentService.getOverseasDailyChart(ticker, 'D', queryStartDate, queryEndDate);
          
          if (stockData.basicData && stockData.basicData.length > 0) {
            // 가장 최근 데이터 사용 (보통 마지막 요소가 최신)
            const latestData = stockData.basicData[stockData.basicData.length - 1];
            currentPrice = latestData.close;
            console.log(`${ticker} 종가: $${currentPrice} (날짜: ${queryEndDate})`);
          } else {
            throw new Error(`${queryEndDate} 날짜의 시세 데이터가 없습니다.`);
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
 * 웹소켓 인증키 조회
 * 보안 고려사항: 인증된 사용자만 접근 가능, 토큰 마스킹 적용
 */
exports.getWebsocketToken = async (req, res) => {
  try {
    // 추가 보안 체크: 사용자 세션 확인
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: '인증되지 않은 사용자입니다.'
      });
    }

    const tokenManager = require('../services/koreaInvestmentToken');
    const websocketToken = await tokenManager.getWebsocketToken();

    if (!websocketToken) {
      return res.status(500).json({
        success: false,
        message: '웹소켓 인증키를 가져올 수 없습니다.'
      });
    }

    // 토큰 마스킹 (보안 강화)
    const maskedToken = websocketToken.length > 10 
      ? websocketToken.substring(0, 6) + '*'.repeat(websocketToken.length - 10) + websocketToken.substring(websocketToken.length - 4)
      : websocketToken;

    // 응답 헤더에 보안 관련 정보 추가 (JSON 응답 전에 설정)
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    console.log(`웹소켓 토큰 제공 (사용자: ${req.user.id}): ${maskedToken}`);

    res.json({
      success: true,
      data: {
        approvalKey: websocketToken, // 실제 사용을 위해 전체 토큰 제공
        maskedKey: maskedToken // 로그용 마스킹된 토큰
      },
      message: '웹소켓 인증키 조회 성공'
    });

  } catch (error) {
    console.error('웹소켓 인증키 조회 에러:', error.message);
    res.status(500).json({
      success: false,
      message: '웹소켓 인증키 조회 중 오류가 발생했습니다.',
      error: error.message
    });
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

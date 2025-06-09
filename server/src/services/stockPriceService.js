const axios = require('axios');

/**
 * Alpha Vantage API를 사용한 해외주식 실시간 가격 조회 서비스
 * 무료 API: https://www.alphavantage.co/
 * 제한사항: 분당 5회, 일일 100회 요청 제한
 */

// 주요 주식 심볼 매핑 (한글명 -> 심볼)
const STOCK_SYMBOL_MAPPING = {
  'Apple': 'AAPL',
  'Tesla': 'TSLA',
  'Microsoft': 'MSFT',
  'Amazon': 'AMZN',
  '구글(GOOGL)': 'GOOGL',
  'Meta': 'META',
  'Netflix': 'NFLX',
  '엔비디아(NVDA)': 'NVDA',
  'AMD': 'AMD',
  'Intel': 'INTC',
  'Boeing': 'BA',
  'Coca-Cola': 'KO',
  'Disney': 'DIS',
  'McDonald': 'MCD',
  'Nike': 'NKE',
  'Visa': 'V',
  'Mastercard': 'MA',
  '제이피모건(JPM)': 'JPM',
  'Bank of America': 'BAC',
  'Wells Fargo': 'WFC',
  '콘스텔레이션 에너지(CEG)': 'CEG'
};

/**
 * 주식명에서 심볼 추출
 */
const getStockSymbol = (stockName) => {
  // 직접 매핑된 경우
  if (STOCK_SYMBOL_MAPPING[stockName]) {
    return STOCK_SYMBOL_MAPPING[stockName];
  }
  
  // 부분 매칭 시도
  for (const [name, symbol] of Object.entries(STOCK_SYMBOL_MAPPING)) {
    if (stockName.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(stockName.toLowerCase())) {
      return symbol;
    }
  }
  
  // 매핑되지 않은 경우 그대로 반환 (사용자가 직접 심볼 입력한 경우)
  return stockName.toUpperCase();
};

/**
 * Alpha Vantage API에서 실시간 주가 조회
 */
const fetchRealTimeStockPrice = async (symbol) => {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_APIKEY;
    if (!apiKey) {
      throw new Error('ALPHA_VANTAGE_APIKEY가 환경변수에 설정되지 않았습니다.');
    }

    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    
    console.log(`주식 API 호출: ${symbol}`);
    
    const response = await axios.get(url);
    const data = response.data;
    
    // API 에러 체크
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage API 에러: ${data['Error Message']}`);
    }
    
    if (data['Note']) {
      throw new Error('API 호출 제한 초과. 잠시 후 다시 시도해주세요.');
    }
    
    const quote = data['Global Quote'];
    if (!quote) {
      throw new Error(`${symbol} 주식 데이터를 찾을 수 없습니다.`);
    }
    
    console.log(quote);

    return {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: quote['10. change percent'].replace('%', ''),
      previousClose: parseFloat(quote['08. previous close']),
      open: parseFloat(quote['02. open']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      volume: parseInt(quote['06. volume']),
      latestTradingDay: quote['07. latest trading day']
    };
    
  } catch (error) {
    console.error(`${symbol} 주가 조회 실패:`, error.message);
    throw error;
  }
};

/**
 * 여러 주식의 실시간 가격을 일괄 조회
 * (API 제한 때문에 순차 호출, 지연 추가)
 */
const fetchMultipleStockPrices = async (symbols) => {
  const results = [];
  
  for (let i = 0; i < symbols.length; i++) {
    try {
      const price = await fetchRealTimeStockPrice(symbols[i]);
      results.push(price);
      
      // API 제한 방지를 위한 지연 (분당 5회 제한)
      if (i < symbols.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 12000)); // 12초 대기
      }
    } catch (error) {
      console.error(`${symbols[i]} 주가 조회 실패:`, error.message);
      results.push({
        symbol: symbols[i],
        error: error.message
      });
    }
  }
  
  return results;
};

/**
 * 보유 해외주식의 실시간 수익률 계산
 */
const calculateStockReturns = async (assets) => {
  try {
    // 해외주식 필터링
    const foreignStocks = assets.filter(asset => 
      asset.mainCategory === 'STOCK' && asset.subCategory === 'FOREIGN'
    );
    
    if (foreignStocks.length === 0) {
      return [];
    }
    
    const results = [];
    
    for (const stock of foreignStocks) {
      try {
        const symbol = getStockSymbol(stock.name);
        const currentPrice = await fetchRealTimeStockPrice(symbol);
        
        // 평균매수가 (USD)
        const avgPurchasePrice = stock.getAveragePurchasePriceInOriginal();
        
        // 현재 가치 계산
        const currentValue = stock.totalQuantity * currentPrice.price;
        const purchaseValue = stock.totalQuantity * avgPurchasePrice;
        
        // 손익 계산
        const unrealizedGain = currentValue - purchaseValue;
        const returnRate = (unrealizedGain / purchaseValue) * 100;
        
        results.push({
          assetId: stock._id,
          name: stock.name,
          symbol: symbol,
          quantity: stock.totalQuantity,
          avgPurchasePrice: avgPurchasePrice,
          currentPrice: currentPrice.price,
          currentValue: currentValue,
          purchaseValue: purchaseValue,
          unrealizedGain: unrealizedGain,
          returnRate: returnRate,
          change: currentPrice.change,
          changePercent: parseFloat(currentPrice.changePercent),
          lastUpdate: new Date().toISOString()
        });
        
        // API 제한 방지 지연
        await new Promise(resolve => setTimeout(resolve, 12000));
        
      } catch (error) {
        console.error(`${stock.name} 수익률 계산 실패:`, error.message);
        results.push({
          assetId: stock._id,
          name: stock.name,
          error: error.message
        });
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('주식 수익률 계산 실패:', error.message);
    throw error;
  }
};

module.exports = {
  fetchRealTimeStockPrice,
  fetchMultipleStockPrices,
  calculateStockReturns,
  getStockSymbol,
  STOCK_SYMBOL_MAPPING
}; 
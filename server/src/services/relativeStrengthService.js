const StockPriceHistory = require('../models/StockPriceHistory');
const cron = require('node-cron');

class RelativeStrengthService {
  constructor() {
    this.isCalculating = false;
    this.marketIndices = new Map(); // 시장 지수 저장
    this.setupScheduler();
  }

  /**
   * 스케줄러 설정 (매일 장 마감 후 계산)
   */
  setupScheduler() {
    // 매일 오후 10시 30분에 RS 계산 실행 (미국 시장 마감 후)
    cron.schedule('30 22 * * *', async () => {
      console.log('🚀 RS 계산 스케줄러 실행');
      await this.calculateAllRS();
    });
  }

  /**
   * 모든 시장의 RS 계산
   */
  async calculateAllRS() {
    if (this.isCalculating) {
      console.log('이미 RS 계산 진행 중...');
      return;
    }

    this.isCalculating = true;
    
    try {
      const markets = ['NAS', 'NYS', 'AMS'];
      
      for (const market of markets) {
        console.log(`📊 ${market} 시장 RS 계산 시작`);
        await this.calculateMarketRS(market);
      }
      
      console.log('✅ 모든 시장 RS 계산 완료');
    } catch (error) {
      console.error('❌ RS 계산 실패:', error);
    } finally {
      this.isCalculating = false;
    }
  }

  /**
   * 특정 시장의 RS 계산
   */
  async calculateMarketRS(market) {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // 해당 시장의 모든 종목 데이터 가져오기
    const stockData = await StockPriceHistory.getMarketData(market, thirtyDaysAgo, today);
    
    if (stockData.length === 0) {
      console.log(`${market} 시장 데이터가 없습니다.`);
      return;
    }

    // 종목별로 그룹화
    const groupedBySymbol = this.groupBySymbol(stockData);
    
    // 시장 지수 계산 (평균 성과)
    const marketPerformance = this.calculateMarketPerformance(groupedBySymbol);
    
    // 각 종목의 RS 계산
    const rsResults = [];
    
    for (const [symbol, prices] of Object.entries(groupedBySymbol)) {
      if (prices.length < 2) continue;
      
      const rs = this.calculateRS(prices, marketPerformance);
      
      if (rs !== null) {
        rsResults.push({
          symbol,
          rs,
          pricePerformance: this.calculatePricePerformance(prices),
          latestPrice: prices[prices.length - 1]
        });
      }
    }

    // RS 순위 매기기
    rsResults.sort((a, b) => b.rs - a.rs);
    
    // 데이터베이스에 RS 결과 저장
    await this.saveRSResults(rsResults, market);
    
    console.log(`${market} 시장 RS 계산 완료: ${rsResults.length}개 종목`);
  }

  /**
   * 종목별로 데이터 그룹화
   */
  groupBySymbol(stockData) {
    const grouped = {};
    
    stockData.forEach(stock => {
      if (!grouped[stock.symbol]) {
        grouped[stock.symbol] = [];
      }
      grouped[stock.symbol].push(stock);
    });
    
    return grouped;
  }

  /**
   * 시장 평균 성과 계산
   */
  calculateMarketPerformance(groupedBySymbol) {
    const performances = [];
    
    for (const [symbol, prices] of Object.entries(groupedBySymbol)) {
      if (prices.length < 2) continue;
      
      const firstPrice = prices[0].closePrice;
      const lastPrice = prices[prices.length - 1].closePrice;
      const performance = ((lastPrice - firstPrice) / firstPrice) * 100;
      
      performances.push(performance);
    }
    
    return performances.length > 0 ? performances.reduce((sum, p) => sum + p, 0) / performances.length : 0;
  }

  /**
   * RS (Relative Strength) 계산
   */
  calculateRS(prices, marketPerformance) {
    if (prices.length < 2) return null;
    
    const periods = [5, 10, 20, 30]; // 다양한 기간의 성과 계산
    let totalRS = 0;
    let validPeriods = 0;
    
    for (const period of periods) {
      if (prices.length < period + 1) continue;
      
      const startPrice = prices[prices.length - period - 1].closePrice;
      const endPrice = prices[prices.length - 1].closePrice;
      
      const stockPerformance = ((endPrice - startPrice) / startPrice) * 100;
      
      // RS = 종목 성과 - 시장 성과
      const rs = stockPerformance - marketPerformance;
      
      totalRS += rs;
      validPeriods++;
    }
    
    return validPeriods > 0 ? totalRS / validPeriods : null;
  }

  /**
   * 가격 성과 계산 (여러 기간)
   */
  calculatePricePerformance(prices) {
    const performance = new Map();
    const periods = [1, 5, 10, 20, 30];
    
    periods.forEach(period => {
      if (prices.length > period) {
        const startPrice = prices[prices.length - period - 1].closePrice;
        const endPrice = prices[prices.length - 1].closePrice;
        const perf = ((endPrice - startPrice) / startPrice) * 100;
        performance.set(`${period}d`, perf);
      }
    });
    
    return performance;
  }

  /**
   * RS 결과 저장
   */
  async saveRSResults(rsResults, market) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < rsResults.length; i++) {
      const result = rsResults[i];
      
      try {
        await StockPriceHistory.findOneAndUpdate(
          { 
            symbol: result.symbol,
            market: market,
            date: today
          },
          {
            $set: {
              relativeStrength: result.rs,
              relativeStrengthRank: i + 1,
              pricePerformance: result.pricePerformance
            }
          },
          { upsert: true }
        );
      } catch (error) {
        console.error(`RS 결과 저장 실패 (${result.symbol}):`, error);
      }
    }
  }

  /**
   * 주도주 스크리닝 (RS 상위 종목)
   */
  async getMarketLeaders(market, limit = 50) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const leaders = await StockPriceHistory.getTopRS(market, today, limit);
    
    return leaders.map(stock => ({
      symbol: stock.symbol,
      market: stock.market,
      relativeStrength: stock.relativeStrength,
      relativeStrengthRank: stock.relativeStrengthRank,
      pricePerformance: Object.fromEntries(stock.pricePerformance),
      closePrice: stock.closePrice,
      changePercent: stock.changePercent
    }));
  }

  /**
   * 고급 주도주 스크리닝
   */
  async getAdvancedLeaders(market, criteria = {}) {
    const {
      minRS = 5,           // 최소 RS 점수
      minVolume = 1000000, // 최소 거래량
      minPrice = 10,       // 최소 주가
      maxPrice = 1000,     // 최대 주가
      minDailyGain = 2,    // 최소 일일 상승률
      limit = 30
    } = criteria;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const leaders = await StockPriceHistory.find({
      market: market,
      date: today,
      relativeStrength: { $gte: minRS },
      volume: { $gte: minVolume },
      closePrice: { $gte: minPrice, $lte: maxPrice },
      changePercent: { $gte: minDailyGain }
    })
    .sort({ relativeStrength: -1 })
    .limit(limit);

    return leaders.map(stock => ({
      symbol: stock.symbol,
      market: stock.market,
      relativeStrength: stock.relativeStrength,
      relativeStrengthRank: stock.relativeStrengthRank,
      pricePerformance: Object.fromEntries(stock.pricePerformance),
      closePrice: stock.closePrice,
      changePercent: stock.changePercent,
      volume: stock.volume,
      highPrice: stock.highPrice,
      lowPrice: stock.lowPrice
    }));
  }

  /**
   * 실시간 주식 데이터 저장 (WebSocket에서 호출)
   */
  async saveRealTimeData(stockData) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 심볼에서 시장 정보 추출
    const market = this.getMarketFromSymbol(stockData.symbol);
    const symbol = stockData.symbol.replace(/^D(NAS|NYS|AMS|TSE|HKS|SHS|SZS)/, '');
    
    try {
      await StockPriceHistory.findOneAndUpdate(
        { 
          symbol: symbol,
          market: market,
          date: today
        },
        {
          $set: {
            openPrice: stockData.openPrice || stockData.currentPrice,
            highPrice: stockData.highPrice || stockData.currentPrice,
            lowPrice: stockData.lowPrice || stockData.currentPrice,
            closePrice: stockData.currentPrice,
            changePercent: stockData.changePercent || 0,
            volume: stockData.volume || 0
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('실시간 데이터 저장 실패:', error);
    }
  }

  /**
   * 심볼에서 시장 정보 추출
   */
  getMarketFromSymbol(symbol) {
    if (symbol.startsWith('DNAS')) return 'NAS';
    if (symbol.startsWith('DNYS')) return 'NYS';
    if (symbol.startsWith('DAMS')) return 'AMS';
    if (symbol.startsWith('DTSE')) return 'TSE';
    if (symbol.startsWith('DHKS')) return 'HKS';
    if (symbol.startsWith('DSHS')) return 'SHS';
    if (symbol.startsWith('DSZS')) return 'SZS';
    return 'NAS'; // 기본값
  }

  /**
   * 수동 RS 계산 트리거
   */
  async triggerRSCalculation() {
    console.log('🔄 수동 RS 계산 시작');
    await this.calculateAllRS();
  }
}

// 싱글톤 인스턴스
const relativeStrengthService = new RelativeStrengthService();

module.exports = relativeStrengthService; 
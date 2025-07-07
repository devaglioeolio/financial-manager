const MarketIndex = require('../models/MarketIndex');
const koreaInvestment = require('./koreaInvestment');
const cron = require('node-cron');

class IndexDataService {
  constructor() {
    this.isCollecting = false;
    this.marketIndexes = {
      // 미국 주요 지수들
      'SPY': { name: 'SPDR S&P 500 ETF', market: 'US', excd: 'NYS' },
      'QQQ': { name: 'Invesco QQQ Trust', market: 'NAS', excd: 'NAS' },
      'DIA': { name: 'SPDR Dow Jones Industrial Average ETF', market: 'NYS', excd: 'NYS' },
      'IXIC': { name: 'NASDAQ Composite Index', market: 'NAS', excd: 'NAS' },
      'SPX': { name: 'S&P 500 Index', market: 'US', excd: 'NYS' },
      'DJI': { name: 'Dow Jones Industrial Average', market: 'NYS', excd: 'NYS' }
    };
    
    this.setupScheduler();
  }

  /**
   * 스케줄러 설정 (매일 장 마감 후 지수 데이터 수집)
   */
  setupScheduler() {
    // 매일 오후 10시에 지수 데이터 수집 (미국 시장 마감 후)
    cron.schedule('0 22 * * *', async () => {
      console.log('📊 시장 지수 데이터 수집 스케줄러 실행');
      await this.collectAllIndexData();
    });
  }

  /**
   * 모든 시장 지수 데이터 수집
   */
  async collectAllIndexData() {
    if (this.isCollecting) {
      console.log('이미 지수 데이터 수집 진행 중...');
      return;
    }

    this.isCollecting = true;
    
    try {
      console.log('🚀 시장 지수 데이터 수집 시작');
      
      const symbols = Object.keys(this.marketIndexes);
      const results = [];
      
      for (const symbol of symbols) {
        try {
          console.log(`📈 ${symbol} 지수 데이터 수집 중...`);
          const indexData = await this.collectIndexData(symbol);
          
          if (indexData) {
            results.push(indexData);
            console.log(`✅ ${symbol} 데이터 수집 완료`);
          }
          
          // API 호출 간격 조절 (0.5초 대기)
          await this.sleep(500);
          
        } catch (error) {
          console.error(`❌ ${symbol} 데이터 수집 실패:`, error.message);
        }
      }
      
      console.log(`✅ 시장 지수 데이터 수집 완료: ${results.length}개 지수`);
      
      // 수집된 데이터로 성과 계산 및 업데이트
      await this.updateIndexPerformances();
      
    } catch (error) {
      console.error('❌ 시장 지수 데이터 수집 실패:', error);
    } finally {
      this.isCollecting = false;
    }
  }

  /**
   * 특정 지수 데이터 수집 및 저장
   */
  async collectIndexData(symbol) {
    try {
      const indexInfo = this.marketIndexes[symbol];
      if (!indexInfo) {
        throw new Error(`지원하지 않는 지수: ${symbol}`);
      }

      // 한국투자증권 API로 지수 데이터 조회 (최근 30일)
      const chartData = await koreaInvestment.getOverseasDailyChart(symbol, 'D');
      
      if (!chartData || !chartData.data || chartData.data.length === 0) {
        console.log(`${symbol} 데이터가 없습니다.`);
        return null;
      }

      // 데이터 저장
      const savedData = [];
      for (const dayData of chartData.data) {
        try {
          const dateObj = new Date(
            dayData.date.substring(0, 4),
            parseInt(dayData.date.substring(4, 6)) - 1,
            dayData.date.substring(6, 8)
          );
          dateObj.setHours(0, 0, 0, 0);

          // 전일 대비 변화율 계산
          const changePercent = dayData.close > 0 && dayData.open > 0 
            ? ((dayData.close - dayData.open) / dayData.open * 100) 
            : 0;

          const indexData = await MarketIndex.findOneAndUpdate(
            { 
              symbol: symbol,
              date: dateObj
            },
            {
              $set: {
                name: indexInfo.name,
                market: indexInfo.market,
                openPrice: dayData.open,
                highPrice: dayData.high,
                lowPrice: dayData.low,
                closePrice: dayData.close,
                volume: dayData.volume || 0,
                changePercent: changePercent
              }
            },
            { upsert: true, new: true }
          );

          savedData.push(indexData);
          
        } catch (error) {
          console.error(`${symbol} 일별 데이터 저장 실패 (${dayData.date}):`, error);
        }
      }

      return { symbol, count: savedData.length, data: savedData };
      
    } catch (error) {
      console.error(`${symbol} 지수 데이터 수집 실패:`, error);
      throw error;
    }
  }

  /**
   * 지수 성과 계산 및 업데이트
   */
  async updateIndexPerformances() {
    try {
      console.log('📊 지수 성과 계산 시작...');
      
      const symbols = Object.keys(this.marketIndexes);
      const periods = [1, 5, 10, 20, 30];
      
      for (const symbol of symbols) {
        try {
          const performances = {};
          
          for (const period of periods) {
            const performance = await this.calculateIndexPerformance(symbol, period);
            if (performance !== null) {
              performances[`${period}d`] = performance;
            }
          }
          
          // 최신 데이터에 성과 업데이트
          if (Object.keys(performances).length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            await MarketIndex.findOneAndUpdate(
              { 
                symbol: symbol,
                date: today
              },
              {
                $set: { performance: performances }
              }
            );
            
            console.log(`✅ ${symbol} 성과 계산 완료:`, performances);
          }
          
        } catch (error) {
          console.error(`${symbol} 성과 계산 실패:`, error);
        }
      }
      
    } catch (error) {
      console.error('지수 성과 계산 실패:', error);
    }
  }

  /**
   * 특정 기간의 지수 성과 계산
   */
  async calculateIndexPerformance(symbol, days) {
    try {
      const endDate = new Date();
      endDate.setHours(0, 0, 0, 0);
      
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
      
      const data = await MarketIndex.getIndexData(symbol, startDate, endDate);
      
      if (data.length < 2) {
        return null;
      }
      
      const startPrice = data[0].closePrice;
      const endPrice = data[data.length - 1].closePrice;
      
      return ((endPrice - startPrice) / startPrice) * 100;
      
    } catch (error) {
      console.error(`${symbol} ${days}일 성과 계산 실패:`, error);
      return null;
    }
  }

  /**
   * 특정 시장의 벤치마크 지수 성과 조회
   */
  async getMarketBenchmarkPerformance(market, days = 30) {
    try {
      // 시장별 대표 지수 매핑
      const benchmarkMap = {
        'NAS': 'QQQ',  // 나스닥 → QQQ
        'NYS': 'SPY',  // 뉴욕증권거래소 → SPY
        'AMS': 'SPY',  // 아메리칸 → SPY (기본값)
        'US': 'SPY'    // 미국 전체 → SPY
      };
      
      const benchmarkSymbol = benchmarkMap[market] || 'SPY';
      
      const performance = await this.calculateIndexPerformance(benchmarkSymbol, days);
      
      return {
        market: market,
        benchmarkSymbol: benchmarkSymbol,
        performance: performance
      };
      
    } catch (error) {
      console.error(`${market} 시장 벤치마크 성과 조회 실패:`, error);
      return null;
    }
  }

  /**
   * 수동 지수 데이터 수집 트리거
   */
  async triggerIndexDataCollection() {
    console.log('🔄 수동 지수 데이터 수집 시작');
    await this.collectAllIndexData();
  }

  /**
   * 지연 함수
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 싱글톤 인스턴스
const indexDataService = new IndexDataService();

module.exports = indexDataService; 
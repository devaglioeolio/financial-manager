const { getOverseasDailyChart } = require('./koreaInvestment');
const cron = require('node-cron');

class SimpleRSService {
  constructor() {
    this.isCalculating = false;
    this.rsData = new Map(); // 종목별 RS 데이터 저장
    this.lastUpdate = null;
    this.setupScheduler();
  }

  /**
   * 스케줄러 설정 (매일 오후 6시에 계산)
   */
  setupScheduler() {
    // 매일 오후 6시에 RS 계산 실행 (미국 시장 마감 후)
    cron.schedule('0 18 * * *', async () => {
      console.log('📊 RS 계산 스케줄러 실행');
      await this.calculateRS();
    });
  }

  /**
   * 주요 종목 리스트 (나스닥, 뉴욕 주요 종목들)
   */
  getPopularStocks() {
    return [
      // 나스닥 주요 종목
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'
    //   'AMD', 'INTC', 'PYPL', 'ADBE', 'CSCO', 'PEP', 'AVGO', 'COST',
    //   'QCOM', 'TXN', 'INTU', 'ISRG', 'BKNG', 'GILD', 'MDLZ', 'REGN',
      
    //   // 뉴욕 주요 종목
    //   'JPM', 'JNJ', 'WMT', 'PG', 'UNH', 'HD', 'MA', 'BAC', 'DIS',
    //   'V', 'ADBE', 'CRM', 'NFLX', 'KO', 'MRK', 'PFE', 'ABT', 'TMO',
    //   'ACN', 'VZ', 'CMCSA', 'DHR', 'NKE', 'LLY', 'ABBV', 'CVX',
    ];
  }

  /**
   * RS 계산 메인 함수
   */
  async calculateRS() {
    if (this.isCalculating) {
      console.log('이미 RS 계산 진행 중...');
      return;
    }

    this.isCalculating = true;
    console.log('🚀 RS 계산 시작...');

    try {
      const stocks = this.getPopularStocks();
      const rsResults = [];

             // 각 종목별로 데이터 수집 및 RS 계산
       for (const symbol of stocks) {
         try {
           console.log(`📈 ${symbol} RS 계산 중...`);
           
           // 최근 30일 데이터 가져오기
           const stockData = await this.getStockHistoryData(symbol);
           
           console.log(`${symbol} 데이터 길이:`, stockData ? stockData.length : 'null');
           
           if (stockData && stockData.length >= 1) { // 1개 데이터만 있어도 시도
             console.log(`${symbol} 첫 번째 데이터:`, stockData[0]);
             console.log(`${symbol} 마지막 데이터:`, stockData[stockData.length - 1]);
             
             const rs = this.calculateStockRS(stockData);
             console.log(`${symbol} RS 결과:`, rs);
             
             if (rs !== null) {
               const rsData = {
                 symbol: symbol,
                 relativeStrength: rs.rsScore,
                 pricePerformance: rs.performance,
                 currentPrice: stockData[stockData.length - 1].close,
                 changePercent: rs.dailyChange,
                 volume: stockData[stockData.length - 1].volume,
                 lastUpdate: new Date().toISOString()
               };
               
               console.log(`${symbol} 최종 RS 데이터:`, rsData);
               rsResults.push(rsData);
             } else {
               console.log(`${symbol} RS 계산 결과가 null`);
             }
           } else {
             console.log(`${symbol} 데이터 부족: ${stockData ? stockData.length : 'null'}개`);
           }
           
           // API 호출 간격 (429 에러 방지)
           await this.delay(500); // 간격을 늘려서 안정성 확보
           
         } catch (error) {
           console.error(`${symbol} RS 계산 실패:`, error.message);
         }
       }

      // 시장 평균 계산
      const marketAverage = this.calculateMarketAverage(rsResults);
      
      // 상대 강도 조정 (시장 대비)
      rsResults.forEach(stock => {
        stock.relativeStrength = stock.relativeStrength - marketAverage;
      });

      // RS 순위 매기기
      rsResults.sort((a, b) => b.relativeStrength - a.relativeStrength);
      rsResults.forEach((stock, index) => {
        stock.rank = index + 1;
      });

      // 메모리에 저장
      this.rsData.clear();
      rsResults.forEach(stock => {
        this.rsData.set(stock.symbol, stock);
      });

      this.lastUpdate = new Date().toISOString();
      console.log(`✅ RS 계산 완료: ${rsResults.length}개 종목`);
      console.log(`🏆 상위 5개 종목:`, rsResults.slice(0, 5).map(s => `${s.symbol} (${s.relativeStrength.toFixed(2)})`));

    } catch (error) {
      console.error('❌ RS 계산 실패:', error);
    } finally {
      this.isCalculating = false;
    }
  }

     /**
    * 종목 히스토리 데이터 가져오기
    */
   async getStockHistoryData(symbol) {
     try {
            // 최근 45일 데이터 가져오기 (20일 성과 계산을 위해)
     const endDate = new Date();
     const startDate = new Date(endDate.getTime() - 45 * 24 * 60 * 60 * 1000);
       
       const formatDate = (date) => {
         const year = date.getFullYear();
         const month = String(date.getMonth() + 1).padStart(2, '0');
         const day = String(date.getDate()).padStart(2, '0');
         return `${year}${month}${day}`;
       };

       console.log(`${symbol} API 호출: ${formatDate(startDate)} ~ ${formatDate(endDate)}`);

       const result = await getOverseasDailyChart(
         symbol,
         'D',
         formatDate(startDate),
         formatDate(endDate)
       );

              console.log(`${symbol} API 응답:`, {
         totalCount: result.totalCount,
         dataLength: result.data ? result.data.length : 'null',
         firstItem: result.data && result.data.length > 0 ? result.data[0] : 'no data',
         basicData: result.basicData && result.basicData.length > 0 ? result.basicData[0] : 'no basic data'
       });

       // 데이터가 없으면 basicData도 확인
       let chartData = result.data || [];
       
       if (chartData.length === 0 && result.basicData && result.basicData.length > 0) {
         console.log(`${symbol} 차트 데이터가 없어서 basicData 사용`);
         const basic = result.basicData[0];
         chartData = [{
           date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
           open: basic.open,
           high: basic.high,
           low: basic.low,
           close: basic.close,
           volume: 0
         }];
       }

       if (chartData.length === 0) {
         console.log(`${symbol} 모든 데이터가 비어있음`);
         return null;
       }

       // 날짜 정렬 (한국투자증권 API는 YYYYMMDD 형식)
       const sortedData = chartData.sort((a, b) => {
         const dateA = a.date ? a.date.toString() : '';
         const dateB = b.date ? b.date.toString() : '';
         return dateA.localeCompare(dateB);
       });
       
       console.log(`${symbol} 정렬된 데이터 길이: ${sortedData.length}`);
       
       // 데이터 유효성 검사 및 변환
       const validData = sortedData.map(item => {
         const close = parseFloat(item.close);
         const open = parseFloat(item.open || item.close);
         const high = parseFloat(item.high || item.close);
         const low = parseFloat(item.low || item.close);
         const volume = parseInt(item.volume || 0);
         
         return {
           date: item.date,
           open: isNaN(open) ? close : open,
           high: isNaN(high) ? close : high,
           low: isNaN(low) ? close : low,
           close: close,
           volume: isNaN(volume) ? 0 : volume
         };
       }).filter(item => !isNaN(item.close) && item.close > 0);
       
       console.log(`${symbol} 유효한 데이터 길이: ${validData.length}`);
       console.log(`${symbol} 첫 번째 유효 데이터:`, validData[0]);
       console.log(`${symbol} 마지막 유효 데이터:`, validData[validData.length - 1]);
       
       return validData;

     } catch (error) {
       console.error(`${symbol} 히스토리 데이터 가져오기 실패:`, error.message);
       return null;
     }
   }

     /**
    * 개별 종목 RS 계산
    */
   calculateStockRS(stockData) {
     try {
       console.log(`RS 계산 시작 - 데이터 길이: ${stockData.length}`);
       
       // 종가 데이터를 숫자로 변환
       const prices = stockData.map(d => {
         const price = parseFloat(d.close);
         if (isNaN(price) || price <= 0) {
           console.log(`잘못된 가격 데이터:`, d);
           return null;
         }
         return price;
       }).filter(price => price !== null);
       
       console.log(`가격 데이터 첫 5개:`, prices.slice(0, 5));
       console.log(`가격 데이터 마지막 5개:`, prices.slice(-5));
       
       if (prices.length < 2) {
         console.log(`유효한 가격 데이터 부족: ${prices.length}개`);
         return null;
       }
       
       const latestPrice = prices[prices.length - 1];
       const previousPrice = prices[prices.length - 2];
       
       console.log(`최신 가격: ${latestPrice}, 전일 가격: ${previousPrice}`);
       
       // 여러 기간 성과 계산 (데이터 양에 따라 조정)
       const availablePeriods = [1, 3, 5, 10, 20].filter(p => p < prices.length);
       const performances = {};
       let totalRS = 0;
       let validPeriods = 0;

       if (availablePeriods.length === 0 && prices.length >= 2) {
         // 최소 2개 데이터가 있으면 1일 성과라도 계산
         availablePeriods.push(1);
       }

       availablePeriods.forEach(period => {
         if (prices.length > period) {
           const oldPrice = prices[prices.length - period - 1];
           const performance = ((latestPrice - oldPrice) / oldPrice) * 100;
           performances[`${period}d`] = performance;
           totalRS += performance;
           validPeriods++;
           
           console.log(`${period}일 성과: ${oldPrice} -> ${latestPrice} = ${performance.toFixed(2)}%`);
         } else {
           console.log(`${period}일 성과 계산 불가 - 데이터 부족 (${prices.length} <= ${period})`);
         }
       });

       // 데이터가 1개뿐이면 0%로 처리
       if (prices.length === 1) {
         performances['1d'] = 0;
         totalRS = 0;
         validPeriods = 1;
         console.log('데이터가 1개뿐이므로 성과를 0%로 설정');
       }

       const rsScore = validPeriods > 0 ? totalRS / validPeriods : 0;
       const dailyChange = previousPrice ? ((latestPrice - previousPrice) / previousPrice) * 100 : 0;

       const result = {
         rsScore: rsScore,
         performance: performances,
         dailyChange: dailyChange
       };
       
       console.log(`최종 RS 결과:`, result);
       
       return result;

     } catch (error) {
       console.error('RS 계산 오류:', error);
       return null;
     }
   }

  /**
   * 시장 평균 계산
   */
  calculateMarketAverage(rsResults) {
    if (rsResults.length === 0) return 0;
    
    const totalRS = rsResults.reduce((sum, stock) => sum + stock.relativeStrength, 0);
    return totalRS / rsResults.length;
  }

  /**
   * 지연 함수 (API 호출 간격 조절)
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * RS 리더 조회
   */
  getTopRS(limit = 50) {
    if (this.rsData.size === 0) {
      return {
        leaders: [],
        message: 'RS 데이터가 없습니다. 잠시 후 다시 시도하세요.',
        lastUpdate: this.lastUpdate
      };
    }

    const leaders = Array.from(this.rsData.values())
      .sort((a, b) => b.relativeStrength - a.relativeStrength)
      .slice(0, limit);

    return {
      leaders: leaders,
      totalCount: this.rsData.size,
      lastUpdate: this.lastUpdate
    };
  }

  /**
   * 고급 필터링 RS 리더 조회
   */
  getAdvancedRS(criteria = {}) {
    const {
      minRS = 0,
      minPrice = 0,
      maxPrice = 10000,
      minDailyGain = -100,
      limit = 30
    } = criteria;

    if (this.rsData.size === 0) {
      return {
        leaders: [],
        message: 'RS 데이터가 없습니다. 잠시 후 다시 시도하세요.',
        lastUpdate: this.lastUpdate
      };
    }

    const leaders = Array.from(this.rsData.values())
      .filter(stock => 
        stock.relativeStrength >= minRS &&
        stock.currentPrice >= minPrice &&
        stock.currentPrice <= maxPrice &&
        stock.changePercent >= minDailyGain
      )
      .sort((a, b) => b.relativeStrength - a.relativeStrength)
      .slice(0, limit);

    return {
      leaders: leaders,
      criteria: criteria,
      totalCount: leaders.length,
      lastUpdate: this.lastUpdate
    };
  }

  /**
   * RS 통계 조회
   */
  getStats() {
    if (this.rsData.size === 0) {
      return {
        totalStocks: 0,
        avgRS: 0,
        maxRS: 0,
        minRS: 0,
        positiveRS: 0,
        negativeRS: 0,
        positivePercentage: 0,
        lastUpdate: this.lastUpdate
      };
    }

    const rsValues = Array.from(this.rsData.values()).map(s => s.relativeStrength);
    const positiveCount = rsValues.filter(rs => rs > 0).length;
    const negativeCount = rsValues.filter(rs => rs < 0).length;

    return {
      totalStocks: this.rsData.size,
      avgRS: Math.round((rsValues.reduce((sum, rs) => sum + rs, 0) / rsValues.length) * 100) / 100,
      maxRS: Math.round(Math.max(...rsValues) * 100) / 100,
      minRS: Math.round(Math.min(...rsValues) * 100) / 100,
      positiveRS: positiveCount,
      negativeRS: negativeCount,
      positivePercentage: Math.round((positiveCount / rsValues.length) * 100),
      lastUpdate: this.lastUpdate
    };
  }

  /**
   * 수동 RS 계산 트리거
   */
  async triggerCalculation() {
    console.log('🔄 수동 RS 계산 트리거');
    await this.calculateRS();
  }

     /**
    * 서비스 시작 시 초기 데이터 로드
    */
   async initialize() {
     console.log('📊 SimpleRS 서비스 초기화...');
     
     // 3초 후 첫 RS 계산 실행 (빠른 테스트를 위해)
     setTimeout(() => {
       console.log('⏰ 3초 후 RS 계산 시작...');
       this.calculateRS();
     }, 3000);
   }
}

// 싱글톤 인스턴스
const simpleRSService = new SimpleRSService();

module.exports = simpleRSService; 
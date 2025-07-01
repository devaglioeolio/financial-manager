const googleTrends = require('google-trends-api');
const Asset = require('../models/Asset');

class GoogleTrendsService {
  
  // 특정 키워드의 트렌드 데이터 가져오기
  async getTrendData(keyword, timeframe = 'today 12-m', geo = 'KR') {
    try {
      console.log(`트렌드 데이터 요청: ${keyword}`);
      
      // 테스트용 더미 데이터 (임시로 항상 사용)
      console.log('더미 데이터 사용 (테스트 모드)');
      return this.generateDummyTrendData(keyword);
      
      const results = await googleTrends.interestOverTime({
        keyword: keyword,
        startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1년 전
        endTime: new Date(),
        geo: geo
      });
      
      console.log('Google Trends API 응답 받음');
      
      if (!results) {
        throw new Error('Google Trends API에서 응답이 없습니다.');
      }
      
      const data = JSON.parse(results);
      
      if (!data.default || !data.default.timelineData) {
        console.warn(`${keyword}에 대한 트렌드 데이터가 없습니다.`);
        return []; // 빈 배열 반환
      }
      
      return data.default.timelineData.map(item => ({
        date: new Date(item.time * 1000).toISOString().split('T')[0],
        value: item.value[0] || 0,
        formattedTime: item.formattedTime
      }));
    } catch (error) {
      console.error(`트렌드 데이터 가져오기 실패 (${keyword}):`, error.message);
      // 에러 발생시 더미 데이터 반환
      console.log('에러로 인해 더미 데이터 사용');
      return this.generateDummyTrendData(keyword);
    }
  }

  // 테스트용 더미 트렌드 데이터 생성
  generateDummyTrendData(keyword) {
    const data = [];
    const today = new Date();
    
    for (let i = 60; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // 키워드에 따라 다른 패턴 생성
      let baseValue = 50;
      if (keyword.includes('삼성')) baseValue = 70;
      if (keyword.includes('애플') || keyword.includes('Apple')) baseValue = 80;
      if (keyword.includes('테슬라') || keyword.includes('Tesla')) baseValue = 60;
      
      // 랜덤 변동 추가
      const variation = Math.sin(i / 10) * 20 + Math.random() * 20 - 10;
      const value = Math.max(0, Math.min(100, baseValue + variation));
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(value),
        formattedTime: date.toLocaleDateString('ko-KR')
      });
    }
    
    return data;
  }

  // 여러 키워드 비교
  async compareKeywords(keywords, timeframe = 'today 12-m', geo = 'KR') {
    try {
      const results = await googleTrends.interestOverTime({
        keyword: keywords,
        startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        endTime: new Date(),
        geo: geo
      });
      
      const data = JSON.parse(results);
      return data.default.timelineData.map(item => {
        const result = {
          date: new Date(item.time * 1000).toISOString().split('T')[0],
          formattedTime: item.formattedTime
        };
        
        keywords.forEach((keyword, index) => {
          result[keyword] = item.value[index] || 0;
        });
        
        return result;
      });
    } catch (error) {
      console.error('키워드 비교 실패:', error);
      throw new Error('키워드 비교 데이터를 가져올 수 없습니다.');
    }
  }

  // 관련 키워드 가져오기
  async getRelatedKeywords(keyword, geo = 'KR') {
    try {
      console.log(`관련 키워드 요청: ${keyword}`);
      
      // 테스트용 더미 데이터 (임시로 항상 사용)
      console.log('더미 관련 키워드 사용 (테스트 모드)');
      return this.generateDummyRelatedKeywords(keyword);
      
      const results = await googleTrends.relatedQueries({
        keyword: keyword,
        startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3개월
        endTime: new Date(),
        geo: geo
      });
      
      if (!results) {
        return { rising: [], top: [] };
      }
      
      const data = JSON.parse(results);
      
      if (!data.default || !data.default.rankedList) {
        return { rising: [], top: [] };
      }
      
      return {
        rising: data.default.rankedList[0]?.rankedKeyword || [],
        top: data.default.rankedList[1]?.rankedKeyword || []
      };
    } catch (error) {
      console.error(`관련 키워드 가져오기 실패 (${keyword}):`, error.message);
      return this.generateDummyRelatedKeywords(keyword);
    }
  }

  // 테스트용 더미 관련 키워드 생성
  generateDummyRelatedKeywords(keyword) {
    const dummyKeywords = {
      '삼성전자': {
        rising: [
          { query: '삼성전자 주가', value: 100 },
          { query: '삼성전자 실적', value: 80 },
          { query: '삼성전자 배당', value: 60 }
        ],
        top: [
          { query: '삼성전자 주식', value: 100 },
          { query: '삼성 갤럭시', value: 90 },
          { query: '삼성 반도체', value: 85 }
        ]
      },
      '애플': {
        rising: [
          { query: '애플 주가', value: 100 },
          { query: '아이폰15', value: 90 },
          { query: '애플 실적', value: 75 }
        ],
        top: [
          { query: '애플 주식', value: 100 },
          { query: '아이폰', value: 95 },
          { query: 'Apple', value: 90 }
        ]
      }
    };
    
    // 기본 더미 데이터
    const defaultKeywords = {
      rising: [
        { query: `${keyword} 주가`, value: 100 },
        { query: `${keyword} 실적`, value: 80 },
        { query: `${keyword} 분석`, value: 60 }
      ],
      top: [
        { query: `${keyword} 주식`, value: 100 },
        { query: `${keyword} 투자`, value: 85 },
        { query: `${keyword} 전망`, value: 70 }
      ]
    };
    
    return dummyKeywords[keyword] || defaultKeywords;
  }

  // 사용자의 보유 종목에 대한 트렌드 분석
  async analyzeUserStockTrends(userId) {
    try {
      console.log(`사용자 ${userId}의 종목 트렌드 분석 시작`);
      
      // 사용자의 주식 자산 가져오기
      const stocks = await Asset.find({
        userId: userId,
        mainCategory: 'STOCK'
      }).select('name subCategory');

      console.log(`분석할 종목 수: ${stocks.length}`);

      if (stocks.length === 0) {
        return {
          totalStocks: 0,
          analyzedStocks: 0,
          analyses: [],
          summary: null,
          lastUpdated: new Date().toISOString(),
          message: '보유 중인 주식이 없습니다.'
        };
      }

      const analyses = [];

      for (const stock of stocks) {
        try {
          console.log(`${stock.name} 분석 시작`);
          
          // 종목명으로 트렌드 데이터 가져오기
          const trendData = await this.getTrendData(stock.name);
          
          if (trendData.length === 0) {
            console.warn(`${stock.name}: 트렌드 데이터가 없어 스킵`);
            continue;
          }
          
          // 관련 키워드도 가져오기 (실패해도 계속 진행)
          const relatedKeywords = await this.getRelatedKeywords(stock.name);
          
          // 최근 30일 평균과 이전 30일 평균 비교
          const recent30Days = trendData.slice(-30);
          const previous30Days = trendData.slice(-60, -30);
          
          const recentAvg = recent30Days.length > 0 ? 
            recent30Days.reduce((sum, item) => sum + item.value, 0) / recent30Days.length : 0;
          const previousAvg = previous30Days.length > 0 ? 
            previous30Days.reduce((sum, item) => sum + item.value, 0) / previous30Days.length : 0;
          
          const changePercent = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
          
          analyses.push({
            stockName: stock.name,
            stockCategory: stock.subCategory,
            trendData: trendData.slice(-60), // 최근 60일만 저장
            relatedKeywords: relatedKeywords,
            recentTrendAverage: Math.round(recentAvg),
            previousTrendAverage: Math.round(previousAvg),
            trendChangePercent: Math.round(changePercent * 100) / 100,
            trendDirection: changePercent > 5 ? 'rising' : changePercent < -5 ? 'falling' : 'stable'
          });
          
          console.log(`${stock.name} 분석 완료 - 관심도: ${Math.round(recentAvg)}, 변화: ${Math.round(changePercent * 100) / 100}%`);
          
          // API 호출 제한을 위한 딜레이
          await new Promise(resolve => setTimeout(resolve, 1500));
          
        } catch (error) {
          console.error(`${stock.name} 트렌드 분석 실패:`, error.message);
          // 개별 주식 실패시 스킵하고 계속 진행
          continue;
        }
      }

      console.log(`분석 완료: ${analyses.length}/${stocks.length} 종목`);

      return {
        totalStocks: stocks.length,
        analyzedStocks: analyses.length,
        analyses: analyses,
        summary: this.generateTrendSummary(analyses),
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('사용자 주식 트렌드 분석 실패:', error.message);
      throw new Error('주식 트렌드 분석을 완료할 수 없습니다: ' + error.message);
    }
  }

  // 트렌드 요약 생성
  generateTrendSummary(analyses) {
    if (analyses.length === 0) return null;
    
    const risingStocks = analyses.filter(a => a.trendDirection === 'rising');
    const fallingStocks = analyses.filter(a => a.trendDirection === 'falling');
    const stableStocks = analyses.filter(a => a.trendDirection === 'stable');
    
    // 가장 관심도가 높은 종목
    const mostPopular = analyses.reduce((max, current) => 
      current.recentTrendAverage > max.recentTrendAverage ? current : max
    );
    
    // 가장 트렌드가 상승한 종목
    const mostRising = risingStocks.length > 0 ? 
      risingStocks.reduce((max, current) => 
        current.trendChangePercent > max.trendChangePercent ? current : max
      ) : null;

    return {
      totalAnalyzed: analyses.length,
      risingCount: risingStocks.length,
      fallingCount: fallingStocks.length,
      stableCount: stableStocks.length,
      mostPopularStock: {
        name: mostPopular.stockName,
        trendScore: mostPopular.recentTrendAverage
      },
      mostRisingStock: mostRising ? {
        name: mostRising.stockName,
        changePercent: mostRising.trendChangePercent
      } : null,
      averageTrendChange: Math.round(
        (analyses.reduce((sum, a) => sum + a.trendChangePercent, 0) / analyses.length) * 100
      ) / 100
    };
  }

  // 더미 주식 데이터로 트렌드 분석 (테스트용)
  async analyzeDummyStocks() {
    try {
      console.log('더미 주식 데이터로 트렌드 분석 시작');
      
      // 더미 주식 목록
      const dummyStocks = [
        { name: '삼성전자', subCategory: 'DOMESTIC' },
        { name: '애플', subCategory: 'FOREIGN' },
        { name: 'SK하이닉스', subCategory: 'DOMESTIC' },
        { name: '테슬라', subCategory: 'FOREIGN' }
      ];

      const analyses = [];

      for (const stock of dummyStocks) {
        try {
          console.log(`${stock.name} 더미 분석 시작`);
          
          // 더미 트렌드 데이터 생성
          const trendData = this.generateDummyTrendData(stock.name);
          
          // 더미 관련 키워드 생성
          const relatedKeywords = this.generateDummyRelatedKeywords(stock.name);
          
          // 최근 30일 평균과 이전 30일 평균 비교
          const recent30Days = trendData.slice(-30);
          const previous30Days = trendData.slice(-60, -30);
          
          const recentAvg = recent30Days.length > 0 ? 
            recent30Days.reduce((sum, item) => sum + item.value, 0) / recent30Days.length : 0;
          const previousAvg = previous30Days.length > 0 ? 
            previous30Days.reduce((sum, item) => sum + item.value, 0) / previous30Days.length : 0;
          
          const changePercent = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
          
          analyses.push({
            stockName: stock.name,
            stockCategory: stock.subCategory,
            trendData: trendData.slice(-60), // 최근 60일만 저장
            relatedKeywords: relatedKeywords,
            recentTrendAverage: Math.round(recentAvg),
            previousTrendAverage: Math.round(previousAvg),
            trendChangePercent: Math.round(changePercent * 100) / 100,
            trendDirection: changePercent > 5 ? 'rising' : changePercent < -5 ? 'falling' : 'stable'
          });
          
          console.log(`${stock.name} 더미 분석 완료 - 관심도: ${Math.round(recentAvg)}, 변화: ${Math.round(changePercent * 100) / 100}%`);
          
        } catch (error) {
          console.error(`${stock.name} 더미 분석 실패:`, error.message);
          continue;
        }
      }

      console.log(`더미 분석 완료: ${analyses.length}/${dummyStocks.length} 종목`);

      return {
        totalStocks: dummyStocks.length,
        analyzedStocks: analyses.length,
        analyses: analyses,
        summary: this.generateTrendSummary(analyses),
        lastUpdated: new Date().toISOString(),
        isDummyData: true,
        message: '테스트용 더미 데이터입니다. 실제 보유 종목을 분석하려면 로그인이 필요합니다.'
      };
      
    } catch (error) {
      console.error('더미 주식 트렌드 분석 실패:', error.message);
      throw new Error('더미 주식 트렌드 분석을 완료할 수 없습니다: ' + error.message);
    }
  }

  // 피어슨 상관계수 계산
  calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }
}

module.exports = new GoogleTrendsService(); 
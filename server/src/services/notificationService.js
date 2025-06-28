const { createNotification } = require('../controllers/notificationController');
const Watchlist = require('../models/Watchlist');
const Asset = require('../models/Asset');
const NotificationSettings = require('../models/NotificationSettings');
const { getExchangeRatesWithChange } = require('./exchangeRateService');

class NotificationService {
  constructor() {
    this.priceCache = new Map(); // 이전 가격 캐시
    this.portfolioCache = new Map(); // 포트폴리오 값 캐시
    this.exchangeRateCache = new Map(); // 환율 캐시
  }

  // 주가 변동 알림 체크
  async checkStockPriceAlerts(stockData) {
    try {
      const { ticker, market, currentPrice, prevClose, changePercent } = stockData;
      const cacheKey = `${market}-${ticker}`;
      
      if (!currentPrice || !prevClose) return;

      // 관심종목에 이 주식이 있는 사용자들 찾기
      const watchlistItems = await Watchlist.find({ 
        ticker: ticker.toUpperCase(), 
        market: market.toUpperCase() 
      }).populate('userId');

      for (const item of watchlistItems) {
        if (!item.userId) continue;
        
        const settings = await NotificationSettings.findOne({ userId: item.userId._id });
        if (!settings || !settings.stockAlerts.enabled) continue;

        // 급등/급락 알림 체크
        const absChangePercent = Math.abs(changePercent);
        
        if (settings.stockAlerts.surgeAlert && changePercent >= settings.stockAlerts.surgeThreshold) {
          await createNotification(
            item.userId._id,
            'STOCK_SURGE',
            `📈 ${item.englishName} 급등!`,
            `${ticker}가 ${changePercent.toFixed(2)}% 상승했습니다. 현재가: $${currentPrice.toFixed(2)}`,
            {
              ticker,
              market,
              currentPrice,
              changePercent,
              change: currentPrice - prevClose
            },
            'HIGH'
          );
        }
        
        if (settings.stockAlerts.plungeAlert && changePercent <= -settings.stockAlerts.plungeThreshold) {
          await createNotification(
            item.userId._id,
            'STOCK_PLUNGE',
            `📉 ${item.englishName} 급락!`,
            `${ticker}가 ${Math.abs(changePercent).toFixed(2)}% 하락했습니다. 현재가: $${currentPrice.toFixed(2)}`,
            {
              ticker,
              market,
              currentPrice,
              changePercent,
              change: currentPrice - prevClose
            },
            'HIGH'
          );
        }

        // 목표가 알림 체크 (사용자가 설정한 목표가가 있다면)
        // TODO: 목표가 설정 기능을 나중에 추가할 때 구현
      }
    } catch (error) {
      console.error('주가 알림 체크 실패:', error);
    }
  }

  // 포트폴리오 변동 알림 체크
  async checkPortfolioAlerts(userId) {
    try {
      const settings = await NotificationSettings.findOne({ userId });
      if (!settings || !settings.portfolioAlerts.enabled) return;

      // 현재 포트폴리오 총액 계산
      const assets = await Asset.find({ userId });
      let totalAmount = 0;
      
      for (const asset of assets) {
        if (asset.subCategory === 'FOREIGN') {
          totalAmount += asset.getAmountInKRW();
        } else {
          totalAmount += asset.amount;
        }
      }

      const previousTotal = this.portfolioCache.get(userId.toString()) || 0;
      
      if (previousTotal > 0) {
        const difference = totalAmount - previousTotal;
        const changePercent = (difference / previousTotal) * 100;

        // 평가손익 변동 알림
        if (settings.portfolioAlerts.profitLossAlert && 
            Math.abs(difference) >= settings.portfolioAlerts.profitLossThreshold) {
          
          const isProfit = difference > 0;
          await createNotification(
            userId,
            'PORTFOLIO_MILESTONE',
            `💰 포트폴리오 ${isProfit ? '상승' : '하락'}!`,
            `총 자산이 ${isProfit ? '+' : ''}${Math.round(difference).toLocaleString()}원 변동했습니다. (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`,
            {
              currentTotal: totalAmount,
              previousTotal,
              difference,
              changePercent
            },
            Math.abs(difference) >= settings.portfolioAlerts.profitLossThreshold * 2 ? 'HIGH' : 'MEDIUM'
          );
        }

        // 신고점/신저점 알림
        if (settings.portfolioAlerts.milestoneAlert) {
          // 신고점
          if (totalAmount > previousTotal && totalAmount > this.getPortfolioHighest(userId)) {
            await createNotification(
              userId,
              'PORTFOLIO_MILESTONE',
              '🎉 포트폴리오 신고점 달성!',
              `총 자산이 ₩${Math.round(totalAmount).toLocaleString()}원으로 신고점을 경신했습니다!`,
              {
                currentTotal: totalAmount,
                milestone: 'highest'
              },
              'HIGH'
            );
            this.setPortfolioHighest(userId, totalAmount);
          }
        }
      }

      // 캐시 업데이트
      this.portfolioCache.set(userId.toString(), totalAmount);
    } catch (error) {
      console.error('포트폴리오 알림 체크 실패:', error);
    }
  }

  // 환율 변동 알림 체크
  async checkExchangeRateAlerts() {
    try {
      const exchangeRates = await getExchangeRatesWithChange();
      const usdRate = exchangeRates.find(rate => rate.currency === 'USD');
      
      if (!usdRate) return;

      const previousRate = this.exchangeRateCache.get('USD') || 0;
      
      if (previousRate > 0) {
        const difference = usdRate.rate - previousRate;
        const changePercent = (difference / previousRate) * 100;

        // 환율 알림이 설정된 모든 사용자 찾기
        const usersWithSettings = await NotificationSettings.find({
          'exchangeRateAlerts.enabled': true,
          'exchangeRateAlerts.usdKrwAlert': true
        });

        for (const settings of usersWithSettings) {
          if (Math.abs(difference) >= settings.exchangeRateAlerts.usdKrwThreshold) {
            const isIncrease = difference > 0;
            await createNotification(
              settings.userId,
              'EXCHANGE_RATE_CHANGE',
              `💱 달러 환율 ${isIncrease ? '상승' : '하락'}!`,
              `USD/KRW가 ${isIncrease ? '+' : ''}${difference.toFixed(1)}원 변동했습니다. 현재: ${usdRate.rate.toFixed(1)}원`,
              {
                currency: 'USD',
                currentRate: usdRate.rate,
                previousRate,
                difference,
                changePercent
              },
              Math.abs(difference) >= settings.exchangeRateAlerts.usdKrwThreshold * 2 ? 'HIGH' : 'MEDIUM'
            );
          }
        }
      }

      // 캐시 업데이트
      this.exchangeRateCache.set('USD', usdRate.rate);
    } catch (error) {
      console.error('환율 알림 체크 실패:', error);
    }
  }

  // 목표 달성률 알림 체크
  async checkGoalProgressAlerts(userId) {
    try {
      const Goal = require('../models/Goal');
      const settings = await NotificationSettings.findOne({ userId });
      
      if (!settings || !settings.goalAlerts.enabled || !settings.goalAlerts.progressAlert) return;

      const goals = await Goal.find({ userId, status: 'IN_PROGRESS' });
      
      for (const goal of goals) {
        const progressPercent = (goal.currentAmount / goal.targetAmount) * 100;
        
        // 설정된 마일스톤 체크
        for (const milestone of settings.goalAlerts.progressMilestones) {
          if (progressPercent >= milestone && goal.currentAmount > 0) {
            // 이미 알림을 보냈는지 체크 (중복 방지)
            const existingNotification = await require('../models/Notification').findOne({
              userId,
              type: 'GOAL_PROGRESS',
              'data.goalId': goal._id,
              'data.milestone': milestone
            });

            if (!existingNotification) {
              await createNotification(
                userId,
                'GOAL_PROGRESS',
                `🎯 목표 달성률 ${milestone}%!`,
                `'${goal.title}' 목표가 ${milestone}% 달성되었습니다! (${Math.round(progressPercent)}%)`,
                {
                  goalId: goal._id,
                  goalTitle: goal.title,
                  milestone,
                  currentProgress: progressPercent,
                  currentAmount: goal.currentAmount,
                  targetAmount: goal.targetAmount
                },
                milestone >= 100 ? 'URGENT' : 'HIGH'
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('목표 알림 체크 실패:', error);
    }
  }

  // 포트폴리오 신고점 관리 (간단한 메모리 저장, 실제로는 DB에 저장하는 것이 좋음)
  getPortfolioHighest(userId) {
    return this.portfolioHighest?.get(userId.toString()) || 0;
  }

  setPortfolioHighest(userId, amount) {
    if (!this.portfolioHighest) {
      this.portfolioHighest = new Map();
    }
    this.portfolioHighest.set(userId.toString(), amount);
  }

  // 실시간 데이터 변화 감지 시 호출되는 메인 메서드
  async processRealTimeData(data) {
    try {
      // 주가 데이터인 경우
      if (data.ticker && data.market) {
        await this.checkStockPriceAlerts(data);
      }

      // 환율 체크 (주기적으로)
      if (Math.random() < 0.1) { // 10% 확률로 환율 체크
        await this.checkExchangeRateAlerts();
      }
    } catch (error) {
      console.error('실시간 데이터 처리 실패:', error);
    }
  }

  // 사용자별 포트폴리오 체크 (주기적 실행)
  async checkAllUsersPortfolio() {
    try {
      const users = await require('../models/User').find({}, '_id');
      
      for (const user of users) {
        await this.checkPortfolioAlerts(user._id);
        await this.checkGoalProgressAlerts(user._id);
      }
    } catch (error) {
      console.error('전체 사용자 포트폴리오 체크 실패:', error);
    }
  }
}

// 싱글톤 인스턴스 생성
const notificationService = new NotificationService();

module.exports = notificationService; 
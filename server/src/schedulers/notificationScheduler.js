const cron = require('node-cron');
const notificationService = require('../services/notificationService');

let isSchedulerRunning = false;

// 포트폴리오 변동 체크 (5분마다)
const startPortfolioCheckScheduler = () => {
  if (isSchedulerRunning) return;
  
  console.log('📊 포트폴리오 알림 스케줄러 시작...');
  
  // 5분마다 전체 사용자 포트폴리오 체크
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('🔍 전체 사용자 포트폴리오 체크 시작...');
      await notificationService.checkAllUsersPortfolio();
      console.log('✅ 전체 사용자 포트폴리오 체크 완료');
    } catch (error) {
      console.error('❌ 포트폴리오 체크 스케줄러 오류:', error);
    }
  });
  
  isSchedulerRunning = true;
};

// 환율 변동 체크 (10분마다)
const startExchangeRateCheckScheduler = () => {
  console.log('💱 환율 알림 스케줄러 시작...');
  
  // 10분마다 환율 변동 체크
  cron.schedule('*/10 * * * *', async () => {
    try {
      console.log('🔍 환율 변동 체크 시작...');
      await notificationService.checkExchangeRateAlerts();
      console.log('✅ 환율 변동 체크 완료');
    } catch (error) {
      console.error('❌ 환율 체크 스케줄러 오류:', error);
    }
  });
};

// 일일 요약 알림 (매일 오후 6시)
const startDailySummaryScheduler = () => {
  console.log('📰 일일 요약 알림 스케줄러 시작...');
  
  // 매일 오후 6시에 일일 요약 알림
  cron.schedule('0 18 * * *', async () => {
    try {
      console.log('📰 일일 요약 알림 생성 시작...');
      await generateDailySummaryNotifications();
      console.log('✅ 일일 요약 알림 생성 완료');
    } catch (error) {
      console.error('❌ 일일 요약 알림 생성 오류:', error);
    }
  });
};

// 일일 요약 알림 생성
const generateDailySummaryNotifications = async () => {
  try {
    const NotificationSettings = require('../models/NotificationSettings');
    const { createNotification } = require('../controllers/notificationController');
    const Asset = require('../models/Asset');
    const Watchlist = require('../models/Watchlist');
    
    // 일일 요약을 원하는 사용자들 찾기
    const usersWithDailySummary = await NotificationSettings.find({
      $or: [
        { 'stockAlerts.dailySummary': true },
        { 'portfolioAlerts.dailySummary': true },
        { 'exchangeRateAlerts.dailyReport': true }
      ]
    });
    
    for (const userSettings of usersWithDailySummary) {
      let summaryParts = [];
      
      // 주식 일일 요약
      if (userSettings.stockAlerts.enabled && userSettings.stockAlerts.dailySummary) {
        const watchlist = await Watchlist.find({ userId: userSettings.userId });
        if (watchlist.length > 0) {
          summaryParts.push(`관심종목 ${watchlist.length}개 확인`);
        }
      }
      
      // 포트폴리오 일일 요약
      if (userSettings.portfolioAlerts.enabled && userSettings.portfolioAlerts.dailySummary) {
        const assets = await Asset.find({ userId: userSettings.userId });
        const totalAmount = assets.reduce((sum, asset) => {
          return sum + (asset.subCategory === 'FOREIGN' ? asset.getAmountInKRW() : asset.amount);
        }, 0);
        
        summaryParts.push(`총 자산 ₩${Math.round(totalAmount).toLocaleString()}`);
      }
      
      // 환율 일일 리포트
      if (userSettings.exchangeRateAlerts.enabled && userSettings.exchangeRateAlerts.dailyReport) {
        summaryParts.push('환율 정보 업데이트');
      }
      
      // 요약 알림 생성
      if (summaryParts.length > 0) {
        const summaryMessage = `오늘의 금융 현황: ${summaryParts.join(', ')}`;
        
        await createNotification(
          userSettings.userId,
          'SYSTEM',
          '📊 일일 요약',
          summaryMessage,
          {
            summaryType: 'daily',
            date: new Date().toISOString().split('T')[0]
          },
          'LOW'
        );
      }
    }
  } catch (error) {
    console.error('일일 요약 알림 생성 실패:', error);
  }
};

// 실시간 주가 데이터 처리 (웹소켓 데이터가 들어올 때마다 호출)
const processRealTimeStockData = async (stockData) => {
  try {
    await notificationService.processRealTimeData(stockData);
  } catch (error) {
    console.error('실시간 주가 데이터 처리 실패:', error);
  }
};

// 모든 알림 스케줄러 시작
const startAllNotificationSchedulers = () => {
  console.log('🚀 알림 시스템 스케줄러 시작...');
  
  startPortfolioCheckScheduler();
  startExchangeRateCheckScheduler();
  startDailySummaryScheduler();
  
  console.log('✅ 모든 알림 스케줄러가 시작되었습니다.');
};

module.exports = {
  startAllNotificationSchedulers,
  startPortfolioCheckScheduler,
  startExchangeRateCheckScheduler,
  startDailySummaryScheduler,
  processRealTimeStockData
}; 
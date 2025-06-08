const cron = require('node-cron');
const { fetchAndSaveExchangeRates, formatDateForAPI } = require('../services/exchangeRateService');

/**
 * 매일 오후 2시에 환율 데이터 가져오기
 * 한국수출입은행 API는 오전 11시 이후에 업데이트되므로 오후 2시에 실행
 */
const startExchangeRateScheduler = () => {
  // 매일 오후 2시에 실행 (0 14 * * *)
  cron.schedule('0 14 * * *', async () => {
    try {
      console.log('환율 데이터 자동 업데이트 시작...');
      
      const today = new Date();
      const result = await fetchAndSaveExchangeRates(today);
      
      if (result.success) {
        console.log('환율 데이터 자동 업데이트 성공:', result.message);
      } else {
        console.log('환율 데이터 자동 업데이트 실패:', result.message);
      }
      
    } catch (error) {
      console.error('환율 데이터 자동 업데이트 에러:', error.message);
    }
  }, {
    timezone: 'Asia/Seoul'
  });

  console.log('환율 데이터 자동 업데이트 스케줄러가 시작되었습니다. (매일 오후 2시)');
};

/**
 * 수동으로 오늘 환율 데이터 가져오기
 */
const fetchTodayExchangeRates = async () => {
  try {
    console.log('오늘 환율 데이터 수동 가져오기...');
    
    const today = new Date();
    const result = await fetchAndSaveExchangeRates(today);
    
    return result;
  } catch (error) {
    console.error('오늘 환율 데이터 가져오기 실패:', error.message);
    throw error;
  }
};

module.exports = {
  startExchangeRateScheduler,
  fetchTodayExchangeRates
}; 
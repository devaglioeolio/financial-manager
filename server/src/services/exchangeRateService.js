const axios = require('axios');
const https = require('https');
const ExchangeRate = require('../models/ExchangeRate');

// 저장할 통화 목록
const TARGET_CURRENCIES = ['USD', 'EUR', 'JPY(100)', 'CNH', 'GBP', 'HKD', 'AUD', 'CAD', 'CHF', 'AED'];

// 통화 코드 매핑 (API에서 받은 값 -> 저장할 값)
const CURRENCY_MAPPING = {
  'JPY(100)': 'JPY',
  'CNH': 'CNY'
};

// 통화 이름 매핑
const CURRENCY_NAMES = {
  'USD': '미국 달러',
  'EUR': '유로',
  'JPY': '일본 엔',
  'CNY': '중국 위안',
  'GBP': '영국 파운드',
  'HKD': '홍콩 달러',
  'AUD': '호주 달러',
  'CAD': '캐나다 달러',
  'CHF': '스위스 프랑',
  'AED': '아랍에미리트 디르함'
};

/**
 * 날짜를 YYYYMMDD 형식으로 변환
 */
const formatDateForAPI = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * 한국수출입은행 API에서 환율 데이터 가져오기
 */
const fetchExchangeRatesFromAPI = async (searchDate) => {
  try {
    const apiKey = process.env.KOREAEXIM_APIKEY;
    if (!apiKey) {
      throw new Error('KOREAEXIM_APIKEY가 환경변수에 설정되지 않았습니다.');
    }

    console.log(`환율검색 날짜: ${searchDate}`);
    
    const url = `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${apiKey}&searchdate=${searchDate}&data=AP01`;
    
    // 원복: 기본 axios.get만 사용
    const response = await axios.get(url);
    
    console.log(`API 응답 상태: ${response.status}`);
    console.log(`API 응답 데이터 타입: ${typeof response.data}`);
    console.log(`API 응답 데이터 길이: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`);
    
    return response.data;
  } catch (error) {
    console.error('환율 API 호출 실패:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 헤더:', error.response.headers);
      console.error('응답 데이터:', error.response.data);
    }
    throw error;
  }
};

/**
 * 환율 데이터를 DB에 저장
 */
const saveExchangeRates = async (data, date) => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`${date}: [경고] 환율 데이터가 비어있습니다. 저장하지 않습니다.`);
      return { success: false, message: 'API 데이터 없음', data: [] };
    }

    // 저장할 통화만 필터링
    const filteredData = data.filter(item => TARGET_CURRENCIES.includes(item.cur_unit));
    
    if (filteredData.length === 0) {
      console.log(`${date}: [경고] 저장할 통화가 없습니다.`);
      return { success: false, message: '저장할 통화가 없음', data: [] };
    }

    const savedRates = [];
    
    for (const item of filteredData) {
      try {
        // 통화 코드 매핑
        const curUnit = CURRENCY_MAPPING[item.cur_unit] || item.cur_unit;
        
        // deal_bas_r에서 쉼표 제거 후 숫자로 변환
        const dealBasR = parseFloat(item.deal_bas_r.replace(/,/g, ''));
        
        const exchangeRate = new ExchangeRate({
          date: date,
          curUnit: curUnit,
          dealBasR: dealBasR,
          curNm: item.cur_nm
        });

        await exchangeRate.save();
        savedRates.push({
          curUnit: curUnit,
          dealBasR: dealBasR,
          curNm: item.cur_nm
        });
        
        console.log(`${date} ${curUnit}: ${dealBasR} 저장 완료`);
      } catch (saveError) {
        if (saveError.code === 11000) {
          console.log(`${date} ${item.cur_unit}: 이미 존재하는 데이터입니다.`);
        } else {
          console.error(`${date} ${item.cur_unit} 저장 실패:`, saveError.message);
        }
      }
    }

    if (savedRates.length === 0) {
      return { success: false, message: '실제 저장된 통화 없음', data: [] };
    }

    return { 
      success: true, 
      message: `${savedRates.length}개 통화 저장 완료`,
      data: savedRates 
    };
    
  } catch (error) {
    console.error('환율 데이터 저장 실패:', error.message);
    throw error;
  }
};

/**
 * 특정 날짜의 환율 데이터 가져와서 저장
 */
const fetchAndSaveExchangeRates = async (targetDate) => {
  try {
    const dateStr = typeof targetDate === 'string' ? targetDate : formatDateForAPI(targetDate);
    
    console.log(`${dateStr} 환율 데이터 가져오기 시작`);
    
    const data = await fetchExchangeRatesFromAPI(dateStr);
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`${dateStr}: [경고] API에서 환율 데이터가 오지 않았습니다. 저장하지 않습니다.`);
      return { success: false, message: 'API 데이터 없음', data: [] };
    }
    const result = await saveExchangeRates(data, dateStr);
    
    if (!result.success) {
      console.log(`${dateStr}: [경고] 환율 데이터 저장 실패 또는 저장할 데이터 없음.`);
    } else {
      console.log(`${dateStr} 환율 데이터 처리 완료:`, result.message);
    }
    return result;
    
  } catch (error) {
    console.error('환율 데이터 가져오기/저장 실패:', error.message);
    return { success: false, message: error.message, data: [] };
  }
};

/**
 * 가장 최근 환율 데이터 조회
 * 오늘 날짜 데이터가 없으면 명확히 안내
 */
const getLatestExchangeRates = async () => {
  try {
    const today = formatDateForAPI(new Date());
    // 오늘 날짜 데이터가 있으면 우선 반환
    let rates = await ExchangeRate.find({ date: today }).sort({ curUnit: 1 });
    if (rates.length > 0) {
      return rates;
    }
    // 오늘 데이터가 없으면 가장 최근 날짜 데이터 반환
    const latestDate = await ExchangeRate.findOne().sort({ date: -1 }).select('date');
    if (!latestDate) {
      throw new Error('저장된 환율 데이터가 없습니다.');
    }
    rates = await ExchangeRate.find({ date: latestDate.date }).sort({ curUnit: 1 });
    return rates;
  } catch (error) {
    console.error('최신 환율 데이터 조회 실패:', error.message);
    throw error;
  }
};

/**
 * 전일 대비 변동률 계산을 위한 이전 데이터 조회
 */
const getPreviousExchangeRates = async (currentDate) => {
  try {
    const previousRates = await ExchangeRate.find({ 
      date: { $lt: currentDate } 
    })
    .sort({ date: -1 })
    .limit(TARGET_CURRENCIES.length);

    // 통화별로 그룹화
    const ratesByUnit = {};
    for (const rate of previousRates) {
      if (!ratesByUnit[rate.curUnit]) {
        ratesByUnit[rate.curUnit] = rate;
      }
    }

    return ratesByUnit;
  } catch (error) {
    console.error('이전 환율 데이터 조회 실패:', error.message);
    return {};
  }
};

/**
 * 환율 변동률 계산 후 반환
 */
const getExchangeRatesWithChange = async () => {
  try {
    const latestRates = await getLatestExchangeRates();
    
    if (latestRates.length === 0) {
      return [];
    }

    const currentDate = latestRates[0].date;
    const previousRates = await getPreviousExchangeRates(currentDate);

    const result = latestRates.map(rate => {
      const previousRate = previousRates[rate.curUnit];
      let change = 0;
      let changePercent = 0;

      if (previousRate) {
        change = rate.dealBasR - previousRate.dealBasR;
        changePercent = (change / previousRate.dealBasR) * 100;
      }

      return {
        currency: rate.curUnit,
        currencyName: CURRENCY_NAMES[rate.curUnit] || rate.curNm,
        rate: rate.dealBasR,
        change: Math.round(change * 100) / 100, // 소수점 둘째 자리까지
        changePercent: Math.round(changePercent * 100) / 100, // 소수점 둘째 자리까지
        lastUpdate: new Date().toISOString()
      };
    });

    return result;
  } catch (error) {
    console.error('환율 변동률 계산 실패:', error.message);
    throw error;
  }
};

/**
 * 초기 데이터 저장 (20250604, 20250605)
 */
const initializeExchangeRates = async () => {
  try {
    console.log('환율 초기 데이터 저장 시작...');
    
    const dates = ['20250604', '20250605'];
    const results = [];
    
    for (const date of dates) {
      try {
        const result = await fetchAndSaveExchangeRates(date);
        results.push({ date, ...result });
      } catch (error) {
        console.error(`${date} 데이터 저장 실패:`, error.message);
        results.push({ date, success: false, message: error.message });
      }
    }
    
    console.log('환율 초기 데이터 저장 완료');
    return results;
  } catch (error) {
    console.error('환율 초기 데이터 저장 실패:', error.message);
    throw error;
  }
};

/**
 * 오늘 날짜 환율 데이터 존재 여부 확인
 */
const checkTodayExchangeRatesExist = async () => {
  try {
    const today = formatDateForAPI(new Date());
    const count = await ExchangeRate.countDocuments({ date: today });
    return count > 0;
  } catch (error) {
    console.error('오늘 환율 데이터 확인 실패:', error.message);
    return false;
  }
};

/**
 * 서버 시작 시 오늘 환율 데이터 체크 및 가져오기
 * 오후 2시 이후이고 오늘 데이터가 없으면 가져옴
 */
const checkAndFetchTodayExchangeRates = async () => {
  try {
    const now = new Date();
    const hour = now.getHours();
    
    console.log('서버 시작 시 환율 데이터 체크 시작...');
    
    // 오전 11시 이전이면 아직 환율이 업데이트되지 않았으므로 체크하지 않음
    if (hour < 11) {
      console.log('오전 11시 이전이므로 환율 데이터 체크를 건너뜁니다.');
      return { success: false, message: '너무 이른 시간' };
    }
    
    const todayExists = await checkTodayExchangeRatesExist();
    
    if (todayExists) {
      console.log('오늘 환율 데이터가 이미 존재합니다.');
      return { success: true, message: '이미 존재함' };
    }
    
    console.log('오늘 환율 데이터가 없습니다. 가져오기 시작...');
    const result = await fetchAndSaveExchangeRates(now);
    
    if (result.success) {
      console.log('서버 시작 시 환율 데이터 가져오기 성공:', result.message);
    } else {
      console.log('서버 시작 시 환율 데이터 가져오기 실패:', result.message);
    }
    
    return result;
    
  } catch (error) {
    console.error('서버 시작 시 환율 데이터 체크 실패:', error.message);
    return { success: false, message: error.message };
  }
};

module.exports = {
  fetchAndSaveExchangeRates,
  getLatestExchangeRates,
  getExchangeRatesWithChange,
  initializeExchangeRates,
  formatDateForAPI,
  checkAndFetchTodayExchangeRates
}; 
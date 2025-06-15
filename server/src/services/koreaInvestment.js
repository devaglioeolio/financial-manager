const axios = require('axios');
const tokenManager = require('./koreaInvestmentToken');

/**
 * 한국투자증권 API 서비스
 * API 문서: https://apiportal.koreainvestment.com
 */

/**
 * 해외주식 기간별 시세  조회
 * @param {string} symbol - 종목코드 (예: AAPL, TSLA)
 * @param {string} period - 조회기간 (D: 일봉, W: 주봉, M: 월봉) - 기본값: D
 * @param {string} startDate - 시작일자 (YYYYMMDD) - 선택사항
 * @param {string} endDate - 종료일자 (YYYYMMDD) - 선택사항
 */
const getOverseasDailyChart = async (symbol, period = 'D', startDate = '', endDate = '') => {
  try {
    const apiDomain = process.env.KOREA_INV_APIDOMAIN;
    const appKey = process.env.KOREA_INV_APPKEY;
    const appSecret = process.env.KOREA_INV_APPSECRET;
    
    if (!apiDomain || !appKey || !appSecret) {
      throw new Error('한국투자증권 API 환경변수가 설정되지 않았습니다.');
    }

    // 토큰 발급
    const accessToken = await tokenManager.getRestToken();
    
    const url = `${apiDomain}/uapi/overseas-price/v1/quotations/inquire-daily-chartprice`;
    
    // 날짜가 없는 경우 기본값 설정 (최근 1일만)
    if (!startDate && !endDate) {
      const today = new Date();
      const yesterday = new Date(today.getTime() - (1 * 24 * 60 * 60 * 1000));
      
      // 날짜를 YYYYMMDD 형식으로 변환
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
      };
      
      startDate = formatDate(yesterday);
      endDate = formatDate(today);
    }
    
    // 헤더 설정
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'authorization': `Bearer ${accessToken}`,
      'appkey': appKey,
      'appsecret': appSecret,
      'tr_id': 'FHKST03030100', // 해외주식 일봉차트 TR ID
      'custtype': 'P' // 개인
    };

    // 쿼리 파라미터 설정
    const params = {
      FID_COND_MRKT_DIV_CODE: 'N', // 시장구분코드 (N: 해외지수, X 환율, I: 국채, S:금선물)
      FID_INPUT_ISCD: symbol, // 종목코드
      FID_INPUT_DATE_1: startDate, // 시작일자
      FID_INPUT_DATE_2: endDate, // 종료일자
      FID_PERIOD_DIV_CODE: period // 기간구분코드
    };

    console.log(`한국투자증권 API 호출: ${symbol} 기간별 시세 조회`);

    const response = await axios.get(url, {
      headers,
      params
    });

    const data = response.data;
    
    // API 에러 체크
    if (data.rt_cd !== '0') {
      throw new Error(`한국투자증권 API 에러: ${data.msg1}`);
    }

    // 응답 데이터 가공
    const basicDataRaw = data.output1 || {};
    const chartData = data.output2 || [];
    
    const formattedData = chartData.map(item => ({
      date: item.stck_bsop_date, // 영업일자
      open: parseFloat(item.ovrs_nmix_oprc), // 시가
      high: parseFloat(item.ovrs_nmix_hgpr), // 고가
      low: parseFloat(item.ovrs_nmix_lwpr), // 저가
      close: parseFloat(item.ovrs_nmix_prpr), // 종가
      volume: parseInt(item.acml_vol), // 누적거래량
    }));

    // basicData 처리 - output1은 항상 객체
    const basicData = basicDataRaw ? [{
      open: parseFloat(basicDataRaw.ovrs_prod_oprc) || 0,
      high: parseFloat(basicDataRaw.ovrs_prod_hgpr) || 0,
      low: parseFloat(basicDataRaw.ovrs_prod_lwpr) || 0,
      now: parseFloat(basicDataRaw.ovrs_nmix_prpr) || 0,
      close: parseFloat(basicDataRaw.ovrs_nmix_prpr) || 0,
      yesterday_close: parseFloat(basicDataRaw.ovrs_nmix_prdy_clpr) || 0,
      change: parseFloat(basicDataRaw.ovrs_nmix_prdy_vrss) || 0,
      change_percent: parseFloat(basicDataRaw.prdy_ctrt) || 0,
      name: basicDataRaw.hts_kor_isnm || '',
      code: basicDataRaw.stck_shrn_iscd || '',
    }] : [];

    const result = {
      symbol: symbol,
      period: period,
      basicData: basicData,
      data: formattedData,
      totalCount: chartData.length,
      message: data.msg1
    };
    
    console.log(`=== ${symbol} 최종 리턴 데이터 ===`);
    console.log('result:', JSON.stringify(result.basicData, null, 2));
    
    return result;

  } catch (error) {
    console.error(`한국투자증권 API 호출 실패 (${symbol}):`, error.message);
    throw error;
  }
};

/**
 * 해외주식 현재가 조회
 * @param {string} symbol - 종목코드
 * @param {string} excd - 거래소코드 (NAS: 나스닥, NYS: 뉴욕)
 */
const getOverseasCurrentPrice = async (symbol, excd = 'NAS') => {
  try {
    const apiDomain = process.env.KOREA_INV_APIDOMAIN;
    const appKey = process.env.KOREA_INV_APPKEY;
    const appSecret = process.env.KOREA_INV_APPSECRET;

    const accessToken = await tokenManager.getRestToken();
    
    const url = `${apiDomain}/uapi/overseas-price/v1/quotations/price`;
    
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'authorization': `Bearer ${accessToken}`,
      'appkey': appKey,
      'appsecret': appSecret,
      'tr_id': 'HHDFS00000300', // 해외주식 현재가 TR ID
      'custtype': 'P'
    };

    const params = {
      AUTH: '',
      EXCD: excd, // 거래소코드 (NAS: 나스닥, NYS: 뉴욕)
      SYMB: symbol
    };

    console.log(`한국투자증권 API 호출: ${symbol} 현재가 조회`);

    const response = await axios.get(url, {
      headers,
      params
    });

    const data = response.data;
    
    if (data.rt_cd !== '0') {
      throw new Error(`한국투자증권 API 에러: ${data.msg1}`);
    }

    const output = data.output;
    
    const result = {
      symbol: symbol,
      price: parseFloat(output.last), // 현재가
      change: parseFloat(output.diff), // 전일대비
      changePercent: parseFloat(output.rate), // 등락률
      open: parseFloat(output.open), // 시가
      volume: parseInt(output.tvol), // 거래량
      currency: 'USD',
      lastUpdate: new Date().toISOString()
    };
    
    console.log(`=== ${symbol} 현재가 조회 결과 ===`);
    console.log('결과:', JSON.stringify(result, null, 2));
    
    return result;

  } catch (error) {
    console.error(`한국투자증권 API 호출 실패 (${symbol}):`, error.message);
    throw error;
  }
};

module.exports = {
  getOverseasDailyChart,
  getOverseasCurrentPrice
};
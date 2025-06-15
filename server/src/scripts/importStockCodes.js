const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const StockCode = require('../models/StockCode');
const dotenv = require('dotenv');

dotenv.config();

// MongoDB 연결
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB 연결 성공');
  } catch (error) {
    console.error('MongoDB 연결 실패:', error);
    process.exit(1);
  }
};

// 개선된 파싱 함수
const parseStockCodeFile = (filePath, market) => {
  const data = fs.readFileSync(filePath, 'utf8');
  const lines = data.split('\n').filter(line => line.trim());
  
  const stocks = [];
  
  for (const line of lines) {
    try {
      // 라인에서 패턴 매칭으로 데이터 추출
      // 예: US      22      NAS     ...     AACB    NAS...     ARTIUS II ACQUISITION INC
      
      const parts = line.split(/\s+/).filter(part => part.trim());
      if (parts.length < 10) continue;
      
      let ticker = '';
      let englishName = '';
      let stockType = '';
      
      // NAS + 티커 패턴 찾기 (NASAACB, NASAAPL 등) 또는 AMS + 티커 패턴 찾기 또는 NYS + 티커 패턴 찾기
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if ((part.startsWith('NAS') || part.startsWith('AMS') || part.startsWith('NYS')) && part.length > 3) {
          ticker = part.substring(3); // NAS, AMS, NYS 제거
          break;
        }
      }
      
      // 영어 회사명 찾기 (대문자 + 특정 패턴)
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        // 대문자로 시작하고 길이가 적당한 단어들
        if (part && part.length > 3 && /^[A-Z][A-Z\s]+/.test(part) && 
            !part.startsWith('NAS') && !part.startsWith('AMS') && !part.startsWith('NYS') && part !== ticker && 
            !part.match(/^US$|^\d+$|^USD$/)) {
          
          englishName = part;
          
          // 다음 단어들도 회사명의 일부인지 확인
          let j = i + 1;
          while (j < parts.length && parts[j] && 
                 /^[A-Z&.,'-]+$/.test(parts[j]) && 
                 !parts[j].match(/^\d/) && 
                 parts[j] !== 'USD') {
            englishName += ' ' + parts[j];
            j++;
            if (j - i > 10) break; // 너무 길어지면 중단
          }
          break;
        }
      }
      
      // 종목 타입 찾기 (USD 앞의 숫자)
      const typeMatch = line.match(/\s+(\d)\s+USD/);
      if (typeMatch) {
        stockType = typeMatch[1];
      }
      
      // 유효한 데이터인지 확인
      if (ticker && ticker.length >= 1 && ticker.length <= 5 && 
          englishName && englishName.length > 3) {
        
        stocks.push({
          market,
          ticker: ticker.toUpperCase(),
          koreanName: null,
          englishName: englishName.trim(),
          stockType: stockType || null,
          currency: 'USD',
          isActive: true
        });
      }
      
    } catch (error) {
      console.warn('라인 파싱 실패:', error.message);
      continue;
    }
  }
  
  return stocks;
};

// DB에 종목 저장
const saveStockCodes = async (stocks) => {
  let savedCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  
  for (const stock of stocks) {
    try {
      await StockCode.findOneAndUpdate(
        { market: stock.market, ticker: stock.ticker },
        stock,
        { upsert: true, new: true }
      );
      savedCount++;
      
      if (savedCount % 100 === 0) {
        console.log(`진행 상황: ${savedCount}개 처리 완료...`);
      }
    } catch (error) {
      if (error.code === 11000) {
        duplicateCount++;
      } else {
        console.error('저장 실패:', stock.ticker, error.message);
        errorCount++;
      }
    }
  }
  
  return { savedCount, duplicateCount, errorCount };
};

// 메인 실행 함수
const main = async () => {
  console.log('🚀 종목코드 임포트 시작...');
  
  try {
    await connectDB();
    
    // 파일 경로들 (NYS만 처리)
    const files = [
      // {
      //   path: '/mnt/c/Users/woongki/Downloads/nasmst.cod (1)/NASMST.txt',
      //   market: 'NAS'  // 나스닥 (이미 처리 완료)
      // },
      // {
      //   path: '/mnt/c/Users/woongki/Downloads/amsmst.cod/AMSMST.txt',
      //   market: 'AMS'  // 아멕스 (이미 처리 완료)
      // },
      {
        path: '/mnt/c/Users/woongki/Downloads/nysmst.cod/NYSMST.txt',
        market: 'NYS'  // 뉴욕거래소
      }
    ];
    
    let totalSaved = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;
    
    for (const file of files) {
      if (fs.existsSync(file.path)) {
        console.log(`\n📁 ${file.market} 파일 처리 중: ${file.path}`);
        
        const stocks = parseStockCodeFile(file.path, file.market);
        console.log(`📊 파싱된 종목 수: ${stocks.length}`);
        
        // 처음 5개 샘플 출력
        if (stocks.length > 0) {
          console.log('\n샘플 데이터:');
          stocks.slice(0, 5).forEach(stock => {
            console.log(`- ${stock.ticker}: ${stock.englishName}`);
          });
          
          const result = await saveStockCodes(stocks);
          console.log(`\n✅ 저장 완료: ${result.savedCount}개`);
          console.log(`⚠️  중복 처리: ${result.duplicateCount}개`);
          console.log(`❌ 오류: ${result.errorCount}개`);
          
          totalSaved += result.savedCount;
          totalDuplicates += result.duplicateCount;
          totalErrors += result.errorCount;
        }
      } else {
        console.log(`❌ 파일 없음: ${file.path}`);
      }
    }
    
    console.log('\n🎉 전체 임포트 완료!');
    console.log(`📊 총 저장: ${totalSaved}개`);
    console.log(`⚠️  총 중복: ${totalDuplicates}개`);
    console.log(`❌ 총 오류: ${totalErrors}개`);
    
  } catch (error) {
    console.error('❌ 임포트 실패:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB 연결 종료');
  }
};

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { parseStockCodeFile, saveStockCodes }; 
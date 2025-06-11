const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { createHistoricalSnapshots } = require('../services/dailySnapshotService');
const User = require('../models/User');

// 환경변수 로드
dotenv.config();

const createJuneHistoricalData = async () => {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB 연결 성공');

    // 모든 사용자 조회
    const users = await User.find({});
    console.log(`총 ${users.length}명의 사용자를 찾았습니다.`);

    // 6월 6일부터 10일까지의 데이터 생성 (2025년)
    const startDate = '2025-06-06';
    const endDate = '2025-06-10';

    for (const user of users) {
      console.log(`\n=== 사용자 ${user.username} (${user._id})의 히스토리 데이터 생성 중... ===`);
      
      try {
        const results = await createHistoricalSnapshots(user._id, startDate, endDate);
        
        console.log('생성 결과:');
        results.forEach(result => {
          if (result.success) {
            console.log(`✅ ${result.date}: ₩${result.totalAsset?.toLocaleString()}`);
          } else {
            console.log(`❌ ${result.date}: ${result.error}`);
          }
        });
        
      } catch (error) {
        console.error(`사용자 ${user.username}의 데이터 생성 실패:`, error.message);
      }
    }

    console.log('\n=== 모든 히스토리 데이터 생성 완료 ===');
    
  } catch (error) {
    console.error('스크립트 실행 실패:', error);
  } finally {
    // MongoDB 연결 종료
    await mongoose.disconnect();
    console.log('MongoDB 연결 종료');
    process.exit(0);
  }
};

// 스크립트 실행
if (require.main === module) {
  console.log('=== 6월 6일~10일 히스토리 데이터 생성 스크립트 시작 ===');
  createJuneHistoricalData();
}

module.exports = { createJuneHistoricalData }; 
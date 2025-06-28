const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { createNotification } = require('../controllers/notificationController');
const User = require('../models/User');

// 환경변수 설정
dotenv.config();

// MongoDB 연결
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB 연결 성공');
  } catch (error) {
    console.error('MongoDB 연결 실패:', error);
    process.exit(1);
  }
};

// 테스트 알림 생성
const createTestNotifications = async () => {
  try {
    // 첫 번째 사용자 찾기
    const user = await User.findOne();
    if (!user) {
      console.log('사용자를 찾을 수 없습니다.');
      return;
    }

    console.log(`사용자 ${user._id}에 대한 테스트 알림 생성 중...`);

    // 다양한 타입의 테스트 알림 생성
    const testNotifications = [
      {
        type: 'STOCK_SURGE',
        title: '📈 AAPL 급등 알림!',
        message: 'Apple Inc.이 6.2% 상승했습니다. 현재가: $185.50',
        data: {
          ticker: 'AAPL',
          market: 'NAS',
          currentPrice: 185.50,
          changePercent: 6.2,
          change: 10.85
        },
        priority: 'HIGH'
      },
      {
        type: 'STOCK_PLUNGE',
        title: '📉 TSLA 급락 주의!',
        message: 'Tesla Inc.이 4.8% 하락했습니다. 현재가: $245.30',
        data: {
          ticker: 'TSLA',
          market: 'NAS',
          currentPrice: 245.30,
          changePercent: -4.8,
          change: -12.40
        },
        priority: 'HIGH'
      },
      {
        type: 'PORTFOLIO_MILESTONE',
        title: '🎉 포트폴리오 신고점 달성!',
        message: '총 자산이 ₩52,500,000원으로 신고점을 경신했습니다!',
        data: {
          currentTotal: 52500000,
          milestone: 'highest'
        },
        priority: 'HIGH'
      },
      {
        type: 'EXCHANGE_RATE_CHANGE',
        title: '💱 달러 환율 상승!',
        message: 'USD/KRW가 +45원 변동했습니다. 현재: 1,385원',
        data: {
          currency: 'USD',
          currentRate: 1385,
          previousRate: 1340,
          difference: 45,
          changePercent: 3.36
        },
        priority: 'MEDIUM'
      },
      {
        type: 'GOAL_PROGRESS',
        title: '🏆 목표 달성률 80%!',
        message: '\'내년까지 5천만원\' 목표가 80% 달성되었습니다!',
        data: {
          goalTitle: '내년까지 5천만원',
          milestone: 80,
          currentProgress: 82.5,
          currentAmount: 4125000,
          targetAmount: 5000000
        },
        priority: 'HIGH'
      },
      {
        type: 'SYSTEM',
        title: '📊 일일 요약',
        message: '오늘의 금융 현황: 관심종목 8개 확인, 총 자산 ₩52,500,000, 환율 정보 업데이트',
        data: {
          summaryType: 'daily',
          date: new Date().toISOString().split('T')[0]
        },
        priority: 'LOW'
      }
    ];

    // 각 테스트 알림 생성
    for (const notification of testNotifications) {
      const result = await createNotification(
        user._id,
        notification.type,
        notification.title,
        notification.message,
        notification.data,
        notification.priority
      );
      
      if (result) {
        console.log(`✅ ${notification.type} 알림 생성 완료`);
      } else {
        console.log(`❌ ${notification.type} 알림 생성 실패 (설정에 의해 차단됨)`);
      }
      
      // 각 알림 사이에 약간의 딜레이
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('🎉 모든 테스트 알림 생성 완료!');
  } catch (error) {
    console.error('테스트 알림 생성 실패:', error);
  }
};

// 스크립트 실행
const main = async () => {
  await connectDB();
  await createTestNotifications();
  process.exit(0);
};

// 직접 실행 시
if (require.main === module) {
  main();
}

module.exports = { createTestNotifications }; 
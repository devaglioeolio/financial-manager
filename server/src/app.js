const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');
const goalRoutes = require('./routes/goalRoutes');
const assetSnapshotRoutes = require('./routes/assetSnapshots');
const koreaInvRoutes = require('./routes/koreaInv');
const stockCodeRoutes = require('./routes/stockCodes');
const watchlistRoutes = require('./routes/watchlist');
const notificationRoutes = require('./routes/notifications');
const rsLeaderRoutes = require('./routes/rsLeaders');
const simpleRSRoutes = require('./routes/simpleRS');
const { startExchangeRateScheduler } = require('./schedulers/exchangeRateScheduler');
const { startDailySnapshotScheduler } = require('./schedulers/dailySnapshotScheduler');
const { startAllNotificationSchedulers } = require('./schedulers/notificationScheduler');
const { createMissingSnapshotsForAllUsers } = require('./services/dailySnapshotService');
const tokenManager = require('./services/koreaInvestmentToken');
const websocketProxy = require('./services/websocketProxy');
const simpleRSService = require('./services/simpleRSService');

// 환경변수 설정
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 기본 미들웨어 설정
app.use(express.json());
app.use(cookieParser());

// CORS 설정
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// 라우트 설정
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/asset-snapshots', assetSnapshotRoutes);
app.use('/api/korea-inv', koreaInvRoutes);
app.use('/api/stock-codes', stockCodeRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/rs-leaders', rsLeaderRoutes);
app.use('/api/simple-rs', simpleRSRoutes);

// 기본 라우트 핸들러
app.get('/', (req, res) => {
  res.send('Finance Manager 서버가 실행 중입니다!');
});

// API 상태 확인 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API 서버가 정상 작동 중입니다.',
    timestamp: new Date().toISOString(),
    routes: {
      assets: '/api/assets',
      auth: '/api/auth'
    }
  });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ message: '요청한 리소스를 찾을 수 없습니다.' });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '서버 에러가 발생했습니다.' });
});


process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; //unable to verify the first certificate 에러 해결

// MongoDB 연결
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB 연결 성공');
  
  // 환율 데이터 자동 업데이트 스케줄러 시작
  await startExchangeRateScheduler();
  
  // 일별 자산 스냅샷 스케줄러 시작
  await startDailySnapshotScheduler();
  
  // 알림 시스템 스케줄러 시작
  startAllNotificationSchedulers();
  
  // 한국투자증권 토큰 초기화 (10초 지연)
  tokenManager.initializeTokens();
  
  // WebSocket 프록시 서버 시작
  websocketProxy.startProxyServer(8080);
  console.log('WebSocket 프록시 서버가 8080 포트에서 시작되었습니다.');
  
  // Simple RS 서비스 초기화
  simpleRSService.initialize();
  
  // 서버 시작 시 누락된 스냅샷들을 백필 (최근 7일)
  setTimeout(async () => {
    try {
      console.log('🔄 서버 시작 시 누락된 스냅샷 백필 실행...');
      await createMissingSnapshotsForAllUsers(7);
      console.log('✅ 누락된 스냅샷 백필 완료');
    } catch (error) {
      console.error('❌ 누락된 스냅샷 백필 실패:', error);
    }
  }, 15000); // 서버가 완전히 시작된 후 15초 뒤 실행
})
.catch((err) => console.error('MongoDB 연결 실패:', err));

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 
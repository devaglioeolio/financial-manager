const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');
const goalRoutes = require('./routes/goalRoutes');
const assetSnapshotRoutes = require('./routes/assetSnapshots');
const { startExchangeRateScheduler } = require('./schedulers/exchangeRateScheduler');
const { startDailySnapshotScheduler } = require('./schedulers/dailySnapshotScheduler');

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

// 기본 라우트 핸들러
app.get('/', (req, res) => {
  res.send('Finance Manager 서버가 실행 중입니다!');
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
})
.catch((err) => console.error('MongoDB 연결 실패:', err));

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 
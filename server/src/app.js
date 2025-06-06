const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');
const goalRoutes = require('./routes/goalRoutes');

// 환경변수 설정
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 기본 미들웨어 설정
app.use(express.json());
app.use(cookieParser());

// CORS 설정
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// 라우트 설정
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/goals', goalRoutes);

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

// MongoDB 연결
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB 연결 성공'))
.catch((err) => console.error('MongoDB 연결 실패:', err));

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 
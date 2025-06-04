const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./src/routes/auth');
const assetRoutes = require('./src/routes/assets');

// 환경변수 설정
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어
app.use(cors());
app.use(express.json());

// MongoDB 연결
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB 연결 성공'))
.catch((err) => console.error('MongoDB 연결 실패:', err));

// 라우트
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.send('Finance Manager 서버가 실행 중입니다!');
});

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 
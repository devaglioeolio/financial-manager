const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const token = authHeader.split(' ')[1];

    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 사용자 찾기
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: '유효하지 않은 사용자입니다.' });
    }

    // 요청 객체에 사용자 정보 추가
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name
    };

    next();
  } catch (error) {
    console.error('인증 에러:', error);
    
    // JWT 토큰 만료 에러 처리
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: '토큰이 만료되었습니다. 다시 로그인해주세요.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    // JWT 토큰 형식 에러 처리
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: '유효하지 않은 토큰입니다.',
        code: 'INVALID_TOKEN'
      });
    }
    
    // 기타 에러
    res.status(401).json({ message: '인증에 실패했습니다.' });
  }
}; 
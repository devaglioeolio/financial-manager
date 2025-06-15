const mongoose = require('mongoose');

const stockCodeSchema = new mongoose.Schema({
  // 상장된 시장 (NASDAQ, NYSE, AMEX 등)
  market: {
    type: String,
    required: true,
    enum: ['NAS', 'NYS', 'AMS'],
    index: true
  },
  
  // 영문 티커명 (AAPL, GOOGL 등)
  ticker: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  
  // 한글 회사명
  koreanName: {
    type: String,
    required: false,
    trim: true
  },
  
  // 영어 회사명
  englishName: {
    type: String,
    required: true,
    trim: true
  },
  
  // 종목 타입 (2: 보통주, 3: ETF 등)
  stockType: {
    type: String,
    required: false
  },
  
  // 통화 (USD)
  currency: {
    type: String,
    default: 'USD'
  },
  
  // 활성 상태
  isActive: {
    type: Boolean,
    default: true
  },
  
  // 마지막 업데이트 시간
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 복합 인덱스 (시장 + 티커 조합은 유니크)
stockCodeSchema.index({ market: 1, ticker: 1 }, { unique: true });

// 텍스트 검색용 인덱스
stockCodeSchema.index({ 
  ticker: 'text', 
  koreanName: 'text', 
  englishName: 'text' 
});

module.exports = mongoose.model('StockCode', stockCodeSchema); 
const mongoose = require('mongoose');

const exchangeRateSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    index: true // 날짜로 검색할 일이 많으므로 인덱스 추가
  },
  curUnit: {
    type: String,
    required: true,
    index: true // 통화 코드로 검색할 일이 많으므로 인덱스 추가
  },
  dealBasR: {
    type: Number,
    required: true
  },
  curNm: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// 날짜와 통화 코드의 조합으로 유니크 인덱스 생성
exchangeRateSchema.index({ date: 1, curUnit: 1 }, { unique: true });

const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);

module.exports = ExchangeRate; 
const mongoose = require('mongoose');

const stockPriceHistorySchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    index: true
  },
  market: {
    type: String,
    required: true,
    enum: ['NAS', 'NYS', 'AMS', 'TSE', 'HKS', 'SHS', 'SZS']
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  openPrice: {
    type: Number,
    required: true
  },
  highPrice: {
    type: Number,
    required: true
  },
  lowPrice: {
    type: Number,
    required: true
  },
  closePrice: {
    type: Number,
    required: true
  },
  volume: {
    type: Number,
    default: 0
  },
  changePercent: {
    type: Number,
    default: 0
  },
  relativeStrength: {
    type: Number,
    default: 0,
    index: true
  },
  relativeStrengthRank: {
    type: Number,
    default: 0
  },
  pricePerformance: {
    type: Map,
    of: Number,
    default: {}
  },
  benchmarkUsed: {
    type: String,
    default: null // RS 계산에 사용된 벤치마크 지수 (SPY, QQQ 등)
  }
}, {
  timestamps: true
});

// 복합 인덱스 생성
stockPriceHistorySchema.index({ symbol: 1, date: 1 }, { unique: true });
stockPriceHistorySchema.index({ market: 1, date: 1 });
stockPriceHistorySchema.index({ relativeStrength: -1, date: 1 });

// 정적 메서드들
stockPriceHistorySchema.statics.getMarketData = function(market, startDate, endDate) {
  return this.find({
    market: market,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1 });
};

stockPriceHistorySchema.statics.getTopRS = function(market, date, limit = 50) {
  return this.find({
    market: market,
    date: date
  })
  .sort({ relativeStrength: -1 })
  .limit(limit);
};

stockPriceHistorySchema.statics.getSymbolHistory = function(symbol, startDate, endDate) {
  return this.find({
    symbol: symbol,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1 });
};

module.exports = mongoose.model('StockPriceHistory', stockPriceHistorySchema); 
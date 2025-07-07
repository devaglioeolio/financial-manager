const mongoose = require('mongoose');

const marketIndexSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    enum: ['SPY', 'QQQ', 'DIA', 'IXIC', 'SPX', 'DJI'], // 주요 시장 지수
    index: true
  },
  name: {
    type: String,
    required: true
  },
  market: {
    type: String,
    required: true,
    enum: ['US', 'NAS', 'NYS'] // 시장 구분
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
  performance: {
    // 다양한 기간의 성과 저장
    '1d': { type: Number, default: 0 },
    '5d': { type: Number, default: 0 },
    '10d': { type: Number, default: 0 },
    '20d': { type: Number, default: 0 },
    '30d': { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// 복합 인덱스 생성
marketIndexSchema.index({ symbol: 1, date: 1 }, { unique: true });
marketIndexSchema.index({ market: 1, date: 1 });

// 정적 메서드들
marketIndexSchema.statics.getIndexData = function(symbol, startDate, endDate) {
  return this.find({
    symbol: symbol,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1 });
};

marketIndexSchema.statics.getMarketIndexes = function(market, date) {
  return this.find({
    market: market,
    date: date
  });
};

marketIndexSchema.statics.getLatestIndex = function(symbol) {
  return this.findOne({
    symbol: symbol
  }).sort({ date: -1 });
};

// 성과 계산 메서드
marketIndexSchema.statics.calculateIndexPerformance = function(symbol, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        symbol: symbol,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $sort: { date: 1 }
    },
    {
      $group: {
        _id: null,
        startPrice: { $first: '$closePrice' },
        endPrice: { $last: '$closePrice' },
        dates: { $push: '$date' }
      }
    },
    {
      $project: {
        performance: {
          $multiply: [
            { $divide: [
              { $subtract: ['$endPrice', '$startPrice'] },
              '$startPrice'
            ]},
            100
          ]
        },
        startPrice: 1,
        endPrice: 1,
        startDate: { $arrayElemAt: ['$dates', 0] },
        endDate: { $arrayElemAt: ['$dates', -1] }
      }
    }
  ]);
};

module.exports = mongoose.model('MarketIndex', marketIndexSchema); 
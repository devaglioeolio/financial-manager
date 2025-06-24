const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  market: {
    type: String,
    required: true,
    enum: ['NAS', 'NYS', 'AMS'],
    index: true
  },
  ticker: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  englishName: {
    type: String,
    required: true,
    trim: true
  },
  koreanName: {
    type: String,
    required: false,
    trim: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 사용자별 + 시장별 + 티커별 유니크 인덱스 (중복 방지)
watchlistSchema.index({ userId: 1, market: 1, ticker: 1 }, { unique: true });

// 사용자별 관심종목 조회 최적화
watchlistSchema.index({ userId: 1, addedAt: -1 });

module.exports = mongoose.model('Watchlist', watchlistSchema); 
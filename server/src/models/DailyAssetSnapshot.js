const mongoose = require('mongoose');

const dailyAssetSnapshotSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String, // YYYY-MM-DD 형식
    required: true,
    index: true
  },
  totalAssetKRW: {
    type: Number,
    required: true
  },
  categories: [{
    mainCategory: {
      type: String,
      required: true
    },
    categoryName: String,
    totalAmountKRW: {
      type: Number,
      required: true
    },
    subCategories: [{
      subCategory: {
        type: String,
        required: true
      },
      categoryName: String,
      totalAmountKRW: {
        type: Number,
        required: true
      },
      assets: [{
        assetId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Asset'
        },
        name: String,
        mainCategory: String,
        subCategory: String,
        totalQuantity: Number,
        totalAmountKRW: Number,
        // 해외주식의 경우 추가 정보
        currentPriceUSD: Number,
        exchangeRateUSD: Number,
        avgPurchasePriceUSD: Number
      }]
    }]
  }],
  exchangeRates: {
    USD: Number,
    EUR: Number,
    JPY: Number,
    CNY: Number
  },
  stockPrices: [{
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset'
    },
    symbol: String,
    priceUSD: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 사용자별, 날짜별 유니크 인덱스
dailyAssetSnapshotSchema.index({ userId: 1, date: 1 }, { unique: true });

// 정적 메서드들
dailyAssetSnapshotSchema.statics.getDateRange = function(userId, startDate, endDate) {
  return this.find({
    userId: userId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1 });
};

dailyAssetSnapshotSchema.statics.getLatest = function(userId) {
  return this.findOne({ userId: userId }).sort({ date: -1 });
};

module.exports = mongoose.model('DailyAssetSnapshot', dailyAssetSnapshotSchema); 
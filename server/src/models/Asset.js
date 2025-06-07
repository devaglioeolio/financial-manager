const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const assetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mainCategory: {
    type: String,
    required: true,
    enum: ['STOCK', 'CASH', 'SUBSCRIPTION', 'CRYPTO', 'PENSION', 'RETIREMENT', 'INSURANCE', 'OTHER']
  },
  subCategory: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  totalQuantity: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'KRW'
  },
  transactions: [transactionSchema],
  details: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// 메인 카테고리별 한글 이름 매핑
assetSchema.statics.mainCategoryNames = {
  STOCK: '주식',
  CASH: '현금',
  SUBSCRIPTION: '청약',
  CRYPTO: '암호화폐',
  PENSION: '연금',
  RETIREMENT: '퇴직금',
  INSURANCE: '보험',
  OTHER: '기타'
};

// 서브 카테고리 매핑
assetSchema.statics.subCategories = {
  STOCK: ['DOMESTIC', 'FOREIGN'],
  CASH: ['CHECKING', 'SAVINGS'],
  SUBSCRIPTION: ['HOUSING'],
  CRYPTO: ['CRYPTO'],
  PENSION: ['FUND', 'PUBLIC', 'OTHER'],
  RETIREMENT: ['PRIVATE', 'PUBLIC'],
  INSURANCE: ['PENSION', 'OTHER'],
  OTHER: ['OTHER']
};

// 서브 카테고리 한글 이름 매핑
assetSchema.statics.subCategoryNames = {
  // 주식
  DOMESTIC: '국내주식',
  FOREIGN: '해외주식',
  
  // 현금/예금
  CHECKING: '입출금계좌',
  SAVINGS: '예적금',
  
  // 청약
  HOUSING: '주택청약',
  
  // 연금/보험
  PRIVATE: '개인',
  PUBLIC: '공적',
  FUND: '펀드',
  OTHER: '기타',
  PENSION: '연금',
  
  CRYPTO: '암호화폐'
};

// 카테고리 유효성 검사 미들웨어
assetSchema.pre('save', function(next) {
  const validSubCategories = Asset.subCategories[this.mainCategory];
  if (!validSubCategories.includes(this.subCategory)) {
    next(new Error(`Invalid subcategory ${this.subCategory} for main category ${this.mainCategory}`));
  }
  next();
});

// 평균 매수가 계산 메서드 (원화 기준)
assetSchema.methods.getAveragePurchasePrice = function() {
  if (this.totalQuantity === 0) return 0;
  if (this.currency === 'KRW') {
    return this.amount / this.totalQuantity;
  }
  // 외화인 경우 원화로 변환
  return (this.amount * (this.transactions[0]?.exchangeRate || 1)) / this.totalQuantity;
};

// 원래 통화의 평균매수가 계산 메서드
assetSchema.methods.getAveragePurchasePriceInOriginal = function() {
  if (this.totalQuantity === 0) return 0;
  return this.amount / this.totalQuantity;
};

// 원화 금액 계산 메서드
assetSchema.methods.getAmountInKRW = function() {
  if (this.currency === 'KRW') return this.amount;
  
  // 각 transaction의 환율을 고려하여 원화 금액 계산
  return this.transactions.reduce((sum, t) => {
    const value = t.amount * t.exchangeRate;
    if (t.type === 'BUY') {
      return sum + value;
    } else if (t.type === 'SELL') {
      return sum - value;
    }
    return sum;
  }, 0);
};

// 현재 가치 계산 메서드 (실시간 가격은 외부 API에서 받아와야 함)
assetSchema.methods.getCurrentValue = function(currentPrice, currentExchangeRate = 1) {
  return this.amount * currentPrice * currentExchangeRate;
};

// 수익률 계산 메서드
assetSchema.methods.getReturnRate = function(currentPrice, currentExchangeRate = 1) {
  const currentValue = this.getCurrentValue(currentPrice, currentExchangeRate);
  const averagePurchasePrice = this.getAveragePurchasePrice();
  const purchaseValue = this.amount * averagePurchasePrice;
  
  return ((currentValue - purchaseValue) / purchaseValue) * 100;
};

const Asset = mongoose.model('Asset', assetSchema);

module.exports = Asset; 
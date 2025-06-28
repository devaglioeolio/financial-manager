const mongoose = require('mongoose');

const notificationSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // 주가 알림 설정
  stockAlerts: {
    enabled: { type: Boolean, default: true },
    targetPriceAlert: { type: Boolean, default: true }, // 목표가 도달
    surgeAlert: { type: Boolean, default: true }, // 급등 알림
    plungeAlert: { type: Boolean, default: true }, // 급락 알림
    surgeThreshold: { type: Number, default: 5 }, // 급등 기준 (%)
    plungeThreshold: { type: Number, default: 5 }, // 급락 기준 (%)
    dailySummary: { type: Boolean, default: false } // 일일 요약
  },
  
  // 포트폴리오 알림 설정
  portfolioAlerts: {
    enabled: { type: Boolean, default: true },
    milestoneAlert: { type: Boolean, default: true }, // 신고점/신저점
    profitLossAlert: { type: Boolean, default: true }, // 평가손익 변동
    profitLossThreshold: { type: Number, default: 100000 }, // 변동 기준 (원)
    dailySummary: { type: Boolean, default: false }
  },
  
  // 환율 알림 설정
  exchangeRateAlerts: {
    enabled: { type: Boolean, default: true },
    usdKrwAlert: { type: Boolean, default: true },
    usdKrwThreshold: { type: Number, default: 50 }, // 변동 기준 (원)
    dailyReport: { type: Boolean, default: false }
  },
  
  // 목표 관리 알림 설정
  goalAlerts: {
    enabled: { type: Boolean, default: true },
    progressAlert: { type: Boolean, default: true }, // 달성률 알림
    progressMilestones: { type: [Number], default: [50, 80, 100] }, // 알림 단계
    deadlineAlert: { type: Boolean, default: true }, // 기한 임박
    deadlineThreshold: { type: Number, default: 30 } // 기한 임박 기준 (일)
  },
  
  // 알림 방식 설정
  notificationMethods: {
    browserNotification: { type: Boolean, default: true },
    inAppNotification: { type: Boolean, default: true }
  },
  
  // 알림 시간대 설정
  timeSettings: {
    enableQuietHours: { type: Boolean, default: false },
    quietStart: { type: String, default: '22:00' }, // 조용한 시간 시작
    quietEnd: { type: String, default: '09:00' }, // 조용한 시간 종료
    timezone: { type: String, default: 'Asia/Seoul' }
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 업데이트 시 updatedAt 자동 갱신
notificationSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 기본 설정 생성 메서드
notificationSettingsSchema.statics.createDefault = function(userId) {
  return new this({ userId });
};

module.exports = mongoose.model('NotificationSettings', notificationSettingsSchema); 
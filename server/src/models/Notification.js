const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'STOCK_TARGET_REACHED', // 목표가 도달
      'STOCK_SURGE', // 급등
      'STOCK_PLUNGE', // 급락
      'PORTFOLIO_MILESTONE', // 포트폴리오 신고점/신저점
      'EXCHANGE_RATE_CHANGE', // 환율 변동
      'GOAL_PROGRESS', // 목표 달성률
      'DIVIDEND', // 배당
      'SYSTEM' // 시스템 공지
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // 추가 데이터 (종목 정보, 가격 등)
    default: {}
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 인덱스 설정
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

// 읽음 처리 메서드
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema); 
const Notification = require('../models/Notification');
const NotificationSettings = require('../models/NotificationSettings');

// 알림 목록 조회
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const query = { userId: req.user.id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const totalCount = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      isRead: false 
    });
    
    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        unreadCount
      }
    });
  } catch (error) {
    console.error('알림 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '알림 조회 중 오류가 발생했습니다.'
    });
  }
};

// 읽지 않은 알림 개수 조회
exports.getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false
    });
    
    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('읽지 않은 알림 개수 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '읽지 않은 알림 개수 조회 중 오류가 발생했습니다.'
    });
  }
};

// 알림 읽음 처리
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findOne({
      _id: notificationId,
      userId: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: '알림을 찾을 수 없습니다.'
      });
    }
    
    await notification.markAsRead();
    
    res.json({
      success: true,
      message: '알림이 읽음 처리되었습니다.'
    });
  } catch (error) {
    console.error('알림 읽음 처리 실패:', error);
    res.status(500).json({
      success: false,
      message: '알림 읽음 처리 중 오류가 발생했습니다.'
    });
  }
};

// 모든 알림 읽음 처리
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );
    
    res.json({
      success: true,
      message: '모든 알림이 읽음 처리되었습니다.'
    });
  } catch (error) {
    console.error('모든 알림 읽음 처리 실패:', error);
    res.status(500).json({
      success: false,
      message: '모든 알림 읽음 처리 중 오류가 발생했습니다.'
    });
  }
};

// 알림 삭제
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const result = await Notification.deleteOne({
      _id: notificationId,
      userId: req.user.id
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: '알림을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '알림이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('알림 삭제 실패:', error);
    res.status(500).json({
      success: false,
      message: '알림 삭제 중 오류가 발생했습니다.'
    });
  }
};

// 알림 설정 조회
exports.getNotificationSettings = async (req, res) => {
  try {
    let settings = await NotificationSettings.findOne({ userId: req.user.id });
    
    // 설정이 없으면 기본 설정 생성
    if (!settings) {
      settings = NotificationSettings.createDefault(req.user.id);
      await settings.save();
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('알림 설정 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '알림 설정 조회 중 오류가 발생했습니다.'
    });
  }
};

// 알림 설정 업데이트
exports.updateNotificationSettings = async (req, res) => {
  try {
    const settings = await NotificationSettings.findOneAndUpdate(
      { userId: req.user.id },
      req.body,
      { 
        new: true, 
        upsert: true,
        runValidators: true 
      }
    );
    
    res.json({
      success: true,
      data: settings,
      message: '알림 설정이 업데이트되었습니다.'
    });
  } catch (error) {
    console.error('알림 설정 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      message: '알림 설정 업데이트 중 오류가 발생했습니다.'
    });
  }
};

// 알림 생성 (시스템에서 사용)
exports.createNotification = async (userId, type, title, message, data = {}, priority = 'MEDIUM') => {
  try {
    // 사용자 알림 설정 확인
    const settings = await NotificationSettings.findOne({ userId });
    if (!settings) return null;
    
    // 알림 유형별 설정 확인
    const isEnabled = checkNotificationEnabled(settings, type);
    if (!isEnabled) return null;
    
    // 조용한 시간 확인
    if (settings.timeSettings.enableQuietHours && isQuietHours(settings.timeSettings)) {
      return null;
    }
    
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      data,
      priority
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('알림 생성 실패:', error);
    return null;
  }
};

// 알림 활성화 여부 확인
function checkNotificationEnabled(settings, type) {
  switch (type) {
    case 'STOCK_TARGET_REACHED':
      return settings.stockAlerts.enabled && settings.stockAlerts.targetPriceAlert;
    case 'STOCK_SURGE':
      return settings.stockAlerts.enabled && settings.stockAlerts.surgeAlert;
    case 'STOCK_PLUNGE':
      return settings.stockAlerts.enabled && settings.stockAlerts.plungeAlert;
    case 'PORTFOLIO_MILESTONE':
      return settings.portfolioAlerts.enabled && settings.portfolioAlerts.milestoneAlert;
    case 'EXCHANGE_RATE_CHANGE':
      return settings.exchangeRateAlerts.enabled && settings.exchangeRateAlerts.usdKrwAlert;
    case 'GOAL_PROGRESS':
      return settings.goalAlerts.enabled && settings.goalAlerts.progressAlert;
    default:
      return true;
  }
}

// 조용한 시간 확인
function isQuietHours(timeSettings) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const [quietStartHour, quietStartMinute] = timeSettings.quietStart.split(':').map(Number);
  const [quietEndHour, quietEndMinute] = timeSettings.quietEnd.split(':').map(Number);
  
  const quietStart = quietStartHour * 60 + quietStartMinute;
  const quietEnd = quietEndHour * 60 + quietEndMinute;
  
  if (quietStart < quietEnd) {
    // 같은 날 (예: 22:00 ~ 23:59)
    return currentTime >= quietStart && currentTime <= quietEnd;
  } else {
    // 다음 날까지 (예: 22:00 ~ 09:00)
    return currentTime >= quietStart || currentTime <= quietEnd;
  }
}

module.exports = exports; 
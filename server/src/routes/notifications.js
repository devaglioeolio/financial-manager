const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// 모든 라우트에 인증 미들웨어 적용
router.use(auth);

// 알림 목록 조회
router.get('/', notificationController.getNotifications);

// 읽지 않은 알림 개수 조회
router.get('/unread-count', notificationController.getUnreadCount);

// 알림 읽음 처리
router.patch('/:notificationId/read', notificationController.markAsRead);

// 모든 알림 읽음 처리
router.patch('/mark-all-read', notificationController.markAllAsRead);

// 알림 삭제
router.delete('/:notificationId', notificationController.deleteNotification);

// 알림 설정 조회
router.get('/settings', notificationController.getNotificationSettings);

// 알림 설정 업데이트
router.put('/settings', notificationController.updateNotificationSettings);

module.exports = router; 
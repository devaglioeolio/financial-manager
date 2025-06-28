<template>
  <div class="notification-center">
    <!-- 알림 벨 아이콘 -->
    <div class="notification-bell" @click="toggleDropdown" :class="{ 'has-unread': unreadCount > 0 }">
      <span class="bell-icon">🔔</span>
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </div>

    <!-- 드롭다운 알림 목록 -->
    <div v-if="showDropdown" class="notification-dropdown" @click.stop>
      <div class="dropdown-header">
        <h3>알림</h3>
        <div class="header-actions">
          <button v-if="unreadCount > 0" @click="markAllAsRead" class="mark-all-btn">
            모두 읽음
          </button>

          <button @click="goToNotificationPage" class="view-all-btn">
            전체 보기
          </button>
        </div>
      </div>

      <div class="notification-list">
        <div v-if="loading" class="loading-state">
          <span class="loading-spinner"></span>
          <p>알림을 불러오는 중...</p>
        </div>

        <div v-else-if="notifications.length === 0" class="empty-state">
          <span class="empty-icon">🔕</span>
          <p>새로운 알림이 없습니다</p>
        </div>

        <div v-else class="notification-items">
          <div 
            v-for="notification in notifications.slice(0, 5)" 
            :key="notification._id"
            class="notification-item"
            :class="{ 'unread': !notification.isRead, [notification.priority.toLowerCase()]: true }"
            @click="markAsRead(notification)"
          >
            <div class="notification-icon">
              {{ getNotificationIcon(notification.type) }}
            </div>
            <div class="notification-content">
              <h4 class="notification-title">{{ notification.title }}</h4>
              <p class="notification-message">{{ notification.message }}</p>
              <span class="notification-time">{{ formatTime(notification.createdAt) }}</span>
            </div>
            <div v-if="!notification.isRead" class="unread-dot"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 오버레이 -->
    <div v-if="showDropdown" class="notification-overlay" @click="closeDropdown"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

// 반응형 데이터
const showDropdown = ref(false)
const notifications = ref([])
const unreadCount = ref(0)
const loading = ref(false)

// 브라우저 알림 권한
const notificationPermission = ref(Notification.permission)

// 드롭다운 토글
const toggleDropdown = async () => {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    await fetchRecentNotifications()
  }
}

const closeDropdown = () => {
  showDropdown.value = false
}

// 최근 알림 조회 (5개)
const fetchRecentNotifications = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/notifications', {
      params: { limit: 5 }
    })
    
    if (response.data.success) {
      notifications.value = response.data.data.notifications
      unreadCount.value = response.data.data.unreadCount
    }
  } catch (error) {
    console.error('알림 조회 실패:', error)
  } finally {
    loading.value = false
  }
}

// 읽지 않은 알림 개수 조회
const fetchUnreadCount = async () => {
  try {
    const response = await axios.get('/api/notifications/unread-count')
    
    if (response.data.success) {
      unreadCount.value = response.data.data.unreadCount
    }
  } catch (error) {
    console.error('읽지 않은 알림 개수 조회 실패:', error)
  }
}

// 알림 읽음 처리
const markAsRead = async (notification) => {
  if (notification.isRead) return
  
  try {
    const response = await axios.patch(`/api/notifications/${notification._id}/read`)
    
    if (response.data.success) {
      notification.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  } catch (error) {
    console.error('알림 읽음 처리 실패:', error)
  }
}

// 모든 알림 읽음 처리
const markAllAsRead = async () => {
  try {
    const response = await axios.patch('/api/notifications/mark-all-read')
    
    if (response.data.success) {
      notifications.value.forEach(notification => {
        notification.isRead = true
      })
      unreadCount.value = 0
    }
  } catch (error) {
    console.error('모든 알림 읽음 처리 실패:', error)
  }
}

// 알림 페이지로 이동
const goToNotificationPage = () => {
  closeDropdown()
  router.push('/notifications')
}



// 알림 아이콘 가져오기
const getNotificationIcon = (type) => {
  const icons = {
    'STOCK_SURGE': '📈',
    'STOCK_PLUNGE': '📉',
    'STOCK_TARGET_REACHED': '🎯',
    'PORTFOLIO_MILESTONE': '💰',
    'EXCHANGE_RATE_CHANGE': '💱',
    'GOAL_PROGRESS': '🏆',
    'DIVIDEND': '💵',
    'SYSTEM': '🔔'
  }
  return icons[type] || '📢'
}

// 시간 포맷팅
const formatTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffMinutes = Math.ceil(diffTime / (1000 * 60))
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60))
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`
  } else if (diffDays < 7) {
    return `${diffDays}일 전`
  } else {
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    })
  }
}

// 브라우저 알림 권한 요청
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission()
    notificationPermission.value = permission
  }
}

// 브라우저 알림 표시
const showBrowserNotification = (title, body, data = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `notification-${Date.now()}`,
      requireInteraction: false,
      silent: false
    })

    // 5초 후 자동 닫기
    setTimeout(() => {
      notification.close()
    }, 5000)

    // 클릭 시 알림 센터로 이동
    notification.onclick = () => {
      window.focus()
      router.push('/notifications')
      notification.close()
    }
  }
}

// 정기적인 알림 체크
let notificationInterval = null

const startNotificationPolling = () => {
  // 30초마다 새로운 알림 체크
  notificationInterval = setInterval(async () => {
    const previousUnreadCount = unreadCount.value
    await fetchUnreadCount()
    
    // 새로운 알림이 있으면 브라우저 알림 표시
    if (unreadCount.value > previousUnreadCount) {
      const newNotificationsCount = unreadCount.value - previousUnreadCount
      showBrowserNotification(
        '새로운 알림',
        `${newNotificationsCount}개의 새로운 알림이 있습니다.`
      )
    }
  }, 30000)
}

const stopNotificationPolling = () => {
  if (notificationInterval) {
    clearInterval(notificationInterval)
    notificationInterval = null
  }
}

// 컴포넌트 생명주기
onMounted(async () => {
  await fetchUnreadCount()
  await requestNotificationPermission()
  startNotificationPolling()
})

onUnmounted(() => {
  stopNotificationPolling()
})

// 외부에서 호출할 수 있는 메서드들 노출
defineExpose({
  fetchUnreadCount,
  showBrowserNotification
})
</script>

<style scoped>
.notification-center {
  position: relative;
}

.notification-bell {
  position: relative;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-bell:hover {
  background: rgba(0, 0, 0, 0.05);
}

.notification-bell.has-unread .bell-icon {
  animation: ring 0.5s ease-in-out infinite alternate;
}

@keyframes ring {
  0% { transform: rotate(-10deg); }
  100% { transform: rotate(10deg); }
}

.bell-icon {
  font-size: 1.2rem;
}

.badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #ff4757;
  color: white;
  border-radius: 50%;
  padding: 2px 6px;
  font-size: 0.7rem;
  font-weight: bold;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.notification-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 400px;
  max-height: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
  z-index: 1000;
  overflow: hidden;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.dropdown-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.mark-all-btn, .view-all-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.mark-all-btn:hover, .view-all-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.notification-list {
  max-height: 400px;
  overflow-y: auto;
}

.loading-state, .empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #666;
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 8px;
}

.notification-items {
  max-height: 400px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s ease;
  position: relative;
}

.notification-item:hover {
  background: #f8f9fa;
}

.notification-item.unread {
  background: rgba(102, 126, 234, 0.05);
  border-left: 3px solid #667eea;
}

.notification-item.urgent {
  border-left-color: #ff4757;
}

.notification-item.high {
  border-left-color: #ffa726;
}

.notification-icon {
  font-size: 1.2rem;
  margin-right: 12px;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  margin: 0 0 4px 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
  line-height: 1.3;
}

.notification-message {
  margin: 0 0 6px 0;
  font-size: 0.8rem;
  color: #666;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-time {
  font-size: 0.7rem;
  color: #999;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #667eea;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.notification-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
  background: transparent;
}

/* 스크롤바 스타일링 */
.notification-list::-webkit-scrollbar,
.notification-items::-webkit-scrollbar {
  width: 6px;
}

.notification-list::-webkit-scrollbar-track,
.notification-items::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.notification-list::-webkit-scrollbar-thumb,
.notification-items::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.notification-list::-webkit-scrollbar-thumb:hover,
.notification-items::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style> 
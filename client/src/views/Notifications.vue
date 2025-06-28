<template>
  <div class="notifications-page">
    <div class="page-header">
      <div class="header-content">
        <h1>🔔 알림 센터</h1>
        <div class="header-actions">
          <button 
            v-if="unreadCount > 0" 
            @click="markAllAsRead" 
            class="mark-all-btn"
            :disabled="loading"
          >
            모든 알림 읽음 처리
          </button>
          <button @click="goToSettings" class="settings-btn">
            ⚙️ 알림 설정
          </button>
        </div>
      </div>
      <div class="notification-stats">
        <div class="stat-item">
          <span class="stat-number">{{ totalCount }}</span>
          <span class="stat-label">총 알림</span>
        </div>
        <div class="stat-item">
          <span class="stat-number unread">{{ unreadCount }}</span>
          <span class="stat-label">읽지 않음</span>
        </div>
      </div>
    </div>

    <div class="notifications-container">
      <!-- 필터 탭 -->
      <div class="filter-tabs">
        <button 
          v-for="filter in filters" 
          :key="filter.key"
          :class="['filter-tab', { active: activeFilter === filter.key }]"
          @click="changeFilter(filter.key)"
        >
          <span class="filter-icon">{{ filter.icon }}</span>
          <span class="filter-label">{{ filter.label }}</span>
          <span v-if="filter.count > 0" class="filter-count">{{ filter.count }}</span>
        </button>
      </div>

      <!-- 알림 목록 -->
      <div class="notifications-list">
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>알림을 불러오는 중...</p>
        </div>

        <div v-else-if="filteredNotifications.length === 0" class="empty-state">
          <span class="empty-icon">🔕</span>
          <h3>알림이 없습니다</h3>
          <p>{{ getEmptyMessage() }}</p>
        </div>

        <div v-else class="notification-items">
          <div 
            v-for="notification in filteredNotifications" 
            :key="notification._id"
            class="notification-card"
            :class="{
              'unread': !notification.isRead,
              [notification.priority.toLowerCase()]: true,
              [notification.type.toLowerCase().replace(/_/g, '-')]: true
            }"
          >
            <div class="notification-header">
              <div class="notification-meta">
                <span class="notification-icon">{{ getNotificationIcon(notification.type) }}</span>
                <span class="notification-type">{{ getNotificationTypeName(notification.type) }}</span>
                <span class="notification-time">{{ formatDetailedTime(notification.createdAt) }}</span>
              </div>
              <div class="notification-actions">
                <button 
                  v-if="!notification.isRead" 
                  @click="markAsRead(notification)"
                  class="mark-read-btn"
                  title="읽음 처리"
                >
                  ✓
                </button>
                <button 
                  @click="deleteNotification(notification._id)"
                  class="delete-btn"
                  title="삭제"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div class="notification-body">
              <h3 class="notification-title">{{ notification.title }}</h3>
              <p class="notification-message">{{ notification.message }}</p>
              
              <!-- 추가 데이터 표시 -->
              <div v-if="notification.data && Object.keys(notification.data).length > 0" class="notification-data">
                <div v-if="notification.type.includes('STOCK')" class="stock-data">
                  <span v-if="notification.data.ticker" class="data-item">
                    📊 {{ notification.data.ticker }}
                  </span>
                  <span v-if="notification.data.currentPrice" class="data-item">
                    💰 ${{ notification.data.currentPrice.toFixed(2) }}
                  </span>
                  <span v-if="notification.data.changePercent" class="data-item" :class="{ 
                    'positive': notification.data.changePercent > 0, 
                    'negative': notification.data.changePercent < 0 
                  }">
                    📈 {{ notification.data.changePercent > 0 ? '+' : '' }}{{ notification.data.changePercent.toFixed(2) }}%
                  </span>
                </div>
                
                <div v-if="notification.type === 'GOAL_PROGRESS'" class="goal-data">
                  <span class="data-item">
                    🎯 {{ notification.data.currentProgress?.toFixed(1) }}% 달성
                  </span>
                  <span class="data-item">
                    💰 {{ formatCurrency(notification.data.currentAmount) }} / {{ formatCurrency(notification.data.targetAmount) }}
                  </span>
                </div>
                
                <div v-if="notification.type === 'PORTFOLIO_MILESTONE'" class="portfolio-data">
                  <span v-if="notification.data.difference" class="data-item" :class="{ 
                    'positive': notification.data.difference > 0, 
                    'negative': notification.data.difference < 0 
                  }">
                    📊 {{ notification.data.difference > 0 ? '+' : '' }}{{ formatCurrency(notification.data.difference) }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="!notification.isRead" class="unread-indicator"></div>
          </div>
        </div>

        <!-- 페이지네이션 -->
        <div v-if="totalPages > 1" class="pagination">
          <button 
            @click="changePage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="page-btn"
          >
            ← 이전
          </button>
          
          <div class="page-numbers">
            <button 
              v-for="page in visiblePages" 
              :key="page"
              @click="changePage(page)"
              :class="['page-number', { active: page === currentPage }]"
            >
              {{ page }}
            </button>
          </div>
          
          <button 
            @click="changePage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="page-btn"
          >
            다음 →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

// 반응형 데이터
const notifications = ref([])
const loading = ref(false)
const activeFilter = ref('all')
const currentPage = ref(1)
const totalCount = ref(0)
const unreadCount = ref(0)
const totalPages = ref(1)
const pageSize = 20

// 필터 정의
const filters = ref([
  { key: 'all', label: '전체', icon: '📋', count: 0 },
  { key: 'unread', label: '읽지 않음', icon: '🔴', count: 0 },
  { key: 'stock', label: '주식', icon: '📈', count: 0 },
  { key: 'portfolio', label: '포트폴리오', icon: '💰', count: 0 },
  { key: 'goal', label: '목표', icon: '🎯', count: 0 },
  { key: 'exchange', label: '환율', icon: '💱', count: 0 }
])

// 계산된 속성
const filteredNotifications = computed(() => {
  let filtered = [...notifications.value]
  
  switch (activeFilter.value) {
    case 'unread':
      filtered = filtered.filter(n => !n.isRead)
      break
    case 'stock':
      filtered = filtered.filter(n => n.type.includes('STOCK'))
      break
    case 'portfolio':
      filtered = filtered.filter(n => n.type.includes('PORTFOLIO'))
      break
    case 'goal':
      filtered = filtered.filter(n => n.type.includes('GOAL'))
      break
    case 'exchange':
      filtered = filtered.filter(n => n.type.includes('EXCHANGE'))
      break
  }
  
  return filtered
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push('...')
      pages.push(total)
    }
  }
  
  return pages
})

// 메서드
const fetchNotifications = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize
    }
    
    if (activeFilter.value === 'unread') {
      params.unreadOnly = true
    }
    
    const response = await axios.get('/api/notifications', { params })
    
    if (response.data.success) {
      notifications.value = response.data.data.notifications
      totalCount.value = response.data.data.pagination.total
      totalPages.value = response.data.data.pagination.pages
      unreadCount.value = response.data.data.unreadCount
      
      updateFilterCounts()
    }
  } catch (error) {
    console.error('알림 조회 실패:', error)
  } finally {
    loading.value = false
  }
}

const updateFilterCounts = () => {
  filters.value.forEach(filter => {
    switch (filter.key) {
      case 'all':
        filter.count = totalCount.value
        break
      case 'unread':
        filter.count = unreadCount.value
        break
      case 'stock':
        filter.count = notifications.value.filter(n => n.type.includes('STOCK')).length
        break
      case 'portfolio':
        filter.count = notifications.value.filter(n => n.type.includes('PORTFOLIO')).length
        break
      case 'goal':
        filter.count = notifications.value.filter(n => n.type.includes('GOAL')).length
        break
      case 'exchange':
        filter.count = notifications.value.filter(n => n.type.includes('EXCHANGE')).length
        break
    }
  })
}

const changeFilter = (filterKey) => {
  activeFilter.value = filterKey
  currentPage.value = 1
  fetchNotifications()
}

const changePage = (page) => {
  if (typeof page === 'number' && page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    fetchNotifications()
  }
}

const markAsRead = async (notification) => {
  if (notification.isRead) return
  
  try {
    const response = await axios.patch(`/api/notifications/${notification._id}/read`)
    
    if (response.data.success) {
      notification.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
      updateFilterCounts()
    }
  } catch (error) {
    console.error('알림 읽음 처리 실패:', error)
  }
}

const markAllAsRead = async () => {
  if (!confirm('모든 알림을 읽음 처리하시겠습니까?')) return
  
  loading.value = true
  try {
    const response = await axios.patch('/api/notifications/mark-all-read')
    
    if (response.data.success) {
      notifications.value.forEach(notification => {
        notification.isRead = true
      })
      unreadCount.value = 0
      updateFilterCounts()
    }
  } catch (error) {
    console.error('모든 알림 읽음 처리 실패:', error)
  } finally {
    loading.value = false
  }
}

const deleteNotification = async (notificationId) => {
  if (!confirm('이 알림을 삭제하시겠습니까?')) return
  
  try {
    const response = await axios.delete(`/api/notifications/${notificationId}`)
    
    if (response.data.success) {
      const index = notifications.value.findIndex(n => n._id === notificationId)
      if (index !== -1) {
        const notification = notifications.value[index]
        if (!notification.isRead) {
          unreadCount.value = Math.max(0, unreadCount.value - 1)
        }
        notifications.value.splice(index, 1)
        totalCount.value--
        updateFilterCounts()
      }
    }
  } catch (error) {
    console.error('알림 삭제 실패:', error)
  }
}

const goToSettings = () => {
  router.push('/notification-settings')
}

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

const getNotificationTypeName = (type) => {
  const names = {
    'STOCK_SURGE': '주식 급등',
    'STOCK_PLUNGE': '주식 급락',
    'STOCK_TARGET_REACHED': '목표가 도달',
    'PORTFOLIO_MILESTONE': '포트폴리오 변동',
    'EXCHANGE_RATE_CHANGE': '환율 변동',
    'GOAL_PROGRESS': '목표 달성',
    'DIVIDEND': '배당금',
    'SYSTEM': '시스템 공지'
  }
  return names[type] || '알림'
}

const formatDetailedTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatCurrency = (amount) => {
  if (!amount) return '₩0'
  return `₩${Math.round(amount).toLocaleString()}`
}

const getEmptyMessage = () => {
  switch (activeFilter.value) {
    case 'unread':
      return '모든 알림을 확인했습니다!'
    case 'stock':
      return '주식 관련 알림이 없습니다.'
    case 'portfolio':
      return '포트폴리오 관련 알림이 없습니다.'
    case 'goal':
      return '목표 관련 알림이 없습니다.'
    case 'exchange':
      return '환율 관련 알림이 없습니다.'
    default:
      return '아직 알림이 없습니다.'
  }
}

// 라이프사이클
onMounted(() => {
  fetchNotifications()
})

// 필터 변경 감지
watch(activeFilter, () => {
  currentPage.value = 1
})
</script>

<style scoped>
.notifications-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-content h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.mark-all-btn, .settings-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mark-all-btn {
  background: #667eea;
  color: white;
}

.mark-all-btn:hover:not(:disabled) {
  background: #5a67d8;
}

.mark-all-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.settings-btn {
  background: #f8f9fa;
  color: #333;
  border: 1px solid #e5e7eb;
}

.settings-btn:hover {
  background: #e9ecef;
}

.notification-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
}

.stat-number.unread {
  color: #ff4757;
}

.stat-label {
  font-size: 0.8rem;
  color: #666;
  margin-top: 4px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  min-width: fit-content;
}

.filter-tab:hover {
  background: #f8f9fa;
}

.filter-tab.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.filter-icon {
  font-size: 1rem;
}

.filter-label {
  font-size: 0.9rem;
  font-weight: 500;
}

.filter-count {
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.filter-tab.active .filter-count {
  background: rgba(255, 255, 255, 0.2);
}

.loading-state, .empty-state {
  padding: 60px 20px;
  text-align: center;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 1.2rem;
  color: #333;
}

.notification-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notification-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.notification-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.notification-card.unread {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(255, 255, 255, 1) 100%);
  border-left: 4px solid #667eea;
}

.notification-card.urgent {
  border-left-color: #ff4757;
}

.notification-card.high {
  border-left-color: #ffa726;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.notification-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-icon {
  font-size: 1.2rem;
}

.notification-type {
  font-size: 0.8rem;
  color: #667eea;
  font-weight: 600;
  background: rgba(102, 126, 234, 0.1);
  padding: 4px 8px;
  border-radius: 12px;
}

.notification-time {
  font-size: 0.8rem;
  color: #999;
}

.notification-actions {
  display: flex;
  gap: 8px;
}

.mark-read-btn, .delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.mark-read-btn:hover {
  background: rgba(102, 126, 234, 0.1);
}

.delete-btn:hover {
  background: rgba(255, 71, 87, 0.1);
}

.notification-title {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.notification-message {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: #666;
  line-height: 1.5;
}

.notification-data {
  margin-top: 12px;
}

.stock-data, .goal-data, .portfolio-data {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.data-item {
  font-size: 0.8rem;
  padding: 4px 8px;
  background: #f8f9fa;
  border-radius: 6px;
  color: #333;
}

.data-item.positive {
  background: rgba(76, 175, 80, 0.1);
  color: #2e7d32;
}

.data-item.negative {
  background: rgba(244, 67, 54, 0.1);
  color: #c62828;
}

.unread-indicator {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 8px;
  height: 8px;
  background: #667eea;
  border-radius: 50%;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 40px;
}

.page-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: #f8f9fa;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-number {
  width: 36px;
  height: 36px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

.page-number:hover {
  background: #f8f9fa;
}

.page-number.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

@media (max-width: 768px) {
  .notifications-page {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .notification-stats {
    justify-content: center;
    width: 100%;
  }
  
  .filter-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
  }
  
  .notification-card {
    padding: 16px;
  }
  
  .notification-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .pagination {
    flex-wrap: wrap;
    gap: 4px;
  }
}
</style> 
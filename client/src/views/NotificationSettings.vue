<template>
  <div class="notification-settings">
    <div class="settings-header">
      <h1>⚙️ 알림 설정</h1>
      <p>원하는 알림만 받도록 설정을 조정하세요</p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>설정을 불러오는 중...</p>
    </div>

    <div v-else class="settings-content">
      <!-- 주가 알림 설정 -->
      <div class="settings-section">
        <div class="section-header">
          <h2>📈 주가 알림</h2>
          <div class="section-toggle">
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                v-model="settings.stockAlerts.enabled"
                @change="updateSettings"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div v-if="settings.stockAlerts.enabled" class="section-content">
          <div class="setting-item">
            <div class="setting-info">
              <h3>🎯 목표가 도달 알림</h3>
              <p>관심종목이 설정한 목표가에 도달했을 때 알림을 받습니다</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                v-model="settings.stockAlerts.targetPriceAlert"
                @change="updateSettings"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3>🚀 급등 알림</h3>
              <p>관심종목이 설정한 비율 이상 상승했을 때 알림을 받습니다</p>
            </div>
            <div class="setting-controls">
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  v-model="settings.stockAlerts.surgeAlert"
                  @change="updateSettings"
                />
                <span class="toggle-slider"></span>
              </label>
              <div v-if="settings.stockAlerts.surgeAlert" class="threshold-input">
                <input 
                  type="number" 
                  v-model.number="settings.stockAlerts.surgeThreshold"
                  @change="updateSettings"
                  min="1"
                  max="50"
                  step="0.5"
                />
                <span class="unit">% 이상</span>
              </div>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3>📉 급락 알림</h3>
              <p>관심종목이 설정한 비율 이상 하락했을 때 알림을 받습니다</p>
            </div>
            <div class="setting-controls">
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  v-model="settings.stockAlerts.plungeAlert"
                  @change="updateSettings"
                />
                <span class="toggle-slider"></span>
              </label>
              <div v-if="settings.stockAlerts.plungeAlert" class="threshold-input">
                <input 
                  type="number" 
                  v-model.number="settings.stockAlerts.plungeThreshold"
                  @change="updateSettings"
                  min="1"
                  max="50"
                  step="0.5"
                />
                <span class="unit">% 이상</span>
              </div>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3>📊 일일 요약</h3>
              <p>매일 저녁 관심종목의 하루 변동사항을 요약해서 알림을 받습니다</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                v-model="settings.stockAlerts.dailySummary"
                @change="updateSettings"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- 포트폴리오 알림 설정 -->
      <div class="settings-section">
        <div class="section-header">
          <h2>💰 포트폴리오 알림</h2>
          <div class="section-toggle">
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                v-model="settings.portfolioAlerts.enabled"
                @change="updateSettings"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div v-if="settings.portfolioAlerts.enabled" class="section-content">
          <div class="setting-item">
            <div class="setting-info">
              <h3>🏆 신고점/신저점 달성</h3>
              <p>포트폴리오 총액이 역대 최고점 또는 최저점을 경신했을 때 알림을 받습니다</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                v-model="settings.portfolioAlerts.milestoneAlert"
                @change="updateSettings"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3>📊 평가손익 변동</h3>
              <p>평가손익이 설정한 금액 이상 변동했을 때 알림을 받습니다</p>
            </div>
            <div class="setting-controls">
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  v-model="settings.portfolioAlerts.profitLossAlert"
                  @change="updateSettings"
                />
                <span class="toggle-slider"></span>
              </label>
              <div v-if="settings.portfolioAlerts.profitLossAlert" class="threshold-input">
                <input 
                  type="number" 
                  v-model.number="settings.portfolioAlerts.profitLossThreshold"
                  @change="updateSettings"
                  min="10000"
                  max="10000000"
                  step="10000"
                />
                <span class="unit">원 이상</span>
              </div>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3>📈 일일 요약</h3>
              <p>매일 저녁 포트폴리오 변동사항을 요약해서 알림을 받습니다</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                v-model="settings.portfolioAlerts.dailySummary"
                @change="updateSettings"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- 환율 알림 설정 -->
      <div class="settings-section">
        <div class="section-header">
          <h2>💱 환율 알림</h2>
          <div class="section-toggle">
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                v-model="settings.exchangeRateAlerts.enabled"
                @change="updateSettings"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div v-if="settings.exchangeRateAlerts.enabled" class="section-content">
          <div class="setting-item">
            <div class="setting-info">
              <h3>🇺🇸 USD/KRW 변동 알림</h3>
              <p>달러 환율이 설정한 금액 이상 변동했을 때 알림을 받습니다</p>
            </div>
            <div class="setting-controls">
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  v-model="settings.exchangeRateAlerts.usdKrwAlert"
                  @change="updateSettings"
                />
                <span class="toggle-slider"></span>
              </label>
              <div v-if="settings.exchangeRateAlerts.usdKrwAlert" class="threshold-input">
                <input 
                  type="number" 
                  v-model.number="settings.exchangeRateAlerts.usdKrwThreshold"
                  @change="updateSettings"
                  min="10"
                  max="200"
                  step="5"
                />
                <span class="unit">원 이상</span>
              </div>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3>📊 일일 환율 리포트</h3>
              <p>매일 저녁 주요 환율 변동사항을 요약해서 알림을 받습니다</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                v-model="settings.exchangeRateAlerts.dailyReport"
                @change="updateSettings"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- 목표 관리 알림 설정 -->
      <div class="settings-section">
        <div class="section-header">
          <h2>🎯 목표 관리 알림</h2>
          <div class="section-toggle">
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                v-model="settings.goalAlerts.enabled"
                @change="updateSettings"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div v-if="settings.goalAlerts.enabled" class="section-content">
          <div class="setting-item">
            <div class="setting-info">
              <h3>🏆 목표 달성률 알림</h3>
              <p>설정한 목표의 달성률이 특정 단계에 도달했을 때 알림을 받습니다</p>
            </div>
            <div class="setting-controls">
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  v-model="settings.goalAlerts.progressAlert"
                  @change="updateSettings"
                />
                <span class="toggle-slider"></span>
              </label>
              <div v-if="settings.goalAlerts.progressAlert" class="milestone-checkboxes">
                <label v-for="milestone in [25, 50, 75, 80, 90, 100]" :key="milestone" class="milestone-checkbox">
                  <input 
                    type="checkbox" 
                    :value="milestone"
                    v-model="settings.goalAlerts.progressMilestones"
                    @change="updateSettings"
                  />
                  <span>{{ milestone }}%</span>
                </label>
              </div>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3>⏰ 목표 기한 임박 알림</h3>
              <p>목표 달성 기한이 임박했을 때 알림을 받습니다</p>
            </div>
            <div class="setting-controls">
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  v-model="settings.goalAlerts.deadlineAlert"
                  @change="updateSettings"
                />
                <span class="toggle-slider"></span>
              </label>
              <div v-if="settings.goalAlerts.deadlineAlert" class="threshold-input">
                <input 
                  type="number" 
                  v-model.number="settings.goalAlerts.deadlineThreshold"
                  @change="updateSettings"
                  min="1"
                  max="365"
                  step="1"
                />
                <span class="unit">일 전</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 알림 방식 설정 -->
      <div class="settings-section">
        <div class="section-header">
          <h2>🔔 알림 방식</h2>
        </div>

        <div class="section-content">
          <div class="setting-item">
            <div class="setting-info">
              <h3>🌐 브라우저 알림</h3>
              <p>웹 브라우저의 시스템 알림을 통해 즉시 알림을 받습니다</p>
            </div>
            <div class="setting-controls">
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  v-model="settings.notificationMethods.browserNotification"
                  @change="updateSettings"
                />
                <span class="toggle-slider"></span>
              </label>
              <button 
                v-if="!browserPermissionGranted && settings.notificationMethods.browserNotification" 
                @click="requestBrowserPermission"
                class="permission-btn"
              >
                권한 요청
              </button>
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h3>📱 앱 내 알림</h3>
              <p>앱 내 알림 센터에서 알림을 확인할 수 있습니다</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                v-model="settings.notificationMethods.inAppNotification"
                @change="updateSettings"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- 알림 시간대 설정 -->
      <div class="settings-section">
        <div class="section-header">
          <h2>⏰ 알림 시간대</h2>
        </div>

        <div class="section-content">
          <div class="setting-item">
            <div class="setting-info">
              <h3>🔕 조용한 시간</h3>
              <p>설정한 시간대에는 알림을 받지 않습니다</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                v-model="settings.timeSettings.enableQuietHours"
                @change="updateSettings"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div v-if="settings.timeSettings.enableQuietHours" class="time-range-setting">
            <div class="time-input-group">
              <label>시작 시간</label>
              <input 
                type="time" 
                v-model="settings.timeSettings.quietStart"
                @change="updateSettings"
              />
            </div>
            <div class="time-separator">~</div>
            <div class="time-input-group">
              <label>종료 시간</label>
              <input 
                type="time" 
                v-model="settings.timeSettings.quietEnd"
                @change="updateSettings"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 저장 상태 표시 -->
      <div v-if="saveStatus" class="save-status" :class="saveStatus.type">
        <span class="status-icon">{{ saveStatus.type === 'success' ? '✅' : '❌' }}</span>
        <span class="status-text">{{ saveStatus.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

// 반응형 데이터
const loading = ref(true)
const saveStatus = ref(null)
const settings = ref({
  stockAlerts: {
    enabled: true,
    targetPriceAlert: true,
    surgeAlert: true,
    plungeAlert: true,
    surgeThreshold: 5,
    plungeThreshold: 5,
    dailySummary: false
  },
  portfolioAlerts: {
    enabled: true,
    milestoneAlert: true,
    profitLossAlert: true,
    profitLossThreshold: 100000,
    dailySummary: false
  },
  exchangeRateAlerts: {
    enabled: true,
    usdKrwAlert: true,
    usdKrwThreshold: 50,
    dailyReport: false
  },
  goalAlerts: {
    enabled: true,
    progressAlert: true,
    progressMilestones: [50, 80, 100],
    deadlineAlert: true,
    deadlineThreshold: 30
  },
  notificationMethods: {
    browserNotification: true,
    inAppNotification: true
  },
  timeSettings: {
    enableQuietHours: false,
    quietStart: '22:00',
    quietEnd: '09:00',
    timezone: 'Asia/Seoul'
  }
})

// 브라우저 권한 상태
const browserPermissionGranted = computed(() => {
  return 'Notification' in window && Notification.permission === 'granted'
})

// 설정 불러오기
const fetchSettings = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/notifications/settings')
    
    if (response.data.success) {
      settings.value = { ...settings.value, ...response.data.data }
    }
  } catch (error) {
    console.error('알림 설정 조회 실패:', error)
    showSaveStatus('error', '설정을 불러오는데 실패했습니다.')
  } finally {
    loading.value = false
  }
}

// 설정 저장
const updateSettings = async () => {
  try {
    const response = await axios.put('/api/notifications/settings', settings.value)
    
    if (response.data.success) {
      showSaveStatus('success', '설정이 저장되었습니다.')
    }
  } catch (error) {
    console.error('알림 설정 저장 실패:', error)
    showSaveStatus('error', '설정 저장에 실패했습니다.')
  }
}

// 브라우저 권한 요청
const requestBrowserPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    
    if (permission === 'granted') {
      showSaveStatus('success', '브라우저 알림 권한이 허용되었습니다.')
    } else {
      showSaveStatus('error', '브라우저 알림 권한이 거부되었습니다.')
      settings.value.notificationMethods.browserNotification = false
      updateSettings()
    }
  }
}

// 저장 상태 표시
const showSaveStatus = (type, message) => {
  saveStatus.value = { type, message }
  setTimeout(() => {
    saveStatus.value = null
  }, 3000)
}

// 컴포넌트 마운트
onMounted(() => {
  fetchSettings()
})
</script>

<style scoped>
.notification-settings {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.settings-header {
  text-align: center;
  margin-bottom: 40px;
}

.settings-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #333;
  margin: 0 0 8px 0;
}

.settings-header p {
  font-size: 1.1rem;
  color: #666;
  margin: 0;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
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

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.section-header h2 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.section-content {
  padding: 0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
  margin-right: 20px;
}

.setting-info h3 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.setting-info p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
  line-height: 1.4;
}

.setting-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #667eea;
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.threshold-input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 6px;
}

.threshold-input input {
  width: 80px;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  text-align: center;
}

.threshold-input input:focus {
  outline: none;
}

.unit {
  font-size: 0.85rem;
  color: #666;
  white-space: nowrap;
}

.milestone-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
}

.milestone-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  color: #333;
  cursor: pointer;
}

.milestone-checkbox input {
  margin: 0;
}

.time-range-setting {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: #f8f9fa;
  margin: 16px 24px;
  border-radius: 8px;
}

.time-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.time-input-group label {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
}

.time-input-group input {
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.9rem;
}

.time-separator {
  font-size: 1.2rem;
  color: #666;
  margin-top: 16px;
}

.permission-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.permission-btn:hover {
  background: #5a67d8;
}

.save-status {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.save-status.success {
  background: rgba(76, 175, 80, 0.1);
  color: #2e7d32;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.save-status.error {
  background: rgba(244, 67, 54, 0.1);
  color: #c62828;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.status-icon {
  font-size: 1rem;
}

@media (max-width: 768px) {
  .notification-settings {
    padding: 16px;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
  }
  
  .setting-info {
    margin-right: 0;
  }
  
  .setting-controls {
    width: 100%;
    justify-content: space-between;
  }
  
  .time-range-setting {
    flex-direction: column;
    gap: 12px;
    margin: 12px;
  }
  
  .time-separator {
    margin-top: 0;
  }
  
  .milestone-checkboxes {
    justify-content: center;
  }
}
</style> 
<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="header-main">
        <h1>자산 현황</h1>
        <div class="total-assets">
          <h2>총 자산</h2>
          <p class="amount">₩{{ formatNumberInt(calculatedTotalAmount) }}</p>
          <div v-if="hasRealTimeData" class="realtime-indicator">
            <span class="realtime-icon">🔄</span>
            <span class="realtime-text">실시간 반영</span>
          </div>
          <button v-if="categories.length > 0" @click="fetchRealTimeData" class="refresh-realtime-btn">
            실시간 데이터 새로고침
          </button>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="chart-container">
        <h3>자산 분포</h3>
        <PieChart :data="calculatedPieChartData" :options="chartOptions" />
      </div>
      
      <div class="chart-container chart-with-widget">
        <div class="chart-header">
          <h3>자산 증감 현황</h3>
          <div class="chart-controls">
            <div class="chart-tabs">
              <button 
                :class="['tab-btn', { active: activeTab === 'monthly' }]"
                @click="activeTab = 'monthly'"
              >
                월별
              </button>
              <button 
                :class="['tab-btn', { active: activeTab === 'daily' }]"
                @click="activeTab = 'daily'"
              >
                일별
              </button>
            </div>
            <div class="header-widget">
              <ExchangeRateWidget />
            </div>
          </div>
        </div>
        <div v-if="activeTab === 'daily'" class="daily-options-container">
          <div class="controls-wrapper">
            <div class="segment-control">
              <button 
                v-for="option in dayOptions" 
                :key="option.value"
                :class="['segment-btn', { active: selectedDays === option.value }]"
                @click="changeDays(option.value)"
              >
                {{ option.label }}
              </button>
              <div class="segment-indicator" :style="segmentIndicatorStyle"></div>
            </div>
            <button class="refresh-btn" @click="fetchDailyAssets" title="새로고침">
              ↻
            </button>
          </div>
        </div>
        <div class="chart-wrapper">
          <LineChart 
            :data="activeTab === 'monthly' ? monthlyChartData : dailyChartData" 
            :options="lineChartOptions" 
          />
        </div>
      </div>
      
      <div class="chart-container asset-detail-container">
        <div class="detail-header">
          <div class="detail-tabs">
            <button 
              :class="['detail-tab-btn', { active: activeDetailTab === 'assets' }]"
              @click="activeDetailTab = 'assets'"
            >
              자산 상세
            </button>
            <button 
              :class="['detail-tab-btn', { active: activeDetailTab === 'transactions' }]"
              @click="activeDetailTab = 'transactions'"
            >
              최근 거래
            </button>
          </div>
        </div>
        
        <!-- 자산 상세 탭 -->
        <div v-if="activeDetailTab === 'assets'" class="asset-list">
          <div v-for="category in calculatedAssets" :key="category.category" class="category-section">
            <h4 class="category-title">{{ category.categoryName }}</h4>
            <div v-for="subCategory in category.subCategories" :key="subCategory.category" class="subcategory-section">
              <h5 class="subcategory-title">{{ subCategory.categoryName }}</h5>
              <div v-for="asset in subCategory.assets" :key="asset.id" class="asset-item-card">
                <div class="asset-info-row">
                  <span class="asset-name">{{ asset.name }}</span>
                  <span v-if="asset.totalQuantity" class="quantity-label">{{ formatNumberInt(asset.totalQuantity) }}주</span>
                </div>
                <div class="asset-amounts-block">
                  <div class="amounts-col">
                    <div class="asset-amount-row">
                      <span class="amount-krw">
                        ₩{{ formatNumberInt(
                          asset.hasRealTimeData ? asset.currentAmountInKRW : 
                          (subCategory.category === 'FOREIGN' ? asset.amountInKRW : asset.amount)
                        ) }}
                        <span v-if="subCategory.category === 'FOREIGN'" class="amount-usd-inline">
                          ( ${{ formatNumber(asset.hasRealTimeData ? asset.currentAmount : asset.amount) }} )
                        </span>
                      </span>
                      <!-- 평가손익 표시 (해외주식만) -->
                      <span v-if="asset.hasRealTimeData && asset.unrealizedGainKRW" 
                            class="unrealized-gain" 
                            :class="{ 'profit': asset.unrealizedGainKRW > 0, 'loss': asset.unrealizedGainKRW < 0 }">
                        {{ asset.unrealizedGainKRW > 0 ? '+' : '' }}₩{{ formatNumberInt(Math.abs(asset.unrealizedGainKRW)) }}
                        ({{ asset.returnRate > 0 ? '+' : '' }}{{ asset.returnRate.toFixed(2) }}%)
                      </span>
                    </div>
                  </div>
                  <span v-if="asset.averagePurchasePrice" class="purchase-price-inline">
                    평균매수가: ₩{{ formatNumberInt(subCategory.category === 'FOREIGN'
                      ? asset.averagePurchasePrice
                      : asset.averagePurchasePrice
                    ) }}
                    <span v-if="subCategory.category === 'FOREIGN'" class="purchase-price-usd-inline">
                      ( ${{ formatNumber(asset.averagePurchasePriceInOriginal) }} )
                    </span>
                    <!-- 실시간 주가 표시 (해외주식만) -->
                    <span v-if="asset.hasRealTimeData && asset.currentPrice" class="current-price-inline">
                      | 현재가: ${{ formatNumber(asset.currentPrice) }}
                    </span>
                  </span>
                </div>
                <div v-if="asset.totalQuantity" class="quantity-subtext">
                  보유수량: {{ formatNumberInt(asset.totalQuantity) }}주
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 최근 거래 탭 -->
        <div v-if="activeDetailTab === 'transactions'" class="transactions-list">
          <div v-if="recentTransactions.length === 0" class="no-transactions">
            <div class="empty-state">
              <span class="empty-icon">📊</span>
              <p>아직 거래 내역이 없습니다</p>
            </div>
          </div>
          <div v-else class="transaction-timeline">
            <div 
              v-for="transaction in recentTransactions" 
              :key="transaction._id"
              class="transaction-card"
              :class="transaction.type.toLowerCase()"
            >
              <div class="transaction-indicator">
                <span class="transaction-icon">
                  {{ transaction.type === 'BUY' ? '📈' : '📉' }}
                </span>
              </div>
              <div class="transaction-content">
                <div class="transaction-header">
                  <h4 class="asset-name">{{ transaction.assetName }}</h4>
                  <span class="transaction-type" :class="transaction.type.toLowerCase()">
                    {{ transaction.type === 'BUY' ? '매수' : '매도' }}
                  </span>
                </div>
                <div class="transaction-details">
                  <div class="detail-row">
                    <span class="label">수량:</span>
                    <span class="value">{{ formatNumberInt(transaction.quantity) }}주</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">단가:</span>
                    <span class="value">
                      {{ transaction.currency === 'KRW' ? '₩' : '$' }}{{ formatNumber(transaction.price) }}
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="label">총액:</span>
                    <span class="value amount" :class="transaction.type.toLowerCase()">
                      {{ transaction.currency === 'KRW' ? '₩' : '$' }}{{ formatNumber(transaction.amount) }}
                    </span>
                  </div>
                </div>
                <div class="transaction-date">
                  {{ formatTransactionDate(transaction.date) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 위젯 섹션 -->
    <div class="widgets-section">
      <div class="widgets-grid">
        <ExchangeRateWidget />
        <ForeignStockWidget />
      </div>
    </div>

    <!-- 플로팅 액션 버튼 -->
    <div class="fab-container">
      <div :class="['fab-menu', { 'active': fabMenuOpen }]">
        <button class="fab-option" @click="openAddAssetModal" title="자산 추가">
          <span class="fab-icon">💰</span>
          <span class="fab-label">자산 추가</span>
        </button>
        <button class="fab-option" @click="openAddTransactionModal" title="거래 추가">
          <span class="fab-icon">📈</span>
          <span class="fab-label">거래 추가</span>
        </button>
        <button class="fab-option" @click="openDeleteAssetModal" title="자산 삭제">
          <span class="fab-icon">🗑️</span>
          <span class="fab-label">자산 삭제</span>
        </button>
      </div>
      <button 
        :class="['fab-main', { 'active': fabMenuOpen }]" 
        @click="toggleFabMenu"
        title="자산 관리"
      >
        <span class="fab-main-icon">{{ fabMenuOpen ? '✕' : '+' }}</span>
      </button>
    </div>

    <!-- 자산 추가 모달 -->
    <div v-if="showAddAssetModal" class="modal-overlay" @click="closeModals">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>새 자산 추가</h2>
          <button class="modal-close" @click="closeModals">✕</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="addAsset" class="asset-form">
            <div class="form-step" v-if="assetFormStep === 1">
              <h3>1. 자산 유형 선택</h3>
              <div class="category-grid">
                <div 
                  v-for="(categoryName, categoryKey) in mainCategories" 
                  :key="categoryKey"
                  :class="['category-card', { 'selected': newAsset.mainCategory === categoryKey }]"
                  @click="selectMainCategory(categoryKey)"
                >
                  <div class="category-icon">{{ getCategoryIcon(categoryKey) }}</div>
                  <div class="category-name">{{ categoryName }}</div>
                </div>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" @click="closeModals">취소</button>
                <button 
                  type="button" 
                  class="btn btn-primary" 
                  @click="nextStep"
                  :disabled="!newAsset.mainCategory"
                >
                  다음
                </button>
              </div>
            </div>

            <div class="form-step" v-if="assetFormStep === 2">
              <h3>2. 세부 정보 입력</h3>
              <div class="form-group">
                <label>세부 분류</label>
                <select v-model="newAsset.subCategory" required>
                  <option value="">선택하세요</option>
                  <option 
                    v-for="(subName, subKey) in getSubCategories(newAsset.mainCategory)" 
                    :key="subKey"
                    :value="subKey"
                  >
                    {{ subName }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>자산명</label>
                <input 
                  v-model="newAsset.name" 
                  type="text" 
                  placeholder="예: 삼성전자, KB국민은행적금 등"
                  required
                />
              </div>
              
              <!-- 주식/암호화폐인 경우 -->
              <div v-if="isStockOrCrypto(newAsset.mainCategory)" class="stock-inputs">
                <div class="form-row">
                  <div class="form-group">
                    <label>수량</label>
                    <input 
                      v-model.number="newAsset.quantity" 
                      type="number" 
                      min="0"
                      step="0.001"
                      placeholder="0"
                      required
                    />
                  </div>
                  <div class="form-group">
                    <label>단가</label>
                    <input 
                      v-model.number="newAsset.price" 
                      type="number" 
                      min="0"
                      step="0.01"
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
                <div class="calculated-amount">
                  총액: {{ newAsset.currency === 'USD' ? '$' : '₩' }}{{ formatNumber((newAsset.quantity || 0) * (newAsset.price || 0)) }}
                </div>
              </div>

              <!-- 다른 자산인 경우 -->
              <div v-else class="amount-input">
                <div class="form-group">
                  <label>금액</label>
                  <input 
                    v-model.number="newAsset.amount" 
                    type="number" 
                    min="0"
                    step="1000"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <!-- 외화 자산인 경우 -->
              <div v-if="newAsset.subCategory === 'FOREIGN'" class="currency-inputs">
                <div class="form-group">
                  <label>통화</label>
                  <select v-model="newAsset.currency" required>
                    <option value="USD">USD (달러)</option>
                    <option value="EUR">EUR (유로)</option>
                    <option value="JPY">JPY (엔)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>환율</label>
                  <input 
                    v-model.number="newAsset.exchangeRate" 
                    type="number" 
                    min="0"
                    step="0.01"
                    placeholder="현재 환율"
                    required
                  />
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" @click="prevStep">이전</button>
                <button type="submit" class="btn btn-primary" :disabled="!isFormValid">
                  추가하기
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 거래 추가 모달 -->
    <div v-if="showAddTransactionModal" class="modal-overlay" @click="closeModals">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>거래 추가</h2>
          <button class="modal-close" @click="closeModals">✕</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="addTransaction" class="transaction-form">
            <div class="form-group">
              <label>자산 선택</label>
              <select v-model="newTransaction.assetId" required @change="onAssetSelect">
                <option value="">자산을 선택하세요</option>
                <option 
                  v-for="asset in tradableAssets" 
                  :key="asset.id"
                  :value="asset.id"
                >
                  {{ asset.name }} ({{ asset.subCategory === 'FOREIGN' ? '$' : '₩' }}{{ formatNumber(asset.amount) }})
                </option>
              </select>
            </div>

            <div v-if="newTransaction.assetId" class="selected-asset-info">
              <div class="asset-summary">
                <div class="asset-name">{{ selectedAsset?.name }}</div>
                <div class="asset-details">
                  현재 수량: {{ formatNumber(selectedAsset?.totalQuantity || 0) }}주 | 
                  평균단가: {{ selectedAsset?.currency === 'USD' ? '$' : '₩' }}{{ formatNumber(selectedAsset?.averagePurchasePriceInOriginal || selectedAsset?.averagePurchasePrice || 0) }}
                </div>
              </div>
            </div>

            <div v-if="newTransaction.assetId" class="transaction-inputs">
              <div class="form-group">
                <label>거래 유형</label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input type="radio" v-model="newTransaction.type" value="BUY" />
                    <span class="radio-label buy">📈 매수</span>
                  </label>
                  <label class="radio-option">
                    <input type="radio" v-model="newTransaction.type" value="SELL" />
                    <span class="radio-label sell">📉 매도</span>
                  </label>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>수량</label>
                  <input 
                    v-model.number="newTransaction.quantity" 
                    type="number" 
                    min="0"
                    step="0.001"
                    placeholder="0"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>단가</label>
                  <input 
                    v-model.number="newTransaction.price" 
                    type="number" 
                    min="0"
                    step="0.01"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div v-if="selectedAsset?.currency !== 'KRW'" class="form-group">
                <label>환율</label>
                <input 
                  v-model.number="newTransaction.exchangeRate" 
                  type="number" 
                  min="0"
                  step="0.01"
                  placeholder="현재 환율"
                  required
                />
              </div>

              <div class="calculated-amount">
                거래금액: {{ selectedAsset?.currency === 'USD' ? '$' : '₩' }}{{ formatNumber((newTransaction.quantity || 0) * (newTransaction.price || 0)) }}
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" @click="closeModals">취소</button>
              <button 
                type="submit" 
                class="btn btn-primary" 
                :disabled="!newTransaction.assetId || !newTransaction.type || !newTransaction.quantity || !newTransaction.price"
              >
                거래 추가
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 자산 삭제 모달 -->
    <div v-if="showDeleteAssetModal" class="modal-overlay" @click="closeModals">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>자산 삭제</h2>
          <button class="modal-close" @click="closeModals">✕</button>
        </div>
        <div class="modal-body">
          <div class="delete-warning">
            <div class="warning-icon">⚠️</div>
            <p>삭제할 자산을 선택하세요. <strong>이 작업은 되돌릴 수 없습니다.</strong></p>
          </div>
          
          <div class="asset-list-delete">
            <div 
              v-for="category in categories" 
              :key="category.category" 
              class="category-group"
            >
              <h4>{{ category.categoryName }}</h4>
              <div 
                v-for="subCategory in category.subCategories" 
                :key="subCategory.category"
              >
                <h5>{{ subCategory.categoryName }}</h5>
                <div 
                  v-for="asset in subCategory.assets" 
                  :key="asset.id"
                  :class="['asset-delete-item', { 'selected': assetToDelete === asset.id }]"
                  @click="selectAssetToDelete(asset)"
                >
                  <div class="asset-info">
                    <div class="asset-name">{{ asset.name }}</div>
                    <div class="asset-amount">
                      {{ asset.currency === 'USD' ? '$' : '₩' }}{{ formatNumber(asset.amount) }}
                    </div>
                  </div>
                  <div class="delete-radio">
                    <input 
                      type="radio" 
                      :value="asset.id" 
                      v-model="assetToDelete"
                      :id="`delete-${asset.id}`"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeModals">취소</button>
            <button 
              type="button" 
              class="btn btn-danger" 
              @click="deleteAsset"
              :disabled="!assetToDelete"
            >
              삭제하기
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { Pie as PieChart, Line as LineChart } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js'
import axios from 'axios'
import ExchangeRateWidget from '../components/ExchangeRateWidget.vue'
import ForeignStockWidget from '../components/ForeignStockWidget.vue'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement)

const totalAmount = ref(0)
const categories = ref([])
const hasRealTimeData = ref(false)
const realTimeStockData = ref({})
const realTimeExchangeRates = ref({})
const activeTab = ref('monthly')
const selectedDays = ref(7)
const activeDetailTab = ref('assets')
const recentTransactions = ref([])

// FAB 관련
const fabMenuOpen = ref(false)
const showAddAssetModal = ref(false)
const showAddTransactionModal = ref(false)
const showDeleteAssetModal = ref(false)
const assetFormStep = ref(1)

// 자산 추가 폼
const newAsset = ref({
  mainCategory: '',
  subCategory: '',
  name: '',
  amount: 0,
  quantity: 0,
  price: 0,
  currency: 'KRW',
  exchangeRate: 1
})

// 거래 추가 폼
const newTransaction = ref({
  assetId: '',
  type: '',
  quantity: 0,
  price: 0,
  exchangeRate: 1
})

// 자산 삭제
const assetToDelete = ref('')

// 상수 정의
const mainCategories = {
  'STOCK': '주식',
  'CASH': '현금',
  'SUBSCRIPTION': '청약',
  'CRYPTO': '암호화폐',
  'PENSION': '연금',
  'RETIREMENT': '퇴직금',
  'INSURANCE': '보험',
  'OTHER': '기타'
}

const subCategories = {
  'STOCK': { 'DOMESTIC': '국내주식', 'FOREIGN': '해외주식' },
  'CASH': { 'CHECKING': '입출금계좌', 'SAVINGS': '예적금' },
  'SUBSCRIPTION': { 'HOUSING': '주택청약' },
  'CRYPTO': { 'CRYPTO': '암호화폐' },
  'PENSION': { 'FUND': '펀드', 'PUBLIC': '공적', 'OTHER': '기타' },
  'RETIREMENT': { 'PRIVATE': '개인', 'PUBLIC': '공적' },
  'INSURANCE': { 'PENSION': '연금', 'OTHER': '기타' },
  'OTHER': { 'OTHER': '기타' }
}

const dayOptions = [
  { value: 7, label: '7일' },
  { value: 14, label: '14일' },
  { value: 30, label: '30일' }
]

// 실시간 데이터가 적용된 파이 차트 데이터
const calculatedPieChartData = computed(() => {
  const subCats = []
  calculatedAssets.value.forEach(cat => {
    cat.subCategories.forEach(sub => {
      const totalAmount = sub.assets.reduce((total, asset) => {
        if (asset.hasRealTimeData) {
          return total + asset.currentAmountInKRW
        } else if (sub.category === 'FOREIGN') {
          return total + (asset.amountInKRW || 0)
        } else {
          return total + (asset.amount || 0)
        }
      }, 0)
      
      subCats.push({
        categoryName: sub.categoryName,
        totalAmount: totalAmount
      })
    })
  })
  
  return {
    labels: subCats.map(sub => sub.categoryName),
    datasets: [{
      data: subCats.map(sub => sub.totalAmount),
      backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#E91E63', '#00BCD4', '#FF5722', '#795548']
    }]
  }
})

const pieChartData = ref({
  labels: [],
  datasets: [{
    data: [],
    backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#E91E63', '#00BCD4', '#FF5722', '#795548']
  }]
})

const monthlyChartData = ref({
  labels: [],
  datasets: [{
    label: '총 자산',
    data: [],
    borderColor: '#2196F3',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    tension: 0.4,
    fill: true
  }]
})

const dailyChartData = ref({
  labels: [],
  datasets: [{
    label: '총 자산',
    data: [],
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    tension: 0.4,
    fill: true
  }]
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom'
    }
  }
}

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  resizeDelay: 0,
  interaction: {
    intersect: false,
    mode: 'index'
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          return '총 자산: ₩' + formatNumberInt(context.parsed.y);
        }
      }
    }
  },
  scales: {
    x: {
      ticks: {
        maxTicksLimit: 8, // 최대 8개의 라벨만 표시
        autoSkip: true
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        callback: function(value) {
          return '₩' + formatNumberInt(value);
        }
      }
    }
  }
}

const formatNumber = (number) => {
  return new Intl.NumberFormat('ko-KR').format(number)
}

const formatNumberInt = (number) => {
  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(number)
}

const changeDays = (days) => {
  selectedDays.value = days
  fetchDailyAssets()
}

// 세그먼트 인디케이터 위치 계산
const segmentIndicatorStyle = computed(() => {
  const index = dayOptions.findIndex(option => option.value === selectedDays.value)
  const width = 100 / dayOptions.length
  return {
    transform: `translateX(${index * 100}%)`,
    width: `${width}%`
  }
})

// 실시간 데이터를 적용한 계산된 자산 정보
const calculatedAssets = computed(() => {
  if (!hasRealTimeData.value) return categories.value

  return categories.value.map(category => ({
    ...category,
    subCategories: category.subCategories.map(subCategory => ({
      ...subCategory,
      assets: subCategory.assets.map(asset => {
        if (subCategory.category === 'FOREIGN' && asset.totalQuantity) {
          const stockData = realTimeStockData.value[asset.id]
          const usdRate = realTimeExchangeRates.value['USD']
          
          if (stockData && usdRate) {
            // 실시간 현재가치 (USD)
            const currentAmount = asset.totalQuantity * stockData.currentPrice
            // 평가손익 (USD)
            const unrealizedGain = currentAmount - asset.amount
            const returnRate = (unrealizedGain / asset.amount) * 100
            // 원화 환산
            const currentAmountInKRW = currentAmount * usdRate
            const unrealizedGainKRW = unrealizedGain * usdRate
            
            return {
              ...asset,
              currentAmount,
              currentPrice: stockData.currentPrice,
              unrealizedGain,
              unrealizedGainKRW,
              returnRate,
              currentAmountInKRW,
              currentExchangeRate: usdRate,
              hasRealTimeData: true
            }
          }
        }
        return { ...asset, hasRealTimeData: false }
      })
    }))
  }))
})

// 실시간 데이터가 적용된 총 자산 계산
const calculatedTotalAmount = computed(() => {
  if (!hasRealTimeData.value) return totalAmount.value

  return calculatedAssets.value.reduce((total, category) => {
    return total + category.subCategories.reduce((catTotal, subCategory) => {
      return catTotal + subCategory.assets.reduce((subTotal, asset) => {
        if (asset.hasRealTimeData) {
          return subTotal + asset.currentAmountInKRW
        } else if (subCategory.category === 'FOREIGN') {
          return subTotal + asset.amountInKRW
        } else {
          return subTotal + asset.amount
        }
      }, 0)
    }, 0)
  }, 0)
})

const fetchAssets = async () => {
  try {
    const response = await axios.get('/api/assets')
    const { totalAmount: total, categories: cats } = response.data
    
    totalAmount.value = total
    categories.value = cats

    // 파이 차트 데이터: 서브카테고리 기준
    const subCats = []
    cats.forEach(cat => {
      cat.subCategories.forEach(sub => {
        subCats.push(sub)
      })
    })
    pieChartData.value = {
      labels: subCats.map(sub => sub.categoryName),
      datasets: [{
        data: subCats.map(sub => sub.totalAmount),
        backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#E91E63', '#00BCD4', '#FF5722', '#795548']
      }]
    }
  } catch (error) {
    console.error('자산 데이터 조회 실패:', error)
  }
}

// 실시간 데이터 가져오기
const fetchRealTimeData = async () => {
  try {
    // 환율과 해외주식 데이터를 병렬로 가져오기
    const [exchangeRatesResponse, stockReturnsResponse] = await Promise.all([
      axios.get('/api/assets/exchange-rates').catch(err => {
        console.warn('환율 정보 조회 실패:', err.message)
        return { data: { success: false, data: [] } }
      }),
      axios.get('/api/assets/foreign-stock-returns').catch(err => {
        console.warn('해외주식 정보 조회 실패:', err.message)
        return { data: { success: false, data: [] } }
      })
    ])

    // 환율 데이터 처리
    if (exchangeRatesResponse.data.success) {
      const exchangeRateMap = {}
      exchangeRatesResponse.data.data.forEach(rate => {
        exchangeRateMap[rate.currency] = rate.rate
      })
      realTimeExchangeRates.value = exchangeRateMap
    }

    // 해외주식 데이터 처리
    if (stockReturnsResponse.data.success) {
      const stockDataMap = {}
      stockReturnsResponse.data.data.forEach(stock => {
        if (!stock.error) {
          stockDataMap[stock.assetId] = stock
        }
      })
      realTimeStockData.value = stockDataMap
    }

    // 실시간 데이터가 있으면 플래그 설정
    hasRealTimeData.value = Object.keys(realTimeStockData.value).length > 0

  } catch (error) {
    console.error('실시간 데이터 조회 실패:', error)
    hasRealTimeData.value = false
  }
}

const fetchMonthlyAssets = async () => {
  try {
    const response = await axios.get('/api/assets/monthly')
    const { monthlyData } = response.data
    
    monthlyChartData.value = {
      labels: monthlyData.map(data => data.monthName),
      datasets: [{
        label: '총 자산',
        data: monthlyData.map(data => data.totalAmount),
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        tension: 0.4,
        fill: true
      }]
    }
  } catch (error) {
    console.error('월별 자산 데이터 조회 실패:', error)
  }
}

const fetchDailyAssets = async () => {
  try {
    const response = await axios.get(`/api/asset-snapshots/daily-changes?days=${selectedDays.value}`)
    const { data: dailyData } = response.data
    
    // 날짜 표시 형식 변환
    const formattedData = dailyData.map(item => {
      const date = new Date(item.date);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
      const weekday = weekdays[date.getDay()];
      
      return {
        ...item,
        dateDisplay: `${month}/${day}(${weekday})`
      };
    });
    
    dailyChartData.value = {
      labels: formattedData.map(data => data.dateDisplay),
      datasets: [{
        label: '총 자산',
        data: formattedData.map(data => data.totalAmount),
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
        fill: true
      }]
    }
  } catch (error) {
    console.error('일별 자산 데이터 조회 실패:', error)
  }
}

const fetchRecentTransactions = async () => {
  try {
    const response = await axios.get('/api/assets/transactions/recent?limit=15')
    const { transactions } = response.data
    recentTransactions.value = transactions
  } catch (error) {
    console.error('최근 거래 내역 조회 실패:', error)
  }
}

const formatTransactionDate = (date) => {
  const transactionDate = new Date(date)
  const now = new Date()
  const diffTime = Math.abs(now - transactionDate)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) {
    return '오늘'
  } else if (diffDays === 2) {
    return '어제'
  } else if (diffDays <= 7) {
    return `${diffDays - 1}일 전`
  } else {
    return transactionDate.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
}

// FAB 관련 메서드
const toggleFabMenu = () => {
  fabMenuOpen.value = !fabMenuOpen.value
}

const openAddAssetModal = () => {
  showAddAssetModal.value = true
  fabMenuOpen.value = false
  resetAssetForm()
}

const openAddTransactionModal = () => {
  showAddTransactionModal.value = true
  fabMenuOpen.value = false
  resetTransactionForm()
}

const openDeleteAssetModal = () => {
  showDeleteAssetModal.value = true
  fabMenuOpen.value = false
  assetToDelete.value = ''
}

const closeModals = () => {
  showAddAssetModal.value = false
  showAddTransactionModal.value = false
  showDeleteAssetModal.value = false
  resetAssetForm()
  resetTransactionForm()
}

// 자산 추가 관련 메서드
const resetAssetForm = () => {
  assetFormStep.value = 1
  newAsset.value = {
    mainCategory: '',
    subCategory: '',
    name: '',
    amount: 0,
    quantity: 0,
    price: 0,
    currency: 'KRW',
    exchangeRate: 1
  }
}

const selectMainCategory = (categoryKey) => {
  newAsset.value.mainCategory = categoryKey
  newAsset.value.subCategory = '' // 서브카테고리 초기화
  newAsset.value.currency = 'KRW' // 통화 초기화
}

const nextStep = () => {
  if (assetFormStep.value < 2) {
    assetFormStep.value++
  }
}

const prevStep = () => {
  if (assetFormStep.value > 1) {
    assetFormStep.value--
  }
}

const getCategoryIcon = (categoryKey) => {
  const icons = {
    'STOCK': '📈',
    'CASH': '💰',
    'SUBSCRIPTION': '🏠',
    'CRYPTO': '₿',
    'PENSION': '🏛️',
    'RETIREMENT': '💼',
    'INSURANCE': '🛡️',
    'OTHER': '📋'
  }
  return icons[categoryKey] || '📋'
}

const getSubCategories = (mainCategory) => {
  return subCategories[mainCategory] || {}
}

const isStockOrCrypto = (mainCategory) => {
  return mainCategory === 'STOCK' || mainCategory === 'CRYPTO'
}

// 자산 추가 API 호출
const addAsset = async () => {
  try {
    const assetData = {
      name: newAsset.value.name,
      mainCategory: newAsset.value.mainCategory,
      subCategory: newAsset.value.subCategory,
      currency: newAsset.value.currency,
      exchangeRate: newAsset.value.exchangeRate
    }

    // 주식/암호화폐인 경우
    if (isStockOrCrypto(newAsset.value.mainCategory)) {
      assetData.quantity = newAsset.value.quantity
      assetData.price = newAsset.value.price
    } else {
      assetData.amount = newAsset.value.amount
    }

    await axios.post('/api/assets', assetData)
    
    // 성공 시 데이터 새로고침
    await fetchAssets()
    await fetchMonthlyAssets()
    await fetchDailyAssets()
    await fetchRecentTransactions()
    
    closeModals()
    alert('자산이 성공적으로 추가되었습니다!')
  } catch (error) {
    console.error('자산 추가 실패:', error)
    alert('자산 추가에 실패했습니다: ' + (error.response?.data?.message || error.message))
  }
}

// 거래 추가 관련 메서드
const resetTransactionForm = () => {
  newTransaction.value = {
    assetId: '',
    type: '',
    quantity: 0,
    price: 0,
    exchangeRate: 1
  }
}

const onAssetSelect = () => {
  // 선택된 자산의 환율을 기본값으로 설정
  const asset = selectedAsset.value
  if (asset && asset.currency !== 'KRW') {
    const latestTransaction = asset.transactions && asset.transactions.length > 0 
      ? asset.transactions[asset.transactions.length - 1] 
      : null
    
    if (latestTransaction) {
      newTransaction.value.exchangeRate = latestTransaction.exchangeRate
    }
  }
}

// 거래 추가 API 호출
const addTransaction = async () => {
  try {
    const transactionData = {
      type: newTransaction.value.type,
      quantity: newTransaction.value.quantity,
      price: newTransaction.value.price
    }

    // 외화 자산인 경우 환율 추가
    if (selectedAsset.value?.currency !== 'KRW') {
      transactionData.exchangeRate = newTransaction.value.exchangeRate
    }

    await axios.post(`/api/assets/${newTransaction.value.assetId}/transactions`, transactionData)
    
    // 성공 시 데이터 새로고침
    await fetchAssets()
    await fetchMonthlyAssets()
    await fetchDailyAssets()
    await fetchRecentTransactions()
    
    closeModals()
    alert('거래가 성공적으로 추가되었습니다!')
  } catch (error) {
    console.error('거래 추가 실패:', error)
    alert('거래 추가에 실패했습니다: ' + (error.response?.data?.message || error.message))
  }
}

// 자산 삭제 관련 메서드
const selectAssetToDelete = (asset) => {
  assetToDelete.value = asset.id
}

const deleteAsset = async () => {
  if (!assetToDelete.value) return

  if (!confirm('정말로 이 자산을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
    return
  }

  try {
    await axios.delete(`/api/assets/${assetToDelete.value}`)
    
    // 성공 시 데이터 새로고침
    await fetchAssets()
    await fetchMonthlyAssets()
    await fetchDailyAssets()
    await fetchRecentTransactions()
    
    closeModals()
    alert('자산이 성공적으로 삭제되었습니다!')
  } catch (error) {
    console.error('자산 삭제 실패:', error)
    alert('자산 삭제에 실패했습니다: ' + (error.response?.data?.message || error.message))
  }
}

// Computed properties
const isFormValid = computed(() => {
  if (!newAsset.value.mainCategory || !newAsset.value.subCategory || !newAsset.value.name) {
    return false
  }

  if (isStockOrCrypto(newAsset.value.mainCategory)) {
    return newAsset.value.quantity > 0 && newAsset.value.price > 0
  } else {
    return newAsset.value.amount > 0
  }
})

const tradableAssets = computed(() => {
  const assets = []
  categories.value.forEach(category => {
    if (category.category === 'STOCK' || category.category === 'CRYPTO') {
      category.subCategories.forEach(subCategory => {
        subCategory.assets.forEach(asset => {
          assets.push({
            ...asset,
            mainCategory: category.category,
            subCategory: subCategory.category,
            currency: asset.currency || 'KRW'
          })
        })
      })
    }
  })
  return assets
})

const selectedAsset = computed(() => {
  if (!newTransaction.value.assetId) return null
  return tradableAssets.value.find(asset => asset.id === newTransaction.value.assetId)
})

onMounted(() => {
  fetchAssets()
  fetchMonthlyAssets()
  fetchDailyAssets()
  fetchRecentTransactions()
  fetchRealTimeData()
})
</script>

<style scoped>
.dashboard {
  padding: 2rem;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.header-main {
  width: 100%;
}

.total-assets {
  margin-top: 1rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border: 1px solid #f0f0f0;
}

.amount {
  font-size: 2.5rem;
  font-weight: bold;
  color: #2c3e50;
  margin-top: 0.5rem;
}

.realtime-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  margin-top: 0.5rem;
}

.realtime-icon {
  font-size: 0.9rem;
  animation: spin 2s linear infinite;
}

.realtime-text {
  font-size: 0.85rem;
  color: #4CAF50;
  font-weight: 600;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.refresh-realtime-btn {
  margin-top: 0.8rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(76, 175, 80, 0.2);
}

.refresh-realtime-btn:hover {
  background: linear-gradient(135deg, #45a049, #4CAF50);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

.chart-container {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  height: 450px;
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.chart-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.chart-tabs {
  display: flex;
  gap: 0.5rem;
}

.header-widget {
  flex: 0 0 auto;
}

.tab-btn {
  padding: 0.5rem 1rem;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #666;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  border-color: #2196F3;
  color: #2196F3;
}

.tab-btn.active {
  background: #2196F3;
  border-color: #2196F3;
  color: white;
}

/* 자산 상세 컨테이너만 높이 확장 및 전체 너비 사용 */
.asset-detail-container {
  grid-column: 1 / -1;
  height: 700px;
}

.asset-list {
  margin-top: 1rem;
  max-height: 600px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.category-section {
  margin-bottom: 1.5rem;
}

.category-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #eee;
}

.subcategory-section {
  margin-left: 1rem;
  margin-bottom: 1rem;
}

.subcategory-title {
  font-size: 1rem;
  font-weight: 500;
  color: #666;
  margin-bottom: 0.5rem;
}

.asset-item-card {
  background: #f8fafd;
  border-radius: 12px;
  padding: 1em 1.2em;
  margin-bottom: 1em;
  box-shadow: 0 2px 8px rgba(33,150,243,0.06);
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.asset-info-row {
  display: flex;
  align-items: center;
  gap: 0.7em;
}

.asset-name {
  font-size: 1.15em;
  font-weight: 700;
  color: #1a237e;
  flex: 1;
  letter-spacing: 0.01em;
}

.quantity-label {
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 10px;
  padding: 0.1em 0.7em;
  font-size: 0.95em;
  font-weight: 600;
  margin-left: 0.5em;
}

.quantity-subtext {
  font-size: 0.92em;
  color: #888;
  margin-top: 0.1em;
  margin-left: 0.1em;
}

.asset-amounts-block {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 0.2em;
  margin-bottom: 0.2em;
}

.amounts-col {
  display: flex;
  flex-direction: column;
  gap: 0.1em;
}

.purchase-price-inline {
  font-size: 0.95em;
  color: #888;
  margin-left: 1em;
  white-space: nowrap;
  align-self: flex-end;
}

.amount-krw {
  color: #222;
  font-weight: 700;
  font-size: 1.15em;
}
.amount-usd-inline {
  color: #888;
  font-size: 0.98em;
  font-weight: 500;
  margin-left: 0.3em;
}

.purchase-price-usd-inline {
  color: #888;
  font-size: 0.98em;
  font-weight: 500;
  margin-left: 0.3em;
}

.current-price-inline {
  color: #666;
  font-size: 0.95em;
  font-weight: 500;
  margin-left: 0.3em;
}

.unrealized-gain {
  font-size: 0.95em;
  font-weight: 600;
  margin-top: 0.3em;
  padding: 0.2em 0.5em;
  border-radius: 6px;
  display: inline-block;
}

.unrealized-gain.profit {
  color: #d32f2f;
  background-color: #ffebee;
  border: 1px solid #ffcdd2;
}

.unrealized-gain.loss {
  color: #1976d2;
  background-color: #e3f2fd;
  border: 1px solid #bbdefb;
}

.chart-wrapper {
  flex: 1;
  min-height: 0;
  position: relative;
}

/* 일별 조회 옵션 스타일 */
.daily-options-container {
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.controls-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
}

.refresh-btn {
  padding: 0.5rem 0.75rem;
  border: 2px solid #4CAF50;
  background: white;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1.1rem;
  color: #4CAF50;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(76, 175, 80, 0.1);
}

.refresh-btn:hover {
  background: #4CAF50;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.2);
}

/* 세그먼트 컨트롤 */
.segment-control {
  position: relative;
  display: inline-flex;
  background: #e9ecef;
  border-radius: 12px;
  padding: 4px;
  overflow: hidden;
}

.segment-btn {
  position: relative;
  padding: 0.5rem 1.25rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #666;
  transition: color 0.3s ease;
  z-index: 2;
}

.segment-btn.active {
  color: white;
}

.segment-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  bottom: 4px;
  background: #4CAF50;
  border-radius: 8px;
  transition: transform 0.3s ease;
  z-index: 1;
}

/* 상세 영역 탭 스타일 */
.detail-header {
  margin-bottom: 1.5rem;
}

.detail-tabs {
  display: flex;
  gap: 0.5rem;
}

.detail-tab-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  color: #666;
  transition: all 0.3s ease;
}

.detail-tab-btn:hover {
  border-color: #2196F3;
  color: #2196F3;
  transform: translateY(-1px);
}

.detail-tab-btn.active {
  background: #2196F3;
  border-color: #2196F3;
  color: white;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

/* 최근 거래 스타일 */
.transactions-list {
  max-height: 600px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.no-transactions {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.empty-state {
  text-align: center;
  color: #999;
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.transaction-timeline {
  position: relative;
}

.transaction-timeline::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #e0e0e0, #f0f0f0);
}

.transaction-card {
  position: relative;
  display: flex;
  margin-bottom: 1.5rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
  border-left: 4px solid transparent;
}

.transaction-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.transaction-card.buy {
  border-left-color: #f44336;
}

.transaction-card.sell {
  border-left-color: #2196F3;
}

.transaction-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  position: relative;
  z-index: 2;
}

.transaction-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.transaction-content {
  flex: 1;
  padding: 1.25rem 1.5rem;
}

.transaction-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.asset-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
}

.transaction-type {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
}

.transaction-type.buy {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.transaction-type.sell {
  background: rgba(33, 150, 243, 0.1);
  color: #2196F3;
}

.transaction-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-row .label {
  font-size: 0.8rem;
  color: #999;
  font-weight: 500;
}

.detail-row .value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
}

.detail-row .value.amount.buy {
  color: #f44336;
}

.detail-row .value.amount.sell {
  color: #2196F3;
}

.transaction-date {
  font-size: 0.85rem;
  color: #999;
  font-weight: 500;
}

/* 스크롤바 커스터마이징 */
.transactions-list::-webkit-scrollbar {
  width: 6px;
}

.transactions-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.transactions-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.transactions-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 위젯 섹션 스타일 */
.widgets-section {
  margin-top: 2rem;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border: 1px solid #f0f0f0;
}

.widgets-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

/* 플로팅 액션 버튼 스타일 */
.fab-container {
  position: fixed;
  bottom: 30px;
  right: 30px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  z-index: 1000;
}

.fab-menu {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-bottom: 1rem;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  pointer-events: none;
}

.fab-menu.active {
  opacity: 1;
  transform: translateY(0);
  pointer-events: all;
}

.fab-option {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  margin-bottom: 0.75rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  min-width: 140px;
  justify-content: flex-start;
  transform: scale(0.8);
  opacity: 0;
  animation: fadeInUp 0.3s ease forwards;
}

.fab-option:nth-child(1) { animation-delay: 0.1s; }
.fab-option:nth-child(2) { animation-delay: 0.2s; }
.fab-option:nth-child(3) { animation-delay: 0.3s; }

@keyframes fadeInUp {
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.fab-option:hover {
  background: #f5f5f5;
  transform: scale(1.05) translateX(-5px);
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.2);
}

.fab-icon {
  font-size: 1.2rem;
  margin-right: 0.5rem;
}

.fab-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
}

.fab-main {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.fab-main:hover {
  transform: scale(1.1) rotate(90deg);
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.6);
}

.fab-main.active {
  transform: rotate(45deg);
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.fab-main-icon {
  font-size: 1.8rem;
  color: white;
  font-weight: bold;
  transition: transform 0.3s ease;
}

/* 모달 스타일 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(5px);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes slideUp {
  from {
    transform: translateY(50px) scale(0.9);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 2rem 1rem 2rem;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
  font-weight: 700;
}

.modal-close {
  width: 40px;
  height: 40px;
  background: #f8f9fa;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 1.2rem;
  transition: all 0.3s ease;
}

.modal-close:hover {
  background: #e9ecef;
  color: #495057;
  transform: rotate(90deg);
}

.modal-body {
  padding: 1rem 2rem 2rem 2rem;
}

.form-step h3 {
  color: #495057;
  margin-bottom: 1.5rem;
  font-weight: 600;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #495057;
  font-weight: 600;
  font-size: 0.9rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
}

.btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  min-width: 100px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f8f9fa;
  color: #495057;
  border: 2px solid #e9ecef;
}

.btn-secondary:hover:not(:disabled) {
  background: #e9ecef;
  transform: translateY(-1px);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(102, 126, 234, 0.4);
}

.btn-danger {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.3);
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(245, 87, 108, 0.4);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.category-card {
  padding: 1rem;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.category-card:hover {
  background: #e3f2fd;
  border-color: #2196F3;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(33, 150, 243, 0.1);
}

.category-card.selected {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
}

.category-icon {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
}

.category-name {
  font-size: 0.9rem;
  font-weight: 600;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.calculated-amount {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 10px;
  margin: 1rem 0;
  font-weight: 600;
  color: #495057;
  text-align: center;
  border: 2px dashed #dee2e6;
}

.selected-asset-info {
  background: #e3f2fd;
  padding: 1rem;
  border-radius: 10px;
  margin-bottom: 1.5rem;
  border-left: 4px solid #2196F3;
}

.asset-summary .asset-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1976D2;
  margin-bottom: 0.25rem;
}

.asset-details {
  font-size: 0.9rem;
  color: #666;
}

.radio-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.radio-option {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.radio-option input[type="radio"] {
  display: none;
}

.radio-label {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  justify-content: center;
  font-weight: 600;
}

.radio-option input[type="radio"]:checked + .radio-label.buy {
  background: rgba(244, 67, 54, 0.1);
  border-color: #f44336;
  color: #f44336;
}

.radio-option input[type="radio"]:checked + .radio-label.sell {
  background: rgba(33, 150, 243, 0.1);
  border-color: #2196F3;
  color: #2196F3;
}

.delete-warning {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
}

.warning-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
}

.delete-warning p {
  margin: 0;
  color: #856404;
}

.asset-list-delete {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  padding: 1rem;
}

.category-group {
  margin-bottom: 1.5rem;
}

.category-group h4 {
  color: #495057;
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e9ecef;
}

.category-group h5 {
  color: #666;
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0.75rem 0 0.5rem 1rem;
}

.asset-delete-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin: 0.5rem 1rem;
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.asset-delete-item:hover {
  background: #e9ecef;
  border-color: #dee2e6;
}

.asset-delete-item.selected {
  background: rgba(245, 87, 108, 0.1);
  border-color: #f5576c;
}

.asset-info {
  flex: 1;
}

.asset-info .asset-name {
  font-weight: 600;
  color: #495057;
  margin-bottom: 0.25rem;
}

.asset-info .asset-amount {
  font-size: 0.9rem;
  color: #666;
}

.delete-radio {
  margin-left: 1rem;
}

.delete-radio input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
</style> 
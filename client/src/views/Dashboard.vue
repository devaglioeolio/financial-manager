<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="header-main">
        <h1>자산 현황</h1>
        <div class="total-assets">
          <h2>총 자산</h2>
          <p class="amount">₩{{ formatNumberInt(totalAmount) }}</p>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="chart-container">
        <h3>자산 분포</h3>
        <PieChart :data="pieChartData" :options="chartOptions" />
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
          <div v-for="category in categories" :key="category.category" class="category-section">
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
                        ₩{{ formatNumberInt(subCategory.category === 'FOREIGN'
                          ? asset.amountInKRW
                          : asset.amount
                        ) }}
                        <span v-if="subCategory.category === 'FOREIGN'" class="amount-usd-inline">
                          ( ${{ formatNumber(asset.amount) }} )
                        </span>
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
const activeTab = ref('monthly')
const selectedDays = ref(7)
const activeDetailTab = ref('assets')
const recentTransactions = ref([])

const dayOptions = [
  { value: 7, label: '7일' },
  { value: 14, label: '14일' },
  { value: 30, label: '30일' }
]

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
    const response = await axios.get(`/api/assets/daily?days=${selectedDays.value}`)
    const { dailyData } = response.data
    
    dailyChartData.value = {
      labels: dailyData.map(data => data.dateDisplay),
      datasets: [{
        label: '총 자산',
        data: dailyData.map(data => data.totalAmount),
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

onMounted(() => {
  fetchAssets()
  fetchMonthlyAssets()
  fetchDailyAssets()
  fetchRecentTransactions()
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
</style> 
<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>자산 현황</h1>
      <div class="total-assets">
        <h2>총 자산</h2>
        <p class="amount">₩{{ formatNumber(totalAssets) }}</p>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="chart-container">
        <h3>자산 분포</h3>
        <PieChart :data="pieChartData" :options="chartOptions" />
      </div>
      
      <div class="chart-container">
        <h3>월별 자산 추이</h3>
        <LineChart :data="lineChartData" :options="chartOptions" />
      </div>

      <div class="asset-details">
        <h3>자산 상세</h3>
        <div class="asset-list">
          <div v-for="asset in assets" :key="asset.id" class="asset-item">
            <div class="asset-info">
              <span class="asset-name">{{ asset.name }}</span>
              <span class="asset-category">{{ asset.category }}</span>
            </div>
            <span class="asset-amount">₩{{ formatNumber(asset.amount) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Pie as PieChart, Line as LineChart } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js'
import GoalTracker from '@/components/GoalTracker.vue'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement)

const totalAssets = ref(0)
const assets = ref([])

const pieChartData = {
  labels: ['예금', '주식', '펀드', '기타'],
  datasets: [{
    data: [45000000, 33000000, 22000000, 1000000],
    backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0']
  }]
}

const lineChartData = {
  labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
  datasets: [{
    label: '자산 추이',
    data: [100000000, 102000000, 105000000, 103000000, 107000000, 110000000],
    borderColor: '#2196F3',
    tension: 0.4
  }]
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom'
    }
  }
}

const formatNumber = (number) => {
  return new Intl.NumberFormat('ko-KR').format(number)
}

onMounted(() => {
  totalAssets.value = 110000000
  assets.value = [
    {
      id: 1,
      name: '국민은행 예금',
      category: '예금',
      amount: 45000000
    },
    {
      id: 2,
      name: '삼성전자 주식',
      category: '주식',
      amount: 33000000
    },
    {
      id: 3,
      name: '미래에셋 글로벌주식',
      category: '펀드',
      amount: 22000000
    }
  ]
})
</script>

<style scoped>
.dashboard {
  padding: 2rem;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.total-assets {
  margin-top: 1rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
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
  height: 400px;
}

.asset-details {
  grid-column: 1 / -1;
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.asset-list {
  margin-top: 1rem;
}

.asset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.asset-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.asset-name {
  font-weight: 500;
  color: #2c3e50;
}

.asset-category {
  font-size: 0.875rem;
  color: #666;
  background: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
}

.asset-amount {
  font-weight: bold;
  color: #2c3e50;
  font-size: 1.1rem;
}
</style> 
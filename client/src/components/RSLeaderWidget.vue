<template>
  <div class="rs-leader-widget">
    <div class="widget-header">
      <h3>🚀 RS 리더 (주도주)</h3>
      <div class="controls">
        <div class="market-info">
          <span class="market-label">🇺🇸 미국 주요 종목</span>
        </div>
        <button @click="toggleAdvancedMode" class="toggle-btn">
          {{ advancedMode ? '기본 모드' : '고급 모드' }}
        </button>
        <button @click="refreshData" class="refresh-btn" :disabled="loading">
          {{ loading ? '로딩중...' : '새로고침' }}
        </button>
      </div>
    </div>

    <!-- 고급 필터 -->
    <div v-if="advancedMode" class="advanced-filters">
      <div class="filter-row">
        <div class="filter-group">
          <label>최소 RS:</label>
          <input v-model.number="filters.minRS" type="number" min="0" step="0.1" />
        </div>
        <div class="filter-group">
          <label>최소 주가:</label>
          <input v-model.number="filters.minPrice" type="number" min="0" step="0.1" />
        </div>
        <div class="filter-group">
          <label>최대 주가:</label>
          <input v-model.number="filters.maxPrice" type="number" min="0" step="0.1" />
        </div>
        <div class="filter-group">
          <label>최소 일일 상승률:</label>
          <input v-model.number="filters.minDailyGain" type="number" min="0" step="0.1" />
        </div>
        <button @click="applyFilters" class="apply-btn">적용</button>
      </div>
    </div>

    <!-- 시장 통계 및 서비스 상태 -->
    <div v-if="marketStats || serviceStatus" class="market-stats">
      <div v-if="serviceStatus" class="stat-item">
        <span class="stat-label">데이터 개수:</span>
        <span class="stat-value">{{ serviceStatus.dataCount }}개</span>
      </div>
      <div v-if="marketStats" class="stat-item">
        <span class="stat-label">평균 RS:</span>
        <span class="stat-value">{{ marketStats.avgRS }}</span>
      </div>
      <div v-if="marketStats" class="stat-item">
        <span class="stat-label">상승 종목:</span>
        <span class="stat-value positive">{{ marketStats.positiveRS }} ({{ marketStats.positivePercentage }}%)</span>
      </div>
      <div v-if="serviceStatus" class="stat-item">
        <span class="stat-label">마지막 업데이트:</span>
        <span class="stat-value">{{ formatLastUpdate(serviceStatus.lastUpdate) }}</span>
      </div>
    </div>

    <!-- RS 리더 테이블 -->
    <div class="leaders-table-container">
      <table class="leaders-table">
        <thead>
          <tr>
            <th>순위</th>
            <th>종목명</th>
            <th>RS 점수</th>
            <th>현재가</th>
            <th>일일 변동률</th>
            <th>5일 수익률</th>
            <th>20일 수익률</th>
            <th v-if="advancedMode">거래량</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(leader, index) in leaders" :key="leader.symbol" class="leader-row">
            <td class="rank">{{ leader.relativeStrengthRank || index + 1 }}</td>
            <td class="symbol">
              <div class="symbol-info">
                <span class="ticker">{{ leader.symbol }}</span>
              </div>
            </td>
            <td class="rs-score">
              <div class="rs-bar">
                <div class="rs-value" :class="getRSClass(leader.relativeStrength)">
                  {{ leader.relativeStrength.toFixed(1) }}
                </div>
                <div class="rs-bar-fill" :style="{ width: getRSBarWidth(leader.relativeStrength) }"></div>
              </div>
            </td>
            <td class="price">${{ leader.closePrice?.toFixed(2) }}</td>
            <td class="change" :class="getChangeClass(leader.changePercent)">
              {{ leader.changePercent ? (leader.changePercent > 0 ? '+' : '') + leader.changePercent.toFixed(2) + '%' : 'N/A' }}
            </td>
            <td class="performance" :class="getChangeClass(leader.pricePerformance?.['5d'])">
              {{ leader.pricePerformance?.['5d'] ? (leader.pricePerformance['5d'] > 0 ? '+' : '') + leader.pricePerformance['5d'].toFixed(2) + '%' : 'N/A' }}
            </td>
            <td class="performance" :class="getChangeClass(leader.pricePerformance?.['20d'])">
              {{ leader.pricePerformance?.['20d'] ? (leader.pricePerformance['20d'] > 0 ? '+' : '') + leader.pricePerformance['20d'].toFixed(2) + '%' : 'N/A' }}
            </td>
            <td v-if="advancedMode" class="volume">
              {{ leader.volume ? formatVolume(leader.volume) : 'N/A' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 로딩 상태 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>RS 리더 데이터를 불러오는 중...</p>
    </div>

    <!-- 에러 상태 -->
    <div v-if="error" class="error-state">
      <p>❌ {{ error }}</p>
      <button @click="fetchLeaders" class="retry-btn">다시 시도</button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'RSLeaderWidget',
  data() {
    return {
      leaders: [],
      marketStats: null,
      advancedMode: false,
      loading: false,
      error: null,
      serviceStatus: null,
      filters: {
        minRS: 0,
        minPrice: 10,
        maxPrice: 1000,
        minDailyGain: -10
      }
    };
  },
  mounted() {
    this.fetchLeaders();
    this.fetchMarketStats();
    this.fetchServiceStatus();
  },
  methods: {
    async fetchLeaders() {
      this.loading = true;
      this.error = null;
      
      try {
        const endpoint = this.advancedMode ? '/api/simple-rs/advanced' : '/api/simple-rs/top';
        const params = {
          limit: 50
        };
        
        if (this.advancedMode) {
          Object.assign(params, this.filters);
        }
        
        const response = await axios.get(endpoint, { params });
        this.leaders = response.data.data.leaders || [];
        
        if (response.data.data.message) {
          this.error = response.data.data.message;
        }
      } catch (error) {
        this.error = error.response?.data?.message || 'RS 리더 조회 중 오류가 발생했습니다.';
        console.error('RS 리더 조회 오류:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async fetchMarketStats() {
      try {
        const response = await axios.get('/api/simple-rs/stats');
        this.marketStats = response.data.data.stats;
      } catch (error) {
        console.error('시장 통계 조회 오류:', error);
      }
    },
    
    async fetchServiceStatus() {
      try {
        const response = await axios.get('/api/simple-rs/status');
        this.serviceStatus = response.data.data;
      } catch (error) {
        console.error('서비스 상태 조회 오류:', error);
      }
    },
    
    async refreshData() {
      await Promise.all([
        this.fetchLeaders(),
        this.fetchMarketStats(),
        this.fetchServiceStatus()
      ]);
    },
    
    toggleAdvancedMode() {
      this.advancedMode = !this.advancedMode;
      this.fetchLeaders();
    },
    
    applyFilters() {
      this.fetchLeaders();
    },
    
    getRSClass(rs) {
      if (rs >= 20) return 'rs-excellent';
      if (rs >= 10) return 'rs-good';
      if (rs >= 5) return 'rs-average';
      if (rs >= 0) return 'rs-weak';
      return 'rs-poor';
    },
    
    getRSBarWidth(rs) {
      const maxRS = Math.max(...this.leaders.map(l => l.relativeStrength));
      return `${Math.min(100, (rs / maxRS) * 100)}%`;
    },
    
    getChangeClass(value) {
      if (value > 0) return 'positive';
      if (value < 0) return 'negative';
      return 'neutral';
    },
    
    formatVolume(volume) {
      if (volume >= 1000000) {
        return (volume / 1000000).toFixed(1) + 'M';
      } else if (volume >= 1000) {
        return (volume / 1000).toFixed(1) + 'K';
      }
      return volume.toString();
    },
    
    formatLastUpdate(timestamp) {
      if (!timestamp) return 'N/A';
      
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return '방금 전';
      if (diffMins < 60) return `${diffMins}분 전`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}시간 전`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}일 전`;
    }
  }
};
</script>

<style scoped>
.rs-leader-widget {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 800px; /* 전체 위젯 높이 제한 */
}

.widget-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.widget-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.market-info {
  display: flex;
  align-items: center;
}

.market-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.toggle-btn, .refresh-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

.toggle-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.advanced-filters {
  padding: 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.filter-row {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  font-size: 0.8rem;
  color: #666;
}

.filter-group input {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 80px;
}

.apply-btn {
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-left: auto;
}

.market-stats {
  padding: 15px 20px;
  background: #f8f9fa;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #e9ecef;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.stat-label {
  font-size: 0.8rem;
  color: #666;
}

.stat-value {
  font-weight: bold;
  font-size: 1rem;
}

.stat-value.positive {
  color: #28a745;
}

.stat-value.negative {
  color: #dc3545;
}

.leaders-table-container {
  flex: 1; /* 남은 공간 모두 차지 */
  min-height: 0; /* flex 아이템이 축소될 수 있도록 */
  overflow-y: auto;
  max-height: 500px; /* 최대 높이 설정 */
}

/* 스크롤바 스타일 개선 */
.leaders-table-container::-webkit-scrollbar {
  width: 8px;
}

.leaders-table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.leaders-table-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.leaders-table-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.leaders-table {
  width: 100%;
  border-collapse: collapse;
}

.leaders-table th {
  background: #f8f9fa;
  padding: 12px 8px;
  text-align: left;
  font-weight: 600;
  font-size: 0.9rem;
  color: #666;
  border-bottom: 2px solid #e9ecef;
  position: sticky;
  top: 0;
  z-index: 10;
}

.leaders-table td {
  padding: 10px 8px;
  border-bottom: 1px solid #e9ecef;
  font-size: 0.9rem;
}

.leader-row:hover {
  background: #f8f9fa;
}

.rank {
  font-weight: bold;
  color: #666;
  width: 60px;
}

.symbol-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ticker {
  font-weight: bold;
  color: #333;
}

.market-badge {
  font-size: 0.7rem;
  background: #e9ecef;
  color: #666;
  padding: 2px 6px;
  border-radius: 10px;
  width: fit-content;
}

.rs-score {
  width: 120px;
}

.rs-bar {
  position: relative;
  height: 24px;
  background: #f8f9fa;
  border-radius: 12px;
  overflow: hidden;
}

.rs-value {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.8rem;
  z-index: 2;
}

.rs-bar-fill {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  border-radius: 12px;
  transition: width 0.3s ease;
}

.rs-excellent {
  color: white;
}

.rs-excellent + .rs-bar-fill {
  background: linear-gradient(90deg, #28a745, #20c997);
}

.rs-good {
  color: white;
}

.rs-good + .rs-bar-fill {
  background: linear-gradient(90deg, #17a2b8, #28a745);
}

.rs-average {
  color: #333;
}

.rs-average + .rs-bar-fill {
  background: linear-gradient(90deg, #ffc107, #17a2b8);
}

.rs-weak {
  color: #333;
}

.rs-weak + .rs-bar-fill {
  background: linear-gradient(90deg, #fd7e14, #ffc107);
}

.rs-poor {
  color: white;
}

.rs-poor + .rs-bar-fill {
  background: linear-gradient(90deg, #dc3545, #fd7e14);
}

.price {
  font-weight: bold;
  color: #333;
}

.change, .performance {
  font-weight: bold;
}

.change.positive, .performance.positive {
  color: #28a745;
}

.change.negative, .performance.negative {
  color: #dc3545;
}

.change.neutral, .performance.neutral {
  color: #666;
}

.volume {
  color: #666;
}

.loading-state {
  padding: 40px;
  text-align: center;
  flex: 1; /* 남은 공간 차지 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  padding: 40px;
  text-align: center;
  flex: 1; /* 남은 공간 차지 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.retry-btn {
  margin-top: 15px;
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .rs-leader-widget {
    max-height: 70vh; /* 모바일에서는 뷰포트 높이의 70% */
  }
  
  .leaders-table-container {
    max-height: 400px; /* 모바일에서는 더 작은 높이 */
  }
  
  .controls {
    flex-direction: column;
    gap: 5px;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .market-stats {
    flex-direction: column;
    gap: 10px;
  }
  
  .leaders-table {
    font-size: 0.8rem;
  }
  
  .leaders-table th,
  .leaders-table td {
    padding: 8px 4px;
  }
  
  /* 모바일 스크롤바는 숨김 */
  .leaders-table-container::-webkit-scrollbar {
    width: 4px;
  }
}
</style> 
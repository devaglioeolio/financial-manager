<template>
  <div class="goal-tracker">
    <h2>금융자산 목표</h2>
    
    <!-- 목표 생성 폼 -->
    <div class="goal-form" v-if="showForm">
      <form @submit.prevent="createGoal">
        <div class="form-group">
          <label>목표 제목</label>
          <input v-model="newGoal.title" required>
        </div>
        <div class="form-group">
          <label>목표 금액</label>
          <input type="number" v-model="newGoal.targetAmount" required>
        </div>
        <div class="form-group">
          <label>현재 금액</label>
          <input type="number" v-model="newGoal.currentAmount" required>
        </div>
        <div class="form-group">
          <label>목표 달성일</label>
          <input type="date" v-model="newGoal.targetDate" required>
        </div>
        <button type="submit">목표 설정</button>
        <button type="button" @click="showForm = false">취소</button>
      </form>
    </div>

    <!-- 목표 목록 -->
    <div class="goals-list">
      <div v-for="goal in goals" :key="goal._id" class="goal-card">
        <h3>{{ goal.title }}</h3>
        <div class="progress-bar">
          <div 
            class="progress" 
            :style="{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%` }"
          ></div>
        </div>
        <div class="goal-details">
          <p>목표 금액: {{ formatCurrency(goal.targetAmount) }}</p>
          <p>현재 금액: {{ formatCurrency(goal.currentAmount) }}</p>
          <p>달성률: {{ Math.round((goal.currentAmount / goal.targetAmount) * 100) }}%</p>
          <p>목표일: {{ formatDate(goal.targetDate) }}</p>
        </div>
        <div class="goal-actions">
          <button @click="editGoal(goal)">수정</button>
          <button @click="deleteGoal(goal._id)">삭제</button>
        </div>
      </div>
    </div>

    <button v-if="!showForm" @click="showForm = true" class="add-goal-btn">
      새로운 목표 추가
    </button>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'GoalTracker',
  data() {
    return {
      goals: [],
      showForm: false,
      newGoal: {
        title: '',
        targetAmount: 0,
        currentAmount: 0,
        targetDate: ''
      }
    };
  },
  methods: {
    async fetchGoals() {
      try {
        const response = await axios.get('/api/goals');
        this.goals = response.data;
      } catch (error) {
        console.error('목표를 불러오는데 실패했습니다:', error);
      }
    },
    async createGoal() {
      try {
        console.log('전송할 데이터:', this.newGoal);
        const response = await axios.post('/api/goals', this.newGoal);
        this.showForm = false;
        this.newGoal = {
          title: '',
          targetAmount: 0,
          currentAmount: 0,
          targetDate: ''
        };
        await this.fetchGoals();
      } catch (error) {
        console.error('목표 생성에 실패했습니다:', error.response?.data || error);
      }
    },
    async deleteGoal(id) {
      if (confirm('정말로 이 목표를 삭제하시겠습니까?')) {
        try {
          await axios.delete(`/api/goals/${id}`);
          await this.fetchGoals();
        } catch (error) {
          console.error('목표 삭제에 실패했습니다:', error);
        }
      }
    },
    async editGoal(goal) {
      // TODO: 목표 수정 기능 구현
    },
    formatCurrency(amount) {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
      }).format(amount);
    },
    formatDate(date) {
      return new Date(date).toLocaleDateString('ko-KR');
    }
  },
  mounted() {
    this.fetchGoals();
  }
};
</script>

<style scoped>
.goal-tracker {
  padding: 20px;
}

.goal-form {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.goals-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.goal-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.progress-bar {
  background: #eee;
  height: 10px;
  border-radius: 5px;
  margin: 10px 0;
  overflow: hidden;
}

.progress {
  background: #4CAF50;
  height: 100%;
  transition: width 0.3s ease;
}

.goal-details {
  margin: 15px 0;
}

.goal-actions {
  display: flex;
  gap: 10px;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #4CAF50;
  color: white;
  cursor: pointer;
}

button:hover {
  opacity: 0.9;
}

.add-goal-btn {
  margin-top: 20px;
  background: #2196F3;
}
</style> 
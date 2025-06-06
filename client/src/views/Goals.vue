<template>
  <div class="goals-page">
    <h1>금융자산 목표 관리</h1>
    <GoalTracker />
  </div>
</template>

<script>
import GoalTracker from '@/components/GoalTracker.vue'

export default {
  name: 'Goals',
  components: {
    GoalTracker
  }
}
</script>

<style scoped>
.goals-page {
  padding: 20px;
}

h1 {
  margin-bottom: 30px;
  color: #2c3e50;
}
</style> 
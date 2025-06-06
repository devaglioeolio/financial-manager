const express = require('express');
const router = express.Router();
const {
  createGoal,
  getAllGoals,
  getGoalById,
  updateGoal,
  deleteGoal
} = require('../controllers/goalController');
const auth = require('../middleware/auth');

// 모든 라우트에 auth 미들웨어 적용
router.use(auth);

// 목표 생성
router.post('/', createGoal);

// 사용자의 모든 목표 조회
router.get('/', getAllGoals);

// 특정 목표 조회
router.get('/:id', getGoalById);

// 목표 업데이트
router.patch('/:id', updateGoal);

// 목표 삭제
router.delete('/:id', deleteGoal);

module.exports = router; 
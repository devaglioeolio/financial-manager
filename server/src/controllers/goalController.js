const Goal = require('../models/Goal');

// 목표 생성
const createGoal = async (req, res) => {
  try {
    console.log('받은 요청 데이터:', req.body);
    const goal = new Goal({
      ...req.body,
      userId: req.user.id  // 토큰에서 추출한 사용자 ID 사용
    });
    console.log('생성할 목표 데이터:', goal);
    await goal.save();
    res.status(201).json(goal);
  } catch (error) {
    console.error('목표 생성 에러:', error);
    res.status(400).json({ message: error.message });
  }
};

// 사용자의 모든 목표 조회
const getAllGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.id });  // 현재 사용자의 목표만 조회
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 특정 목표 조회
const getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user.id });  // 현재 사용자의 목표만 조회
    if (!goal) {
      return res.status(404).json({ message: '목표를 찾을 수 없습니다.' });
    }
    res.json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 목표 업데이트
const updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user.id });  // 현재 사용자의 목표만 조회
    if (!goal) {
      return res.status(404).json({ message: '목표를 찾을 수 없습니다.' });
    }
    
    Object.assign(goal, req.body);
    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 목표 삭제
const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user.id });  // 현재 사용자의 목표만 삭제
    if (!goal) {
      return res.status(404).json({ message: '목표를 찾을 수 없습니다.' });
    }
    res.json({ message: '목표가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createGoal,
  getAllGoals,
  getGoalById,
  updateGoal,
  deleteGoal
}; 
const cron = require('node-cron');
const { createYesterdaySnapshotsForAllUsers } = require('../services/dailySnapshotService');

/**
 * 매일 자정 1시에 모든 사용자의 전날 자산 스냅샷을 생성하는 스케줄러
 */
const startDailySnapshotScheduler = async () => {
  try {
    console.log('일별 자산 스냅샷 스케줄러를 시작합니다...');
    
    // 매일 오전 1시에 실행 (0 1 * * *)
    // 테스트를 위해 5분마다 실행으로 설정 가능 (*/5 * * * *)
    cron.schedule('0 1 * * *', async () => {
      console.log('=== 일별 자산 스냅샷 생성 시작 ===');
      
      try {
        await createYesterdaySnapshotsForAllUsers();
        console.log('=== 일별 자산 스냅샷 생성 완료 ===');
      } catch (error) {
        console.error('일별 자산 스냅샷 생성 중 오류 발생:', error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Seoul"
    });

    console.log('일별 자산 스냅샷 스케줄러가 시작되었습니다. (매일 오전 1시 실행)');
    
  } catch (error) {
    console.error('일별 자산 스냅샷 스케줄러 시작 실패:', error);
  }
};

/**
 * 테스트용: 즉시 스냅샷 생성 실행
 */
const runSnapshotNow = async () => {
  try {
    console.log('=== 테스트: 즉시 스냅샷 생성 시작 ===');
    await createYesterdaySnapshotsForAllUsers();
    console.log('=== 테스트: 즉시 스냅샷 생성 완료 ===');
  } catch (error) {
    console.error('즉시 스냅샷 생성 실패:', error);
  }
};

module.exports = {
  startDailySnapshotScheduler,
  runSnapshotNow
}; 
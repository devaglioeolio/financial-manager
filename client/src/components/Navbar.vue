<template>
  <nav class="navbar">
    <div class="navbar-container">
      <div class="navbar-brand">
        <h2>💰 Finance Manager</h2>
      </div>
      <div class="navbar-links">
        <router-link to="/" class="nav-link">홈</router-link>
        <router-link to="/dashboard" class="nav-link">대시보드</router-link>
        <router-link to="/goals" class="nav-link">목표 관리</router-link>
        <router-link to="/assets" class="nav-link">자산 관리</router-link>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
}

.navbar-brand h2 {
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.navbar-links {
  display: flex;
  align-items: center;
  gap: 30px;
}

.nav-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.3s ease;
  position: relative;
}

.nav-link:hover {
  color: white;
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.nav-link.router-link-active {
  color: white;
  background-color: rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background-color: white;
  border-radius: 1px;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .navbar-container {
    padding: 0 15px;
  }
  
  .navbar-brand h2 {
    font-size: 1.3rem;
  }
  
  .navbar-links {
    gap: 15px;
  }
  
  .nav-link {
    font-size: 0.9rem;
    padding: 6px 12px;
  }
}

@media (max-width: 480px) {
  .navbar-links {
    gap: 10px;
  }
  
  .nav-link {
    font-size: 0.8rem;
    padding: 4px 8px;
  }
}
</style> 
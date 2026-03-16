<template>
  <div class="container">
    <div class="function-page">
      <div class="header">
        <h1>功能区域</h1>
        <p class="subtitle">请选择您需要的功能</p>
      </div>
      
      <div class="user-info-card">
        <div class="user-info-header">
          <h3>账户信息</h3>
          <button id="logoutBtn" class="btn btn-small btn-secondary" @click="logout">退出登录</button>
        </div>
        <div class="user-info-content">
          <div class="info-row">
            <span class="info-label">账号</span>
            <span class="info-value">{{ userInfo.account || userInfo.loginAccount || userInfo.username || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">到期时间</span>
            <span class="info-value">{{ userInfo.endTime || userInfo.expire_time || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">剩余点数</span>
            <span class="info-value">{{ userInfo.point || userInfo.points || userInfo.balance || '0' }}</span>
          </div>
        </div>
      </div>
      
      <div class="function-list">
        <div class="function-item">
          <div class="function-name">功能示例1</div>
          <div class="function-desc">这是一个功能描述</div>
          <a href="#" class="function-link" target="_blank">打开功能</a>
        </div>
        
        <div class="function-item">
          <div class="function-name">功能示例2</div>
          <div class="function-desc">这是另一个功能描述</div>
          <a href="#" class="function-link" target="_blank">打开功能</a>
        </div>
        
        <div class="function-item">
          <div class="function-name">功能示例3</div>
          <div class="function-desc">这是第三个功能描述</div>
          <a href="#" class="function-link" target="_blank">打开功能</a>
        </div>
        
        <div class="function-item">
          <div class="function-name">功能示例4</div>
          <div class="function-desc">这是第四个功能描述</div>
          <a href="#" class="function-link" target="_blank">打开功能</a>
        </div>
      </div>
      
      <div class="back-link">
        <router-link to="/">返回登录页</router-link>
      </div>
    </div>
    
    <div id="loginAlert" class="login-alert" v-if="!isLoggedIn">
      <div class="login-alert-content">
        <div class="login-alert-icon">⚠️</div>
        <h2>请先登录</h2>
        <p>您需要先登录才能访问功能区域</p>
        <router-link to="/" class="btn btn-primary">去登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { apiManager } from '../api';

const router = useRouter();
const userInfo = ref({});

// 计算属性：登录状态
const isLoggedIn = computed(() => {
  return localStorage.getItem('isLoggedIn') === 'true';
});

// 初始化
onMounted(() => {
  // 检查登录状态
  if (!isLoggedIn.value) {
    return;
  }
  
  // 加载用户信息
  loadUserInfo();
});

// 加载用户信息
const loadUserInfo = () => {
  const userInfoStr = localStorage.getItem('userInfo');
  if (userInfoStr) {
    try {
      userInfo.value = JSON.parse(userInfoStr);
    } catch (e) {
      console.error('解析用户信息失败:', e);
    }
  }
};

// 退出登录
const logout = async () => {
  try {
    await apiManager.logoutUser();
  } catch (e) {
    console.error('退出登录失败:', e);
  }
  
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userInfo');
  router.push('/');
};
</script>

<style scoped>
/* 组件特有样式 */
</style>

<template>
  <div class="login-container">
    <!-- 登录页面 -->
    <div class="login-box" v-if="!isLoggedIn">
      <div class="header">
        <h1>卡密登录系统</h1>
        <p class="subtitle">请输入您的卡密进行验证</p>
      </div>
      
      <div class="form-group">
        <label for="cardKey">卡密</label>
        <input type="text" id="cardKey" v-model="cardKey" placeholder="请输入卡密" autocomplete="off" @keyup.enter="login">
      </div>
      
      <button id="loginBtn" class="btn btn-primary" @click="login" :disabled="isLoading">
        <span class="btn-text" v-if="!isLoading">登录验证</span>
        <span class="btn-loading" v-else>验证中...</span>
      </button>
      
      <div id="message" class="message" :class="{ show: message, success: messageType === 'success', error: messageType === 'error', info: messageType === 'info' }">{{ message }}</div>
    </div>
    
    <!-- 用户信息页面 -->
    <div class="user-info-box" v-else>
      <div class="header">
        <h1>用户信息</h1>
        <p class="subtitle">登录成功，以下是您的账户信息</p>
      </div>
      
      <div class="status-bar">
        <div class="status-item">
          <span class="status-label">连接状态</span>
          <span class="status-value" :class="{ 'status-connected': isConnected, 'status-disconnected': !isConnected }" id="heartbeatStatus">{{ isConnected ? '已连接' : '连接中断' }}</span>
        </div>
      </div>
      
      <div class="info-card">
        <div class="info-item">
          <span class="info-label">账号</span>
          <span class="info-value" id="userAccount">{{ userInfo.account || userInfo.loginAccount || userInfo.username || '-' }}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">到期时间</span>
          <span class="info-value" id="userEndTime">{{ userInfo.endTime || userInfo.expire_time || '-' }}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">剩余点数</span>
          <span class="info-value" id="userPoint">{{ userInfo.point || userInfo.points || userInfo.balance || '0' }}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">登录时间</span>
          <span class="info-value" id="loginTime">{{ loginTime }}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">客户端ID</span>
          <span class="info-value" id="clientId">{{ clientId }}</span>
        </div>
      </div>
      
      <div class="function-link-section">
        <router-link to="/functions" class="btn btn-primary">进入功能区</router-link>
      </div>
      
      <div class="debug-section" style="margin-top: 20px; text-align: center;">
        <button id="checkLoginStatus" class="btn btn-small" style="background: #666; color: white;" @click="checkLoginStatus">检查登录状态</button>
      </div>
      
      <button id="logoutBtn" class="btn btn-secondary" @click="logout">退出登录</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { apiManager } from '../api';

const router = useRouter();

// 状态管理
const cardKey = ref('');
const isLoggedIn = ref(false);
const isLoading = ref(false);
const message = ref('');
const messageType = ref('');
const isConnected = ref(true);
const userInfo = ref({});
const loginTime = ref('');
const clientId = ref('');

// 心跳定时器
let heartbeatInterval = null;

// 初始化
onMounted(() => {
  // 生成客户端ID
  clientId.value = apiManager.clientId;
  
  // 检查本地存储中的登录状态
  const savedLoginStatus = localStorage.getItem('isLoggedIn');
  if (savedLoginStatus === 'true') {
    const savedUserInfo = localStorage.getItem('userInfo');
    if (savedUserInfo) {
      userInfo.value = JSON.parse(savedUserInfo);
      isLoggedIn.value = true;
      loginTime.value = new Date().toLocaleString('zh-CN');
      startHeartbeat();
    }
  }
});

// 清理
onUnmounted(() => {
  stopHeartbeat();
});

// 登录方法
const login = async () => {
  const cardKeyValue = cardKey.value.trim();
  
  if (!cardKeyValue) {
    showMessage('请输入卡密', 'error');
    return;
  }

  isLoading.value = true;
  showMessage('正在连接服务器...', 'info');

  try {
    // 初始化软件
    const initResponse = await apiManager.initSoftware();

    if (initResponse && (initResponse.code === 1 || initResponse.code === 200)) {
      showMessage('服务器连接成功，正在验证卡密...', 'info');
    } else {
      let initMsg = '服务器连接失败';
      
      if (initResponse.msg) {
        initMsg = initResponse.msg;
      } else if (initResponse.message) {
        initMsg = initResponse.message;
      } else if (initResponse.data && typeof initResponse.data === 'object') {
        initMsg = initResponse.data.msg || initResponse.data.message || initMsg;
      } else if (initResponse.data && typeof initResponse.data === 'string') {
        try {
          const parsedData = JSON.parse(initResponse.data);
          initMsg = parsedData.msg || parsedData.message || initMsg;
        } catch (e) {
        }
      }
      
      showMessage(initMsg, 'error');
      isLoading.value = false;
      return;
    }

    // 登录验证
    const loginResponse = await apiManager.loginUser(cardKeyValue);

    if (loginResponse && (loginResponse.code === 1 || loginResponse.code === 200)) {
      const successMsg = loginResponse.msg || loginResponse.message || '验证成功！';
      showMessage(successMsg, 'success');
      localStorage.setItem('isLoggedIn', 'true');
      
      // 心跳
      try {
        await apiManager.heartbeat();
      } catch (e) {
        console.error('心跳失败:', e);
      }

      // 处理用户信息
      let userDetails = {};
      
      if (loginResponse.result) {
        userDetails = loginResponse.result;
      } else if (loginResponse.data) {
        if (typeof loginResponse.data === 'string') {
          try {
            const parsedData = JSON.parse(loginResponse.data);
            userDetails = parsedData.result || parsedData;
          } catch (e) {
          }
        } else {
          userDetails = loginResponse.data;
        }
      }
      
      userInfo.value = userDetails;
      loginTime.value = new Date().toLocaleString('zh-CN');
      localStorage.setItem('userInfo', JSON.stringify(userDetails));
      
      // 启动心跳
      startHeartbeat();
      
      // 切换到用户信息页面
      setTimeout(() => {
        isLoggedIn.value = true;
        showMessage('', '');
      }, 1000);
    } else {
      let errorMsg = '验证失败，请检查卡密是否正确';
      
      if (loginResponse.msg) {
        errorMsg = loginResponse.msg;
      } else if (loginResponse.message) {
        errorMsg = loginResponse.message;
      } else if (loginResponse.data && typeof loginResponse.data === 'object') {
        errorMsg = loginResponse.data.msg || loginResponse.data.message || errorMsg;
      } else if (loginResponse.data && typeof loginResponse.data === 'string') {
        try {
          const parsedData = JSON.parse(loginResponse.data);
          errorMsg = parsedData.msg || parsedData.message || errorMsg;
        } catch (e) {
        }
      }
      
      showMessage(errorMsg, 'error');
    }
  } catch (error) {
    showMessage('网络错误，请稍后重试', 'error');
    console.error('登录失败:', error);
  } finally {
    isLoading.value = false;
  }
};

// 退出登录
const logout = async () => {
  stopHeartbeat();
  
  try {
    await apiManager.logoutUser();
  } catch (e) {
    console.error('退出登录失败:', e);
  }

  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userInfo');
  cardKey.value = '';
  userInfo.value = {};
  isLoggedIn.value = false;
  showMessage('', '');
};

// 检查登录状态
const checkLoginStatus = () => {
  const isLoggedInStatus = localStorage.getItem('isLoggedIn');
  alert('当前登录状态: ' + (isLoggedInStatus === 'true' ? '已登录' : '未登录'));
  console.log('localStorage内容:', localStorage);
};

// 启动心跳
const startHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  heartbeatInterval = setInterval(async () => {
    try {
      const response = await apiManager.heartbeat();
      
      if (response && (response.code === 1 || response.code === 200)) {
        isConnected.value = true;
      } else {
        isConnected.value = false;
      }
    } catch (e) {
      isConnected.value = false;
    }
  }, 60000);
};

// 停止心跳
const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

// 显示消息
const showMessage = (text, type) => {
  message.value = text;
  messageType.value = type;
  
  if (!text) {
    messageType.value = '';
  }
};
</script>

<style scoped>
/* 组件特有样式 */
</style>

import { createRouter, createWebHashHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import FunctionsView from '../views/FunctionsView.vue';

const routes = [
  {
    path: '/',
    name: 'login',
    component: LoginView
  },
  {
    path: '/functions',
    name: 'functions',
    component: FunctionsView
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// 导航守卫
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  
  // 如果访问功能区但未登录，重定向到登录页
  if (to.name === 'functions' && isLoggedIn !== 'true') {
    next({ name: 'login' });
  } else {
    next();
  }
});

export default router;

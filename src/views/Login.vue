<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h2 class="login-title">跟单系统登录</h2>
        <p class="login-subtitle">请输入您的凭证以进入控制台</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-item">
          <label for="username">账号</label>
          <input 
            id="username"
            type="text" 
            v-model="loginForm.username" 
            placeholder="普通: user123 | 导师: leader888" 
            required 
          />
        </div>

        <div class="form-item">
          <label for="password">密码</label>
          <input 
            id="password" 
            type="password" 
            v-model="loginForm.password" 
            placeholder="默认密码均为: 123456" 
            required 
          />
        </div>

        <p class="login-tips">
          普通账号: user123 &nbsp;&nbsp;&nbsp; 导师账号: leader888<br>默认密码均为: 123456
        </p>

        <button type="submit" class="btn btn-login" :disabled="loading">
          {{ loading ? '正在验证...' : '登 录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)

const loginForm = reactive({
  username: 'leader888',
  password: '123456'
})

const handleLogin = async () => {
  loading.value = true
  try {
    // 模拟接口响应延迟
    await new Promise(resolve => setTimeout(resolve, 600))
    
    // 根据账号分配不同身份并存入缓存，供 Dashboard 页面读取
    if (loginForm.username === 'user123' && loginForm.password === '123456') {
      localStorage.setItem('current_user', JSON.stringify({ username: 'user123', isLeader: false }))
      localStorage.setItem('auth_token', 'mock_user_token')
      router.push('/dashboard')
    } else if (loginForm.username === 'leader888' && loginForm.password === '123456') {
      localStorage.setItem('current_user', JSON.stringify({ username: 'leader888', isLeader: true }))
      localStorage.setItem('auth_token', 'mock_leader_token')
      router.push('/dashboard')
    } else {
      alert('账号或密码错误！')
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped src="./Login.css"></style>
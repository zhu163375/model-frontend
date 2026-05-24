<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h2 class="login-title">控制台登录</h2>
        <p class="login-subtitle">请输入您的凭证以进入控制台</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-item">
          <label for="username">账号</label>
          <input
            id="username"
            type="text"
            v-model="loginForm.account"
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
import * as authApi from '../api/auth.js'
import { ApiError } from '../api/http.js'

const router = useRouter()
const loading = ref(false)

const loginForm = reactive({
  account: 'leader888',
  password: '123456',
})

function saveSession(token, user) {
  localStorage.setItem('auth_token', token)
  localStorage.setItem(
    'current_user',
    JSON.stringify({
      id: user.id,
      username: user.username,
      nickName: user.nickName,
      isLeader: user.isLeader,
    }),
  )
}

const handleLogin = async () => {
  loading.value = true
  try {
    const { token, user } = await authApi.login(loginForm.account, loginForm.password)
    saveSession(token, user)
    router.push('/dashboard')
  } catch (error) {
    const message = error instanceof ApiError ? error.message : '登录失败，请稍后重试'
    alert(message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped src="./Login.css"></style>

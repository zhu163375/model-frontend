<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h2 class="login-title">实物料跟单社区</h2>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-item">
          <label for="username">手机号</label>
          <input
            id="username"
            type="text"
            v-model="loginForm.login"
            placeholder="请输入手机号"
            required
          />
        </div>

        <div class="form-item">
          <label for="password">密码</label>
          <input
            id="password"
            type="password"
            v-model="loginForm.password"
            placeholder="请输入密码"
            required
          />
        </div>

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
  login: '',
  password: '',
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
    const { token, user } = await authApi.login(loginForm.login, loginForm.password)
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

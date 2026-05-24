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

<style scoped>
:global(html), :global(body), :global(#app) {
  margin: 0 !important;
  padding: 0 !important;
  height: 100% !important;
  width: 100% !important;
  overflow: hidden !important;
}

.login-page {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --border: #e2e8f0;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);

  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: var(--bg-gradient);
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.login-card {
  background: #ffffff;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  width: 380px;
  box-sizing: border-box;
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 8px 0;
}

.login-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
}

.form-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.form-item label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}

input[type="text"], input[type="password"] {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

input[type="text"]:focus, input[type="password"]:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.login-tips {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0 0 20px 0;
  line-height: 1.6;
  background: #f8fafc;
  padding: 10px;
  border-radius: 6px;
  border-left: 3px solid var(--primary);
}

.btn {
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-login {
  width: 100%;
  padding: 12px;
  background: var(--primary);
}

.btn-login:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn:disabled {
  background: #cbd5e1;
  color: #94a3b8;
  cursor: not-allowed;
  opacity: 0.7;
}

@media (max-width: 768px) {
  :global(html), :global(body), :global(#app) {
    overflow: auto !important;
  }

  .login-page {
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    width: 100%;
    height: auto;
    padding: 16px;
    padding-top: max(16px, env(safe-area-inset-top));
    padding-bottom: max(16px, env(safe-area-inset-bottom));
    align-items: flex-start;
  }

  .login-card {
    width: 100%;
    max-width: 380px;
    margin: auto 0;
    padding: 28px 20px;
    border-radius: 12px;
  }

  .login-title {
    font-size: 20px;
  }

  input[type="text"], input[type="password"] {
    font-size: 16px;
    padding: 12px 14px;
  }

  .btn-login {
    padding: 14px;
    min-height: 48px;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 12px;
    padding-top: max(12px, env(safe-area-inset-top));
  }

  .login-card {
    padding: 24px 16px;
    box-shadow: 0 10px 30px -8px rgba(0, 0, 0, 0.4);
  }

  .login-tips {
    font-size: 11px;
    word-break: break-all;
  }
}
</style>
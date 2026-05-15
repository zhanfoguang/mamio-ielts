<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '../stores/theme'
import api from '../services/api'

const router = useRouter()
const themeStore = useThemeStore()

const step = ref(1) // 1: enter email, 2: enter code, 3: new password
const email = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)

async function sendCode() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await api.post('/auth/forgot-password', { email: email.value })
    success.value = data.message
    step.value = 2
  } catch (e) {
    error.value = e.response?.data?.error || '发送失败'
  } finally {
    loading.value = false
  }
}

async function verifyCode() {
  error.value = ''
  loading.value = true
  try {
    await api.post('/auth/verify-reset-code', { email: email.value, code: code.value })
    step.value = 3
    success.value = ''
  } catch (e) {
    error.value = e.response?.data?.error || '验证失败'
  } finally {
    loading.value = false
  }
}

async function resetPassword() {
  error.value = ''
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次密码不一致'
    return
  }
  loading.value = true
  try {
    const { data } = await api.post('/auth/reset-password', {
      email: email.value,
      code: code.value,
      newPassword: newPassword.value
    })
    success.value = data.message
    step.value = 4
  } catch (e) {
    error.value = e.response?.data?.error || '重置失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="forgot-page">
    <div class="forgot-card">
      <h1 class="forgot-title">Mamio IELTS</h1>
      <p class="forgot-subtitle">{{ themeStore.lang === 'zh' ? '重置密码' : 'Reset Password' }}</p>

      <!-- Step 1: Enter email -->
      <form v-if="step === 1" @submit.prevent="sendCode" class="forgot-form">
        <p class="step-desc">{{ themeStore.lang === 'zh' ? '输入你注册时使用的邮箱' : 'Enter the email you registered with' }}</p>
        <div class="form-group">
          <input v-model="email" type="email" required placeholder="your@email.com" autofocus />
        </div>
        <button type="submit" class="submit-btn" :disabled="loading || !email.trim()">
          {{ loading ? '...' : (themeStore.lang === 'zh' ? '发送验证码' : 'Send Code') }}
        </button>
      </form>

      <!-- Step 2: Enter code -->
      <form v-if="step === 2" @submit.prevent="verifyCode" class="forgot-form">
        <p class="step-desc">{{ themeStore.lang === 'zh' ? '验证码已发送到' : 'Code sent to' }} <strong>{{ email }}</strong></p>
        <div class="form-group">
          <input v-model="code" type="text" required placeholder="000000" maxlength="6" autofocus />
        </div>
        <button type="submit" class="submit-btn" :disabled="loading || code.length < 6">
          {{ loading ? '...' : (themeStore.lang === 'zh' ? '验证' : 'Verify') }}
        </button>
        <button type="button" class="link-btn" @click="sendCode">{{ themeStore.lang === 'zh' ? '重新发送' : 'Resend Code' }}</button>
      </form>

      <!-- Step 3: New password -->
      <form v-if="step === 3" @submit.prevent="resetPassword" class="forgot-form">
        <p class="step-desc">{{ themeStore.lang === 'zh' ? '设置新密码' : 'Set new password' }}</p>
        <div class="form-group">
          <input v-model="newPassword" type="password" required minlength="6" :placeholder="themeStore.lang === 'zh' ? '新密码（至少6位）' : 'New password (min 6)'" autofocus />
        </div>
        <div class="form-group">
          <input v-model="confirmPassword" type="password" required minlength="6" :placeholder="themeStore.lang === 'zh' ? '确认新密码' : 'Confirm new password'" />
        </div>
        <button type="submit" class="submit-btn" :disabled="loading || newPassword.length < 6">
          {{ loading ? '...' : (themeStore.lang === 'zh' ? '重置密码' : 'Reset Password') }}
        </button>
      </form>

      <!-- Step 4: Success -->
      <div v-if="step === 4" class="forgot-form">
        <p class="success-msg">{{ success }}</p>
        <button class="submit-btn" @click="router.push('/login')">
          {{ themeStore.lang === 'zh' ? '去登录' : 'Go to Login' }}
        </button>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
      <p v-if="success && step !== 4" class="success-msg">{{ success }}</p>

      <button class="back-link" @click="router.push('/login')">
        {{ themeStore.lang === 'zh' ? '← 返回登录' : '← Back to Login' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.forgot-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  background: var(--bg-primary);
}

.forgot-card {
  width: 100%;
  max-width: 400px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
}

.forgot-title {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  text-align: center;
  letter-spacing: -0.03em;
  margin-bottom: 4px;
}

.forgot-subtitle {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-bottom: var(--space-xl);
}

.forgot-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.step-desc {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 4px;
}

.step-desc strong {
  color: var(--text-primary);
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: transparent;
  color: var(--text-primary);
  outline: none;
  text-align: center;
  letter-spacing: 4px;
  font-weight: 600;
}

.form-group input:focus {
  border-color: var(--blue);
}

.submit-btn {
  padding: 12px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: var(--font-size-base);
  transition: opacity var(--transition-fast);
}

[data-theme="dark"] .submit-btn {
  background: var(--white);
  color: var(--black);
}

.submit-btn:hover { opacity: 0.85; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.link-btn {
  background: none;
  color: var(--blue);
  font-size: var(--font-size-sm);
  text-align: center;
}

.error-msg {
  margin-top: var(--space-md);
  padding: 10px;
  background: var(--red-soft);
  color: var(--red);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  text-align: center;
}

.success-msg {
  margin-top: var(--space-md);
  padding: 10px;
  background: var(--green-soft);
  color: var(--green);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  text-align: center;
}

.back-link {
  display: block;
  margin-top: var(--space-xl);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  background: none;
}

.back-link:hover { color: var(--text-primary); }
</style>

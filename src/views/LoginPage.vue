<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '../stores/theme'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const themeStore = useThemeStore()
const authStore = useAuthStore()

const mode = ref('login') // login, register, activate
const email = ref('')
const password = ref('')
const nickname = ref('')
const inviteCode = ref('')
const error = ref('')
const success = ref('')

async function handleLogin() {
  error.value = ''
  try {
    await authStore.login(email.value, password.value)
    router.push('/speaking')
  } catch (e) {
    error.value = e.response?.data?.error || '登录失败'
  }
}

async function handleRegister() {
  error.value = ''
  try {
    await authStore.register(email.value, password.value, nickname.value)
    router.push('/speaking')
  } catch (e) {
    error.value = e.response?.data?.error || '注册失败'
  }
}

async function handleActivate() {
  error.value = ''
  success.value = ''
  try {
    const data = await authStore.activate(inviteCode.value)
    success.value = data.message
    inviteCode.value = ''
  } catch (e) {
    error.value = e.response?.data?.error || '激活失败'
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">Mamio IELTS</h1>
      <p class="login-subtitle">{{ themeStore.lang === 'zh' ? 'AI 驱动的雅思备考平台' : 'AI-Powered IELTS Prep' }}</p>

      <!-- Mode tabs -->
      <div class="mode-tabs">
        <button class="mode-tab" :class="{ active: mode === 'login' }" @click="mode = 'login'; error = ''">
          {{ themeStore.lang === 'zh' ? '登录' : 'Login' }}
        </button>
        <button class="mode-tab" :class="{ active: mode === 'register' }" @click="mode = 'register'; error = ''">
          {{ themeStore.lang === 'zh' ? '注册' : 'Register' }}
        </button>
        <button class="mode-tab" :class="{ active: mode === 'activate' }" @click="mode = 'activate'; error = ''">
          {{ themeStore.lang === 'zh' ? '激活码' : 'Activate' }}
        </button>
      </div>

      <!-- Login form -->
      <form v-if="mode === 'login'" @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label>{{ themeStore.lang === 'zh' ? '邮箱' : 'Email' }}</label>
          <input v-model="email" type="email" required placeholder="your@email.com" />
        </div>
        <div class="form-group">
          <label>{{ themeStore.lang === 'zh' ? '密码' : 'Password' }}</label>
          <input v-model="password" type="password" required minlength="6" :placeholder="themeStore.lang === 'zh' ? '至少 6 位' : 'At least 6 characters'" />
        </div>
        <button type="submit" class="submit-btn" :disabled="authStore.loading">
          {{ authStore.loading ? '...' : (themeStore.lang === 'zh' ? '登录' : 'Login') }}
        </button>
      </form>

      <!-- Register form -->
      <form v-if="mode === 'register'" @submit.prevent="handleRegister" class="login-form">
        <div class="form-group">
          <label>{{ themeStore.lang === 'zh' ? '邮箱' : 'Email' }}</label>
          <input v-model="email" type="email" required placeholder="your@email.com" />
        </div>
        <div class="form-group">
          <label>{{ themeStore.lang === 'zh' ? '昵称' : 'Nickname' }}</label>
          <input v-model="nickname" type="text" :placeholder="themeStore.lang === 'zh' ? '选填' : 'Optional'" />
        </div>
        <div class="form-group">
          <label>{{ themeStore.lang === 'zh' ? '密码' : 'Password' }}</label>
          <input v-model="password" type="password" required minlength="6" :placeholder="themeStore.lang === 'zh' ? '至少 6 位' : 'At least 6 characters'" />
        </div>
        <p class="trial-hint">{{ themeStore.lang === 'zh' ? '注册即享 3 天免费试用，每天 10 次 AI 调用' : '3-day free trial with 10 AI calls per day' }}</p>
        <button type="submit" class="submit-btn" :disabled="authStore.loading">
          {{ authStore.loading ? '...' : (themeStore.lang === 'zh' ? '注册并开始试用' : 'Register & Start Trial') }}
        </button>
      </form>

      <!-- Activate form -->
      <div v-if="mode === 'activate'" class="login-form">
        <template v-if="authStore.isLoggedIn">
          <div class="form-group">
            <label>{{ themeStore.lang === 'zh' ? '激活码' : 'Invite Code' }}</label>
            <input v-model="inviteCode" type="text" placeholder="MAMIO-XXXX-YYYY" />
          </div>
          <button class="submit-btn" @click="handleActivate" :disabled="!inviteCode.trim()">
            {{ themeStore.lang === 'zh' ? '激活' : 'Activate' }}
          </button>
          <p v-if="success" class="success-msg">{{ success }}</p>
        </template>
        <template v-else>
          <p class="login-hint">{{ themeStore.lang === 'zh' ? '请先登录后再输入激活码' : 'Please login first to use an invite code' }}</p>
        </template>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>

      <!-- Status info -->
      <div v-if="authStore.isLoggedIn && authStore.user" class="status-info">
        <div class="status-row">
          <span class="status-label">{{ themeStore.lang === 'zh' ? '状态' : 'Status' }}</span>
          <span class="status-value" :class="authStore.user.role">
            {{ { admin: themeStore.lang === 'zh' ? '管理员' : 'Admin', paid: themeStore.lang === 'zh' ? '已激活' : 'Active', trial: themeStore.lang === 'zh' ? '试用中' : 'Trial', expired: themeStore.lang === 'zh' ? '已过期' : 'Expired' }[authStore.user.role] }}
          </span>
        </div>
        <div v-if="authStore.isTrial" class="status-row">
          <span class="status-label">{{ themeStore.lang === 'zh' ? '剩余天数' : 'Days Left' }}</span>
          <span class="status-value">{{ authStore.trialDaysLeft }} {{ themeStore.lang === 'zh' ? '天' : 'days' }}</span>
        </div>
        <div v-if="authStore.user.expires_at" class="status-row">
          <span class="status-label">{{ themeStore.lang === 'zh' ? '到期时间' : 'Expires' }}</span>
          <span class="status-value">{{ new Date(authStore.user.expires_at).toLocaleDateString() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  background: var(--bg-primary);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
}

.login-title {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  text-align: center;
  letter-spacing: -0.03em;
  margin-bottom: 4px;
}

.login-subtitle {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-bottom: var(--space-xl);
}

.mode-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: 4px;
  margin-bottom: var(--space-xl);
}

.mode-tab {
  flex: 1;
  padding: 8px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
}

.mode-tab.active {
  background: var(--card-bg);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

.form-group input {
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: transparent;
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
}

.form-group input:focus {
  border-color: var(--blue);
}

.trial-hint {
  font-size: var(--font-size-xs);
  color: var(--green);
  text-align: center;
  padding: 8px;
  background: var(--green-soft);
  border-radius: var(--radius-sm);
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

.login-hint {
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
  padding: var(--space-lg);
}

.status-info {
  margin-top: var(--space-xl);
  padding-top: var(--space-xl);
  border-top: 1px solid var(--border-color);
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.status-label {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.status-value {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.status-value.admin { color: var(--purple); }
.status-value.paid { color: var(--green); }
.status-value.trial { color: var(--blue); }
.status-value.expired { color: var(--red); }
</style>

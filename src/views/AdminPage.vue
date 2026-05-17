<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '../stores/theme'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const router = useRouter()
const themeStore = useThemeStore()
const authStore = useAuthStore()

const tab = ref('codes')
const codes = ref([])
const users = ref([])
const stats = ref(null)
const logs = ref([])
const logStats = ref([])
const loading = ref(false)
const generating = ref(false)
const newCodes = ref([])
const showGenerate = ref(false)
const generateType = ref('month')
const generateCount = ref(1)
const copiedCode = ref('')
const copyMessage = ref('')

const presets = [
  { key: 'month', label: '月卡', labelEn: 'Monthly', days: 30, color: 'var(--blue)' },
  { key: 'quarter', label: '季卡', labelEn: 'Quarterly', days: 90, color: 'var(--green)' },
  { key: 'year', label: '年卡', labelEn: 'Yearly', days: 365, color: 'var(--purple)' }
]

const selectedPreset = computed(() => presets.find(p => p.key === generateType.value))

function getDurationLabel(days) {
  if (days === 30) return themeStore.lang === 'zh' ? '月卡' : 'Monthly'
  if (days === 90) return themeStore.lang === 'zh' ? '季卡' : 'Quarterly'
  if (days === 365) return themeStore.lang === 'zh' ? '年卡' : 'Yearly'
  return `${days} ${themeStore.lang === 'zh' ? '天' : 'days'}`
}

function getDurationColor(days) {
  if (days === 30) return 'var(--blue)'
  if (days === 90) return 'var(--green)'
  if (days === 365) return 'var(--purple)'
  return 'var(--text-secondary)'
}

async function fetchCodes() {
  loading.value = true
  try {
    const { data } = await api.get('/auth/admin/codes')
    codes.value = data
  } catch (e) {
    console.error('Failed to fetch codes:', e)
  } finally {
    loading.value = false
  }
}

async function fetchUsers() {
  loading.value = true
  try {
    const { data } = await api.get('/auth/admin/users')
    users.value = data
  } catch (e) {
    console.error('Failed to fetch users:', e)
  } finally {
    loading.value = false
  }
}

function openGenerate(type) {
  generateType.value = type
  generateCount.value = 1
  newCodes.value = []
  showGenerate.value = true
}

async function doGenerate() {
  generating.value = true
  try {
    const { data } = await api.post('/auth/admin/codes', {
      count: generateCount.value,
      duration_days: selectedPreset.value.days
    })
    newCodes.value = data.codes
    await fetchCodes()
  } catch (e) {
    console.error('Failed to generate codes:', e)
  } finally {
    generating.value = false
  }
}

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

async function copyCode(code) {
  await writeClipboard(code)
  copiedCode.value = code
  copyMessage.value = themeStore.lang === 'zh' ? '已复制' : 'Copied'
  setTimeout(() => {
    if (copiedCode.value === code) copiedCode.value = ''
  }, 1800)
}

async function fetchStats() {
  try {
    const { data } = await api.get('/auth/admin/stats')
    stats.value = data
  } catch (e) {
    console.error('Failed to fetch stats:', e)
  }
}

async function fetchLogs() {
  try {
    const { data } = await api.get('/auth/admin/logs')
    logs.value = data.logs
    logStats.value = data.dailyStats
  } catch (e) {
    console.error('Failed to fetch logs:', e)
  }
}

async function copyAllNew() {
  await writeClipboard(newCodes.value.join('\n'))
  copiedCode.value = '__all__'
  copyMessage.value = themeStore.lang === 'zh' ? `已复制 ${newCodes.value.length} 个激活码` : `Copied ${newCodes.value.length} codes`
}

function closeGenerate() {
  showGenerate.value = false
  newCodes.value = []
}

onMounted(() => {
  fetchCodes()
  fetchUsers()
  fetchStats()
  fetchLogs()
})
</script>

<template>
  <div class="admin-page">
    <div class="container">
      <div class="admin-header">
        <h1>{{ themeStore.lang === 'zh' ? '管理后台' : 'Admin Panel' }}</h1>
        <p class="admin-desc">{{ themeStore.lang === 'zh' ? '管理激活码和用户' : 'Manage invite codes and users' }}</p>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'stats' }" @click="tab = 'stats'; fetchStats()">
          {{ themeStore.lang === 'zh' ? '使用统计' : 'Usage' }}
        </button>
        <button class="tab" :class="{ active: tab === 'codes' }" @click="tab = 'codes'; fetchCodes()">
          {{ themeStore.lang === 'zh' ? '激活码管理' : 'Invite Codes' }}
        </button>
        <button class="tab" :class="{ active: tab === 'users' }" @click="tab = 'users'; fetchUsers()">
          {{ themeStore.lang === 'zh' ? '用户列表' : 'Users' }}
        </button>
        <button class="tab" :class="{ active: tab === 'logs' }" @click="tab = 'logs'; fetchLogs()">
          {{ themeStore.lang === 'zh' ? 'API日志' : 'API Logs' }}
        </button>
      </div>

      <!-- Stats Tab -->
      <div v-if="tab === 'stats'" class="tab-content">
        <div v-if="stats" class="stats-grid">
          <!-- Overview cards -->
          <div class="stat-card">
            <span class="stat-icon">👥</span>
            <div class="stat-info">
              <span class="stat-value">{{ (stats.roleCounts.trial || 0) + (stats.roleCounts.paid || 0) + (stats.roleCounts.expired || 0) }}</span>
              <span class="stat-label">{{ themeStore.lang === 'zh' ? '总用户' : 'Total Users' }}</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🔥</span>
            <div class="stat-info">
              <span class="stat-value">{{ stats.activeUsers7d }}</span>
              <span class="stat-label">{{ themeStore.lang === 'zh' ? '7天活跃' : '7d Active' }}</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">📊</span>
            <div class="stat-info">
              <span class="stat-value">{{ stats.activeUsers30d }}</span>
              <span class="stat-label">{{ themeStore.lang === 'zh' ? '30天活跃' : '30d Active' }}</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🤖</span>
            <div class="stat-info">
              <span class="stat-value">{{ stats.callsToday }}</span>
              <span class="stat-label">{{ themeStore.lang === 'zh' ? '今日AI调用' : 'AI Calls Today' }}</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">💰</span>
            <div class="stat-info">
              <span class="stat-value">{{ stats.trialConversion.rate }}%</span>
              <span class="stat-label">{{ themeStore.lang === 'zh' ? '试用转化率' : 'Trial Conversion' }}</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">⏰</span>
            <div class="stat-info">
              <span class="stat-value">{{ stats.expiringSoon.length }}</span>
              <span class="stat-label">{{ themeStore.lang === 'zh' ? '即将到期' : 'Expiring Soon' }}</span>
            </div>
          </div>
        </div>

        <!-- Role breakdown -->
        <div v-if="stats" class="detail-section">
          <h3 class="section-title">{{ themeStore.lang === 'zh' ? '用户角色分布' : 'User Role Breakdown' }}</h3>
          <div class="role-bars">
            <div v-for="(count, role) in stats.roleCounts" :key="role" class="role-bar-row">
              <span class="role-label">{{ { admin: themeStore.lang === 'zh' ? '管理员' : 'Admin', paid: themeStore.lang === 'zh' ? '已激活' : 'Active', trial: themeStore.lang === 'zh' ? '试用' : 'Trial', expired: themeStore.lang === 'zh' ? '已过期' : 'Expired' }[role] || role }}</span>
              <div class="role-bar-track">
                <div class="role-bar-fill" :class="role" :style="{ width: Math.max(4, count / Math.max(...Object.values(stats.roleCounts)) * 100) + '%' }"></div>
              </div>
              <span class="role-count">{{ count }}</span>
            </div>
          </div>
        </div>

        <!-- Top users -->
        <div v-if="stats?.topUsers?.length" class="detail-section">
          <h3 class="section-title">{{ themeStore.lang === 'zh' ? '今日活跃用户' : 'Top Users Today' }}</h3>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>{{ themeStore.lang === 'zh' ? '邮箱' : 'Email' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '角色' : 'Role' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '今日调用' : 'Calls' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in stats.topUsers" :key="u.id">
                  <td class="email-cell">{{ u.nickname || u.email }}</td>
                  <td><span class="role-badge" :class="u.role">{{ u.role }}</span></td>
                  <td>{{ u.ai_calls_today }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Expiring soon -->
        <div v-if="stats?.expiringSoon?.length" class="detail-section">
          <h3 class="section-title">{{ themeStore.lang === 'zh' ? '即将到期用户' : 'Expiring Soon' }}</h3>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>{{ themeStore.lang === 'zh' ? '邮箱' : 'Email' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '到期时间' : 'Expires' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in stats.expiringSoon" :key="u.id">
                  <td class="email-cell">{{ u.nickname || u.email }}</td>
                  <td class="time-cell">{{ new Date(u.expires_at).toLocaleDateString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p v-if="!stats" class="empty-hint">{{ themeStore.lang === 'zh' ? '加载中...' : 'Loading...' }}</p>
      </div>

      <!-- Codes Tab -->
      <div v-if="tab === 'codes'" class="tab-content">
        <!-- Generate buttons -->
        <div class="generate-section">
          <h3 class="section-title">{{ themeStore.lang === 'zh' ? '生成激活码' : 'Generate Codes' }}</h3>
          <div class="preset-buttons">
            <button
              v-for="p in presets"
              :key="p.key"
              class="preset-btn"
              :style="{ '--preset-color': p.color }"
              @click="openGenerate(p.key)"
            >
              <span class="preset-label">{{ themeStore.lang === 'zh' ? p.label : p.labelEn }}</span>
              <span class="preset-days">{{ p.days }} {{ themeStore.lang === 'zh' ? '天' : 'days' }}</span>
            </button>
          </div>
        </div>

        <!-- Generate modal -->
        <div v-if="showGenerate" class="modal-overlay" @click.self="closeGenerate">
          <div class="modal">
            <h3 class="modal-title">
              {{ themeStore.lang === 'zh' ? '生成' : 'Generate' }}
              <span :style="{ color: selectedPreset.color }">{{ themeStore.lang === 'zh' ? selectedPreset.label : selectedPreset.labelEn }}</span>
              {{ themeStore.lang === 'zh' ? '激活码' : 'Codes' }}
            </h3>

            <div v-if="newCodes.length === 0" class="modal-form">
              <div class="form-group">
                <label>{{ themeStore.lang === 'zh' ? '数量' : 'Count' }}</label>
                <input v-model.number="generateCount" type="number" min="1" max="50" />
              </div>
              <button class="submit-btn" @click="doGenerate" :disabled="generating || generateCount < 1">
                {{ generating ? '...' : (themeStore.lang === 'zh' ? '生成' : 'Generate') }}
              </button>
            </div>

            <div v-else class="modal-result">
              <p class="result-count">
                {{ themeStore.lang === 'zh' ? '成功生成' : 'Generated' }}
                <strong>{{ newCodes.length }}</strong>
                {{ themeStore.lang === 'zh' ? '个激活码' : 'codes' }}
              </p>
              <div class="codes-list">
                <div v-for="code in newCodes" :key="code" class="code-item" @click="copyCode(code)">
                  <span class="code-text">{{ code }}</span>
                  <span class="copy-hint">{{ copiedCode === code ? copyMessage : (themeStore.lang === 'zh' ? '点击复制' : 'Click to copy') }}</span>
                </div>
              </div>
              <p v-if="copiedCode === '__all__'" class="copy-message">{{ copyMessage }}</p>
              <div class="modal-actions">
                <button class="submit-btn" @click="copyAllNew">
                  {{ themeStore.lang === 'zh' ? '复制全部' : 'Copy All' }}
                </button>
                <button class="close-btn" @click="closeGenerate">
                  {{ themeStore.lang === 'zh' ? '关闭' : 'Close' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Codes table -->
        <div class="table-section">
          <h3 class="section-title">
            {{ themeStore.lang === 'zh' ? '全部激活码' : 'All Codes' }}
            <span class="count-badge">{{ codes.length }}</span>
          </h3>
          <div class="table-wrap" v-if="codes.length">
            <table class="data-table">
              <thead>
                <tr>
                  <th>{{ themeStore.lang === 'zh' ? '激活码' : 'Code' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '类型' : 'Type' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '状态' : 'Status' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '使用者' : 'Used By' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '使用时间' : 'Used At' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '创建时间' : 'Created' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in codes" :key="c.id" :class="{ unused: !c.used_by }">
                  <td class="code-cell">
                    <button class="code-tag" @click="copyCode(c.code)">
                      {{ c.code }}
                      <span v-if="copiedCode === c.code" class="inline-copied">{{ copyMessage }}</span>
                    </button>
                  </td>
                  <td>
                    <span class="duration-badge" :style="{ color: getDurationColor(c.duration_days), background: getDurationColor(c.duration_days) + '18' }">
                      {{ getDurationLabel(c.duration_days) }}
                    </span>
                  </td>
                  <td>
                    <span v-if="c.used_by" class="status-tag used">{{ themeStore.lang === 'zh' ? '已使用' : 'Used' }}</span>
                    <span v-else class="status-tag available">{{ themeStore.lang === 'zh' ? '未使用' : 'Available' }}</span>
                  </td>
                  <td class="email-cell">{{ c.used_by_email || '—' }}</td>
                  <td class="time-cell">{{ c.used_at ? new Date(c.used_at).toLocaleString() : '—' }}</td>
                  <td class="time-cell">{{ new Date(c.created_at).toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="empty-hint">{{ themeStore.lang === 'zh' ? '暂无激活码' : 'No codes yet' }}</p>
        </div>
      </div>

      <!-- Users Tab -->
      <div v-if="tab === 'users'" class="tab-content">
        <div class="table-section">
          <h3 class="section-title">
            {{ themeStore.lang === 'zh' ? '全部用户' : 'All Users' }}
            <span class="count-badge">{{ users.length }}</span>
          </h3>
          <div class="table-wrap" v-if="users.length">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{{ themeStore.lang === 'zh' ? '邮箱' : 'Email' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '昵称' : 'Nickname' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '角色' : 'Role' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '今日调用' : 'Calls Today' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '到期时间' : 'Expires' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '注册时间' : 'Joined' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in users" :key="u.id">
                  <td>{{ u.id }}</td>
                  <td class="email-cell">{{ u.email }}</td>
                  <td>{{ u.nickname }}</td>
                  <td>
                    <span class="role-badge" :class="u.role">
                      {{ { admin: themeStore.lang === 'zh' ? '管理员' : 'Admin', paid: themeStore.lang === 'zh' ? '已激活' : 'Active', trial: themeStore.lang === 'zh' ? '试用' : 'Trial', expired: themeStore.lang === 'zh' ? '已过期' : 'Expired' }[u.role] }}
                    </span>
                  </td>
                  <td>{{ u.ai_calls_today }}</td>
                  <td class="time-cell">{{ u.expires_at ? new Date(u.expires_at).toLocaleDateString() : '—' }}</td>
                  <td class="time-cell">{{ new Date(u.created_at).toLocaleDateString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="empty-hint">{{ themeStore.lang === 'zh' ? '暂无用户' : 'No users yet' }}</p>
        </div>
      </div>

      <!-- Logs Tab -->
      <div v-if="tab === 'logs'" class="tab-content">
        <!-- Daily stats chart -->
        <div v-if="logStats.length" class="detail-section">
          <h3 class="section-title">{{ themeStore.lang === 'zh' ? '近7天调用量' : 'Last 7 Days API Calls' }}</h3>
          <div class="log-chart">
            <div v-for="d in logStats" :key="d.day" class="log-bar-col">
              <span class="log-bar-value">{{ d.calls }}</span>
              <div class="log-bar" :style="{ height: Math.max(4, d.calls / Math.max(...logStats.map(s => s.calls), 1) * 100) + '%' }"></div>
              <span class="log-bar-label">{{ d.day.slice(5) }}</span>
              <span class="log-bar-latency">{{ Math.round(d.avg_latency || 0) }}ms</span>
            </div>
          </div>
        </div>

        <!-- Recent logs table -->
        <div class="table-section">
          <h3 class="section-title">
            {{ themeStore.lang === 'zh' ? '最近调用记录' : 'Recent API Calls' }}
            <span class="count-badge">{{ logs.length }}</span>
          </h3>
          <div class="table-wrap" v-if="logs.length">
            <table class="data-table">
              <thead>
                <tr>
                  <th>{{ themeStore.lang === 'zh' ? '时间' : 'Time' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '用户' : 'User' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '端点' : 'Endpoint' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '状态' : 'Status' }}</th>
                  <th>{{ themeStore.lang === 'zh' ? '耗时' : 'Latency' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in logs" :key="log.id">
                  <td class="time-cell">{{ new Date(log.created_at).toLocaleString() }}</td>
                  <td class="email-cell">{{ log.nickname || log.email || `#${log.user_id}` }}</td>
                  <td><code class="endpoint-tag">{{ log.endpoint }}</code></td>
                  <td>
                    <span class="status-badge" :class="log.status === 200 ? 'ok' : 'err'">{{ log.status }}</span>
                  </td>
                  <td :class="{ 'latency-slow': log.latency_ms > 10000 }">{{ log.latency_ms }}ms</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="empty-hint">{{ themeStore.lang === 'zh' ? '暂无日志' : 'No logs yet' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  padding-top: calc(var(--header-height) + var(--space-xl));
  padding-bottom: var(--space-4xl);
}

.admin-header {
  margin-bottom: var(--space-xl);
}

.admin-header h1 {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  letter-spacing: 0;
}

.admin-desc {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-top: 4px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: 4px;
  margin-bottom: var(--space-xl);
  width: fit-content;
}

.tab {
  padding: 8px 20px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.tab.active {
  background: var(--card-bg);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Generate section */
.generate-section {
  margin-bottom: var(--space-2xl);
}

.section-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  margin-bottom: var(--space-md);
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-badge {
  font-size: var(--font-size-xs);
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.preset-buttons {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 32px;
  border: 2px solid var(--preset-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  min-width: 120px;
}

.preset-btn:hover {
  background: var(--preset-color);
}

.preset-btn:hover .preset-label,
.preset-btn:hover .preset-days {
  color: var(--white);
}

.preset-label {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--preset-color);
}

.preset-days {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: var(--space-xl);
}

.modal {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  margin-bottom: var(--space-xl);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.modal-form .form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-form label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-secondary);
}

.modal-form input {
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: transparent;
  color: var(--text-primary);
  outline: none;
}

.modal-form input:focus {
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

/* Modal result */
.result-count {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-md);
}

.result-count strong {
  color: var(--green);
  font-size: var(--font-size-lg);
}

.codes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: var(--space-xl);
}

.code-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.code-item:hover {
  background: var(--border-color);
}

.code-text {
  font-family: monospace;
  font-size: var(--font-size-base);
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-primary);
}

.copy-hint {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.copy-message {
  font-size: var(--font-size-xs);
  color: var(--green);
  text-align: center;
  margin: calc(-1 * var(--space-md)) 0 var(--space-md);
}

.modal-actions {
  display: flex;
  gap: var(--space-md);
}

.close-btn {
  flex: 1;
  padding: 12px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: var(--font-size-base);
  transition: background var(--transition-fast);
}

.close-btn:hover {
  background: var(--border-color);
}

/* Table */
.table-section {
  margin-bottom: var(--space-2xl);
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.data-table th {
  text-align: left;
  padding: 12px 16px;
  font-weight: 600;
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}

.data-table td {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  white-space: nowrap;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tr.unused {
  background: var(--green-soft);
}

.data-table tr:hover td {
  background: var(--bg-secondary);
}

.code-cell .code-tag {
  font-family: monospace;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.code-cell .code-tag:hover {
  background: var(--bg-tertiary);
}

.inline-copied {
  font-family: var(--font-family);
  font-size: 10px;
  color: var(--green);
}

.email-cell {
  color: var(--text-primary);
  font-weight: 500;
}

.time-cell {
  font-size: var(--font-size-xs);
}

.duration-badge {
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.status-tag {
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.status-tag.used {
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
}

.status-tag.available {
  color: var(--green);
  background: var(--green-soft);
}

.role-badge {
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.role-badge.admin { color: var(--purple); background: var(--purple-soft); }
.role-badge.paid { color: var(--green); background: var(--green-soft); }
.role-badge.trial { color: var(--blue); background: var(--blue-soft); }
.role-badge.expired { color: var(--red); background: var(--red-soft); }

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-2xl);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.stat-icon { font-size: 1.5rem; }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 800;
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.detail-section {
  margin-bottom: var(--space-2xl);
}

.role-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.role-bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  min-width: 60px;
}

.role-bar-track {
  flex: 1;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.role-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.role-bar-fill.admin { background: var(--purple); }
.role-bar-fill.paid { background: var(--green); }
.role-bar-fill.trial { background: var(--blue); }
.role-bar-fill.expired { background: var(--red); }

.role-count {
  font-size: var(--font-size-sm);
  font-weight: 700;
  min-width: 30px;
  text-align: right;
}

.empty-hint {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

/* Log chart */
.log-chart {
  display: flex;
  gap: var(--space-md);
  align-items: flex-end;
  height: 140px;
  padding: var(--space-md) 0;
}

.log-bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
  justify-content: flex-end;
}

.log-bar-value {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--text-primary);
}

.log-bar {
  width: 100%;
  max-width: 40px;
  background: var(--blue);
  border-radius: 4px 4px 0 0;
  transition: height 0.3s;
}

.log-bar-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.log-bar-latency {
  font-size: 10px;
  color: var(--text-tertiary);
}

.endpoint-tag {
  font-family: monospace;
  font-size: var(--font-size-xs);
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  color: var(--text-secondary);
}

.status-badge {
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.status-badge.ok {
  color: var(--green);
  background: var(--green-soft);
}

.status-badge.err {
  color: var(--red);
  background: var(--red-soft);
}

.latency-slow {
  color: var(--red);
  font-weight: 600;
}

@media (max-width: 768px) {
  .preset-buttons {
    flex-direction: column;
  }

  .preset-btn {
    min-width: auto;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

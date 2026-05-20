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
const contentDrafts = ref([])
const contentHealth = ref(null)
const loading = ref(false)
const generating = ref(false)
const newCodes = ref([])
const showGenerate = ref(false)
const generateType = ref('month')
const generateCount = ref(1)
const copiedCode = ref('')
const copyMessage = ref('')
const selectedDraft = ref(null)
const publishingDraft = ref('')

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

async function fetchContentDrafts() {
  loading.value = true
  try {
    const { data } = await api.get('/auth/admin/content-drafts')
    contentDrafts.value = data.drafts || []
    if (selectedDraft.value) {
      selectedDraft.value = contentDrafts.value.find(d => d.fileName === selectedDraft.value.fileName) || null
    }
  } catch (e) {
    console.error('Failed to fetch content drafts:', e)
  } finally {
    loading.value = false
  }
}

async function fetchContentHealth() {
  try {
    const { data } = await api.get('/auth/admin/content-health')
    contentHealth.value = data
  } catch (e) {
    console.error('Failed to fetch content health:', e)
  }
}

async function updateDraftStatus(draft, status) {
  await api.patch(`/auth/admin/content-drafts/${encodeURIComponent(draft.fileName)}`, {
    status,
    notes: draft.notes || ''
  })
  await fetchContentDrafts()
}

async function publishDraft(draft) {
  if (!draft?.fileName) return
  publishingDraft.value = draft.fileName
  try {
    await api.post(`/auth/admin/content-drafts/${encodeURIComponent(draft.fileName)}/publish`)
    await fetchContentDrafts()
    await fetchContentHealth()
  } catch (e) {
    console.error('Failed to publish content draft:', e)
  } finally {
    publishingDraft.value = ''
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
  fetchContentDrafts()
  fetchContentHealth()
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
        <button class="tab" :class="{ active: tab === 'content' }" @click="tab = 'content'; fetchContentDrafts(); fetchContentHealth()">
          {{ themeStore.lang === 'zh' ? '内容草稿' : 'Content Drafts' }}
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

      <!-- Content Drafts Tab -->
      <div v-if="tab === 'content'" class="tab-content">
        <div v-if="contentHealth" class="content-health">
          <div class="health-score" :class="{ weak: contentHealth.score < 80 }">
            <strong>{{ contentHealth.score }}</strong>
            <span>{{ themeStore.lang === 'zh' ? '题库健康分' : 'Bank Health' }}</span>
          </div>
          <div class="health-metrics">
            <div>
              <span>{{ themeStore.lang === 'zh' ? '阅读' : 'Reading' }}</span>
              <strong>{{ contentHealth.reading.total }}</strong>
              <small>{{ contentHealth.reading.avgWords }} avg words · DB +{{ contentHealth.reading.dbPublished || 0 }}</small>
            </div>
            <div>
              <span>{{ themeStore.lang === 'zh' ? '听力' : 'Listening' }}</span>
              <strong>{{ contentHealth.listening.total }}</strong>
              <small>{{ contentHealth.listening.avgSentences }} avg sentences · DB +{{ contentHealth.listening.dbPublished || 0 }}</small>
            </div>
            <div>
              <span>{{ themeStore.lang === 'zh' ? '阅读等级' : 'Reading Levels' }}</span>
              <strong>E{{ contentHealth.reading.byLevel.easy }} / M{{ contentHealth.reading.byLevel.medium }} / H{{ contentHealth.reading.byLevel.hard }}</strong>
              <small>easy / medium / hard</small>
            </div>
            <div>
              <span>{{ themeStore.lang === 'zh' ? '听力 Section' : 'Listening Sections' }}</span>
              <strong>S1 {{ contentHealth.listening.bySection[1] }} · S2 {{ contentHealth.listening.bySection[2] }} · S3 {{ contentHealth.listening.bySection[3] }} · S4 {{ contentHealth.listening.bySection[4] }}</strong>
              <small>coverage</small>
            </div>
          </div>
          <div v-if="contentHealth.gaps.length" class="health-gaps">
            <span v-for="gap in contentHealth.gaps" :key="gap">{{ gap }}</span>
          </div>
          <div v-else class="health-gaps clean">
            {{ themeStore.lang === 'zh' ? '当前结构覆盖达标，下一步应继续扩内容量和真题相似度。' : 'Current structure coverage is healthy; next focus is volume and exam resemblance.' }}
          </div>
        </div>

        <div class="draft-summary">
          <div class="draft-stat">
            <strong>{{ contentDrafts.length }}</strong>
            <span>{{ themeStore.lang === 'zh' ? '草稿文件' : 'Draft Files' }}</span>
          </div>
          <div class="draft-stat">
            <strong>{{ contentDrafts.filter(d => d.status === 'approved').length }}</strong>
            <span>{{ themeStore.lang === 'zh' ? '已通过' : 'Approved' }}</span>
          </div>
          <div class="draft-stat">
            <strong>{{ contentDrafts.filter(d => d.status === 'rejected').length }}</strong>
            <span>{{ themeStore.lang === 'zh' ? '已驳回' : 'Rejected' }}</span>
          </div>
          <div class="draft-stat">
            <strong>{{ contentDrafts.filter(d => d.quality?.canMerge).length }}</strong>
            <span>{{ themeStore.lang === 'zh' ? '可合并' : 'Merge Ready' }}</span>
          </div>
        </div>

        <div v-if="contentDrafts.length" class="draft-layout">
          <div class="draft-list">
            <button
              v-for="draft in contentDrafts"
              :key="draft.fileName"
              class="draft-card"
              :class="{ active: selectedDraft?.fileName === draft.fileName }"
              @click="selectedDraft = draft"
            >
              <div class="draft-card-top">
                <strong>{{ draft.fileName }}</strong>
                <span class="draft-status" :class="draft.status">{{ draft.status }}</span>
              </div>
              <p>{{ draft.readingCount }} reading · {{ draft.listeningCount }} listening</p>
              <div class="draft-card-meta">
                <small>{{ draft.generatedAt ? new Date(draft.generatedAt).toLocaleString() : '—' }}</small>
                <span class="quality-pill" :class="{ weak: (draft.quality?.score || 0) < 70, good: draft.quality?.canMerge }">
                  Q{{ draft.quality?.score ?? 0 }}
                </span>
              </div>
            </button>
          </div>

          <div class="draft-detail" v-if="selectedDraft">
            <div class="draft-detail-head">
              <div>
                <h3>{{ selectedDraft.fileName }}</h3>
                <p>{{ selectedDraft.sourceSeedFile || 'No seed file' }}</p>
              </div>
              <div class="draft-detail-badges">
                <span v-if="selectedDraft.mergedAt" class="draft-status merged">merged</span>
                <span v-if="selectedDraft.publishedAt" class="draft-status published">published</span>
                <span class="quality-pill" :class="{ weak: (selectedDraft.quality?.score || 0) < 70, good: selectedDraft.quality?.canMerge }">
                  Quality {{ selectedDraft.quality?.score ?? 0 }}
                </span>
                <span class="draft-status" :class="selectedDraft.status">{{ selectedDraft.status }}</span>
              </div>
            </div>

            <div v-if="selectedDraft.quality?.flags?.length" class="quality-panel">
              <h4>{{ themeStore.lang === 'zh' ? '质检问题' : 'Quality Flags' }}</h4>
              <ul>
                <li v-for="flag in selectedDraft.quality.flags" :key="flag.message" :class="flag.severity">
                  <strong>{{ flag.severity }}</strong>
                  <span>{{ flag.message }}</span>
                </li>
              </ul>
            </div>
            <div v-else class="quality-panel clean">
              {{ themeStore.lang === 'zh' ? '结构质检通过，可以进入人工内容审核。' : 'Structure checks passed. Ready for editorial review.' }}
            </div>

            <div class="draft-columns">
              <div>
                <h4>{{ themeStore.lang === 'zh' ? '阅读草稿' : 'Reading Drafts' }}</h4>
                <ul>
                  <li v-for="title in selectedDraft.readingTitles" :key="title">{{ title }}</li>
                  <li v-if="!selectedDraft.readingTitles.length" class="muted">—</li>
                </ul>
              </div>
              <div>
                <h4>{{ themeStore.lang === 'zh' ? '听力草稿' : 'Listening Drafts' }}</h4>
                <ul>
                  <li v-for="title in selectedDraft.listeningTitles" :key="title">{{ title }}</li>
                  <li v-if="!selectedDraft.listeningTitles.length" class="muted">—</li>
                </ul>
              </div>
            </div>

            <label class="notes-label">
              {{ themeStore.lang === 'zh' ? '审核备注' : 'Review Notes' }}
              <textarea v-model="selectedDraft.notes" rows="3" :placeholder="themeStore.lang === 'zh' ? '记录质量问题、修改意见或通过理由' : 'Quality notes, edit requests, or approval reason'"></textarea>
            </label>

            <div class="draft-actions">
              <button class="approve-btn" :disabled="!selectedDraft.quality?.canMerge" @click="updateDraftStatus(selectedDraft, 'approved')">
                {{ themeStore.lang === 'zh' ? '通过' : 'Approve' }}
              </button>
              <button
                class="publish-btn"
                :disabled="selectedDraft.status !== 'approved' || !selectedDraft.quality?.canMerge || !!selectedDraft.publishedAt || publishingDraft === selectedDraft.fileName"
                @click="publishDraft(selectedDraft)"
              >
                {{ publishingDraft === selectedDraft.fileName ? '...' : (themeStore.lang === 'zh' ? '发布到题库' : 'Publish to Bank') }}
              </button>
              <button class="reject-btn" @click="updateDraftStatus(selectedDraft, 'rejected')">
                {{ themeStore.lang === 'zh' ? '驳回' : 'Reject' }}
              </button>
              <button class="reset-btn" @click="updateDraftStatus(selectedDraft, 'draft')">
                {{ themeStore.lang === 'zh' ? '退回草稿' : 'Back to Draft' }}
              </button>
            </div>

            <details class="payload-preview">
              <summary>{{ themeStore.lang === 'zh' ? '查看原始 JSON' : 'View Raw JSON' }}</summary>
              <pre>{{ JSON.stringify(selectedDraft.payload, null, 2) }}</pre>
            </details>
          </div>

          <div v-else class="draft-empty-detail">
            {{ themeStore.lang === 'zh' ? '选择一个草稿查看详情' : 'Select a draft to review' }}
          </div>
        </div>

        <p v-else class="empty-hint">
          {{ themeStore.lang === 'zh' ? '暂无生成内容草稿。先运行 npm run content:generate。' : 'No generated content drafts yet. Run npm run content:generate first.' }}
        </p>
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

/* Content drafts */
.content-health {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
  padding: var(--space-lg);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.health-score {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-right: var(--space-md);
  border-right: 1px solid var(--border-color);
}

.health-score strong {
  font-size: 2.4rem;
  line-height: 1;
  font-weight: 900;
  color: var(--green);
}

.health-score.weak strong {
  color: var(--red);
}

.health-score span,
.health-metrics span {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.health-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-md);
}

.health-metrics div {
  min-width: 0;
}

.health-metrics strong {
  display: block;
  margin-top: 4px;
  font-size: var(--font-size-base);
  font-weight: 800;
  overflow-wrap: anywhere;
}

.health-metrics small {
  display: block;
  margin-top: 4px;
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
}

.health-gaps {
  grid-column: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.health-gaps span {
  padding: 4px 8px;
  border-radius: var(--radius-full);
  background: var(--red-soft);
  color: var(--red);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.health-gaps.clean {
  color: var(--green);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.draft-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.draft-stat {
  padding: var(--space-lg);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.draft-stat strong {
  display: block;
  font-size: var(--font-size-2xl);
  font-weight: 800;
}

.draft-stat span {
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.draft-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: var(--space-lg);
  align-items: start;
}

.draft-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.draft-card,
.draft-detail,
.draft-empty-detail {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.draft-card {
  text-align: left;
  padding: 14px;
  transition: border-color 0.2s, transform 0.2s;
}

.draft-card:hover,
.draft-card.active {
  border-color: var(--text-primary);
  transform: translateX(2px);
}

.draft-card-top,
.draft-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.draft-card strong,
.draft-detail h3 {
  font-size: var(--font-size-sm);
  font-weight: 800;
  overflow-wrap: anywhere;
}

.draft-card p,
.draft-card small,
.draft-detail-head p {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
  margin-top: 6px;
}

.draft-card-meta,
.draft-detail-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.draft-status {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

.draft-status.approved {
  color: var(--green);
  background: var(--green-soft);
}

.draft-status.rejected,
.draft-status.invalid {
  color: var(--red);
  background: var(--red-soft);
}

.draft-status.merged {
  color: var(--blue);
  background: var(--blue-soft);
}

.draft-status.published {
  color: var(--purple);
  background: var(--purple-soft);
}

.quality-pill {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 800;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

.quality-pill.good {
  color: var(--green);
  background: var(--green-soft);
}

.quality-pill.weak {
  color: var(--red);
  background: var(--red-soft);
}

.draft-detail,
.draft-empty-detail {
  padding: var(--space-xl);
}

.draft-empty-detail {
  color: var(--text-tertiary);
  text-align: center;
}

.quality-panel {
  margin-top: var(--space-lg);
  padding: var(--space-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.quality-panel.clean {
  color: var(--green);
  background: var(--green-soft);
  border-color: transparent;
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.quality-panel h4 {
  font-size: var(--font-size-sm);
  font-weight: 800;
  margin-bottom: 8px;
}

.quality-panel ul {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quality-panel li {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.quality-panel li strong {
  min-width: 48px;
  color: var(--text-tertiary);
  text-transform: uppercase;
  font-size: 10px;
}

.quality-panel li.high strong {
  color: var(--red);
}

.quality-panel li.medium strong {
  color: var(--blue);
}

.draft-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-lg);
  margin: var(--space-xl) 0;
}

.draft-columns h4 {
  font-size: var(--font-size-sm);
  font-weight: 800;
  margin-bottom: 8px;
}

.draft-columns ul {
  padding-left: 18px;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.7;
}

.muted {
  color: var(--text-tertiary);
}

.notes-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--text-secondary);
}

.notes-label textarea {
  width: 100%;
  margin-top: 8px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  resize: vertical;
}

.draft-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: var(--space-md);
}

.approve-btn,
.publish-btn,
.reject-btn,
.reset-btn {
  padding: 9px 16px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 800;
}

.approve-btn {
  color: var(--green);
  background: var(--green-soft);
}

.approve-btn:disabled {
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  cursor: not-allowed;
  opacity: 0.7;
}

.publish-btn {
  color: var(--purple);
  background: var(--purple-soft);
}

.publish-btn:disabled {
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  cursor: not-allowed;
  opacity: 0.7;
}

.reject-btn {
  color: var(--red);
  background: var(--red-soft);
}

.reset-btn {
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

.payload-preview {
  margin-top: var(--space-xl);
}

.payload-preview summary {
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--text-secondary);
}

.payload-preview pre {
  margin-top: 10px;
  max-height: 360px;
  overflow: auto;
  padding: var(--space-md);
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 11px;
  line-height: 1.5;
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

  .content-health,
  .health-metrics,
  .draft-summary,
  .draft-layout,
  .draft-columns {
    grid-template-columns: 1fr;
  }

  .health-score {
    padding-right: 0;
    padding-bottom: var(--space-md);
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .health-gaps {
    grid-column: auto;
  }
}
</style>

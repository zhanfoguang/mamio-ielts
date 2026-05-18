<script setup>
import { useThemeStore } from '../../stores/theme'
import { useAuthStore } from '../../stores/auth'
import { useRouter } from 'vue-router'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const router = useRouter()

const plans = [
  {
    key: 'trial',
    icon: '🎁',
    priceZh: '免费',
    priceEn: 'Free',
    periodZh: '3天试用',
    periodEn: '3-day trial',
    featuresZh: ['每天 10 次 AI 评分', '口语、写作、听力、词汇全功能', '学习进度追踪'],
    featuresEn: ['10 AI scoring calls/day', 'All modules: Speaking, Writing, Listening, Vocab', 'Progress tracking'],
    ctaZh: '免费注册',
    ctaEn: 'Sign Up Free',
    highlight: false
  },
  {
    key: 'monthly',
    icon: '⚡',
    priceZh: '月卡',
    priceEn: 'Monthly',
    periodZh: '30天',
    periodEn: '30 days',
    featuresZh: ['无限 AI 评分', '全部功能解锁', '口语 Mock 模拟考试', 'AI 学习计划推荐'],
    featuresEn: ['Unlimited AI scoring', 'All features unlocked', 'Speaking mock exams', 'AI study plan'],
    ctaZh: '获取激活码',
    ctaEn: 'Get Activation Code',
    highlight: true
  },
  {
    key: 'yearly',
    icon: '🏆',
    priceZh: '年卡',
    priceEn: 'Yearly',
    periodZh: '365天',
    periodEn: '365 days',
    featuresZh: ['月卡全部功能', '最长有效期', '最划算选择'],
    featuresEn: ['All Monthly features', 'Longest validity', 'Best value'],
    ctaZh: '获取激活码',
    ctaEn: 'Get Activation Code',
    highlight: false
  }
]

function goToPlan(plan) {
  if (plan.key === 'trial') {
    router.push(authStore.isLoggedIn ? '/dashboard' : '/login?mode=register')
    return
  }
  router.push(authStore.isLoggedIn ? '/login?mode=activate' : '/login?mode=register&after=activate')
}
</script>

<template>
  <section id="pricing" class="section">
    <div class="container">
      <div class="section-header">
        <p class="section-label">{{ themeStore.lang === 'zh' ? '定价方案' : 'PRICING' }}</p>
        <h2 class="section-title">{{ themeStore.lang === 'zh' ? '开始你的雅思备考之旅' : 'Start Your IELTS Prep Journey' }}</h2>
        <p class="section-desc">{{ themeStore.lang === 'zh' ? '注册即可获得 3 天免费试用，体验全部功能' : 'Register to get a 3-day free trial with full access' }}</p>
      </div>

      <div class="pricing-grid">
        <div v-for="plan in plans" :key="plan.key" class="pricing-card" :class="{ highlight: plan.highlight }">
          <div class="pricing-icon">{{ plan.icon }}</div>
          <h3 class="pricing-name">{{ themeStore.lang === 'zh' ? plan.priceZh : plan.priceEn }}</h3>
          <p class="pricing-period">{{ themeStore.lang === 'zh' ? plan.periodZh : plan.periodEn }}</p>
          <ul class="pricing-features">
            <li v-for="(f, i) in (themeStore.lang === 'zh' ? plan.featuresZh : plan.featuresEn)" :key="i">
              <span class="check">✓</span>{{ f }}
            </li>
          </ul>
          <button
            class="pricing-cta"
            :class="{ primary: plan.highlight }"
            @click="goToPlan(plan)"
          >
            {{ themeStore.lang === 'zh' ? plan.ctaZh : plan.ctaEn }}
          </button>
        </div>
      </div>

      <div class="activation-info">
        <h3 class="activation-title">{{ themeStore.lang === 'zh' ? '如何激活？' : 'How to activate?' }}</h3>
        <p class="activation-subtitle">
          {{ themeStore.lang === 'zh'
            ? '试用期适合确认学习流程；正式备考建议激活后连续练，避免 AI 调用次数打断节奏。'
            : 'Use the trial to test the workflow; activate for continuous prep without AI-call interruptions.'
          }}
        </p>
        <div class="activation-steps">
          <div class="activation-step">
            <span class="step-num">1</span>
            <p>{{ themeStore.lang === 'zh' ? '注册账号，开始免费试用' : 'Register an account and start your free trial' }}</p>
          </div>
          <div class="activation-step">
            <span class="step-num">2</span>
            <p>{{ themeStore.lang === 'zh' ? '获取激活码（联系管理员购买）' : 'Get an activation code (contact admin to purchase)' }}</p>
          </div>
          <div class="activation-step">
            <span class="step-num">3</span>
            <p>{{ themeStore.lang === 'zh' ? '登录后打开激活码标签输入，立即解锁全部功能' : 'Log in, open the activation tab, and unlock all features' }}</p>
          </div>
        </div>
        <div class="activation-cta-row">
          <button class="activation-primary" @click="router.push(authStore.isLoggedIn ? '/login?mode=activate' : '/login?mode=register&after=activate')">
            {{ themeStore.lang === 'zh' ? '注册/登录后激活' : 'Register/Login to Activate' }}
          </button>
          <button class="activation-secondary" @click="router.push('/login?mode=register')">
            {{ themeStore.lang === 'zh' ? '先免费试用' : 'Start Free Trial' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section-header {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.section-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
  text-transform: uppercase;
  margin-bottom: var(--space-sm);
}

.section-title {
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 800;
  letter-spacing: 0;
  margin-bottom: var(--space-sm);
}

.section-desc {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  max-width: 500px;
  margin: 0 auto;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: var(--space-3xl);
}

.pricing-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl);
  text-align: center;
  transition: all var(--transition-base);
}

.pricing-card.highlight {
  border-color: var(--blue);
  box-shadow: 0 0 0 1px var(--blue), var(--shadow-lg);
  transform: scale(1.03);
}

.pricing-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.pricing-card.highlight:hover {
  transform: scale(1.03) translateY(-4px);
}

.pricing-icon {
  font-size: 2rem;
  margin-bottom: var(--space-md);
}

.pricing-name {
  font-size: var(--font-size-xl);
  font-weight: 800;
  margin-bottom: 4px;
}

.pricing-period {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  margin-bottom: var(--space-lg);
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-xl);
  text-align: left;
}

.pricing-features li {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.check {
  color: var(--green);
  font-weight: 700;
  flex-shrink: 0;
}

.pricing-cta {
  width: 100%;
  padding: 12px;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  background: transparent;
  transition: all var(--transition-fast);
}

.pricing-cta:hover {
  background: var(--bg-tertiary);
}

.pricing-cta.primary {
  background: var(--black);
  color: var(--white);
  border-color: var(--black);
}

[data-theme="dark"] .pricing-cta.primary {
  background: var(--white);
  color: var(--black);
  border-color: var(--white);
}

.pricing-cta.primary:hover {
  opacity: 0.85;
}

.activation-info {
  text-align: center;
  padding: var(--space-2xl);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
}

.activation-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  margin-bottom: 6px;
}

.activation-subtitle {
  max-width: 640px;
  margin: 0 auto var(--space-xl);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.activation-steps {
  display: flex;
  gap: var(--space-2xl);
  justify-content: center;
  flex-wrap: wrap;
}

.activation-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  max-width: 200px;
}

.step-num {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--black);
  color: var(--white);
  border-radius: 50%;
  font-weight: 700;
  font-size: var(--font-size-sm);
}

[data-theme="dark"] .step-num {
  background: var(--white);
  color: var(--black);
}

.activation-step p {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

.activation-cta-row {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: var(--space-xl);
}

.activation-primary,
.activation-secondary {
  padding: 11px 20px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 800;
}

.activation-primary {
  background: var(--black);
  color: var(--white);
}

[data-theme="dark"] .activation-primary {
  background: var(--white);
  color: var(--black);
}

.activation-secondary {
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  background: var(--card-bg);
}

@media (max-width: 768px) {
  .pricing-grid {
    grid-template-columns: 1fr;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
  }

  .pricing-card.highlight {
    transform: none;
  }

  .pricing-card.highlight:hover {
    transform: translateY(-4px);
  }

  .activation-steps {
    flex-direction: column;
    align-items: center;
  }

  .activation-primary,
  .activation-secondary {
    width: 100%;
  }
}
</style>

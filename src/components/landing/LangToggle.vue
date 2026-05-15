<script setup>
import { useThemeStore } from '../../stores/theme'
import ComparisonSlider from '../ui/ComparisonSlider.vue'

const themeStore = useThemeStore()
</script>

<template>
  <section class="section lang-section">
    <div class="container">
      <div class="lang-content">
        <div class="lang-slider">
          <ComparisonSlider
            left-label="中文"
            right-label="EN"
            left-color="#60a5fa"
            right-color="#4ade80"
          >
            <template #left>
              <div class="lang-preview">
                <div class="preview-nav">
                  <span class="nav-item active">首页</span>
                  <span class="nav-item">学习</span>
                  <span class="nav-item">我的</span>
                </div>
                <div class="preview-main">
                  <div class="preview-greeting">你好，学习者 👋</div>
                  <div class="preview-card-cn">
                    <div class="card-title">今日学习</div>
                    <div class="card-stats">
                      <span>已学 12 词</span>
                      <span>练习 8 分钟</span>
                    </div>
                  </div>
                  <div class="preview-btn-cn">开始练习</div>
                </div>
              </div>
            </template>
            <template #right>
              <div class="lang-preview">
                <div class="preview-nav">
                  <span class="nav-item active">Home</span>
                  <span class="nav-item">Learn</span>
                  <span class="nav-item">Profile</span>
                </div>
                <div class="preview-main">
                  <div class="preview-greeting">Hello, Learner 👋</div>
                  <div class="preview-card-cn">
                    <div class="card-title">Today's Study</div>
                    <div class="card-stats">
                      <span>12 words learned</span>
                      <span>8 min practiced</span>
                    </div>
                  </div>
                  <div class="preview-btn-cn">Start Practice</div>
                </div>
              </div>
            </template>
          </ComparisonSlider>
          <p class="slider-hint">{{ themeStore.lang === 'zh' ? '← 拖动对比 →' : '← Drag to compare →' }}</p>
        </div>
        <div class="lang-text">
          <p class="section-label">{{ themeStore.lang === 'zh' ? '双语界面' : 'BILINGUAL' }}</p>
          <h2 class="section-title">{{ themeStore.lang === 'zh' ? '双语界面' : 'Bilingual Interface' }}</h2>
          <p class="section-desc">{{ themeStore.lang === 'zh' ? '支持中英文界面切换，适应不同使用习惯' : 'Switch between Chinese and English interface' }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lang-content {
  display: flex;
  align-items: center;
  gap: var(--space-3xl);
}

.lang-text {
  flex: 1;
}

.lang-slider {
  flex: 1;
}

.lang-preview {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-lg);
  background: var(--bg-primary);
  padding: 16px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
}

.preview-nav {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.nav-item.active {
  color: var(--text-primary);
  font-weight: 600;
}

.preview-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-greeting {
  font-size: var(--font-size-lg);
  font-weight: 700;
}

.preview-card-cn {
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  padding: 12px;
}

.card-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin-bottom: 6px;
}

.card-stats {
  display: flex;
  gap: 12px;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
}

.preview-btn-cn {
  margin-top: auto;
  padding: 10px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-full);
  text-align: center;
  font-size: var(--font-size-sm);
  font-weight: 600;
  align-self: flex-start;
  padding-left: 24px;
  padding-right: 24px;
}

[data-theme="dark"] .preview-btn-cn {
  background: var(--white);
  color: var(--black);
}

.slider-hint {
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: var(--space-md);
  animation: pulse-opacity 2s ease-in-out infinite;
}

@keyframes pulse-opacity {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

@media (max-width: 768px) {
  .lang-content {
    flex-direction: column-reverse;
    gap: var(--space-xl);
  }
  .lang-text { text-align: center; }
  .section-desc { margin-left: auto; margin-right: auto; }
}
</style>

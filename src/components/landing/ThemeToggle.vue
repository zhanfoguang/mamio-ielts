<script setup>
import { useThemeStore } from '../../stores/theme'
import ComparisonSlider from '../ui/ComparisonSlider.vue'

const themeStore = useThemeStore()
</script>

<template>
  <section class="section theme-section">
    <div class="container">
      <div class="theme-content">
        <div class="theme-text">
          <p class="section-label">{{ themeStore.lang === 'zh' ? '主题切换' : 'THEME' }}</p>
          <h2 class="section-title">{{ themeStore.lang === 'zh' ? '深色与浅色主题' : 'Dark & Light Theme' }}</h2>
          <p class="section-desc">{{ themeStore.lang === 'zh' ? '支持深色与浅色主题，保护你的眼睛' : 'Dark and light theme support, easy on your eyes' }}</p>
        </div>
        <div class="theme-slider">
          <ComparisonSlider
            :left-label="themeStore.lang === 'zh' ? '深色' : 'DARK'"
            :right-label="themeStore.lang === 'zh' ? '浅色' : 'LIGHT'"
            left-color="#a78bfa"
            right-color="#fbbf24"
          >
            <template #left>
              <div class="theme-preview dark-preview">
                <div class="preview-header dark">
                  <div class="preview-dot"></div>
                  <span>mamio</span>
                </div>
                <div class="preview-body">
                  <div class="preview-card dark-card"></div>
                  <div class="preview-card dark-card short"></div>
                  <div class="preview-bar-group">
                    <div class="preview-bar dark-bar" style="width:90%"></div>
                    <div class="preview-bar dark-bar" style="width:65%"></div>
                    <div class="preview-bar dark-bar" style="width:80%"></div>
                  </div>
                </div>
              </div>
            </template>
            <template #right>
              <div class="theme-preview light-preview">
                <div class="preview-header light">
                  <div class="preview-dot"></div>
                  <span>mamio</span>
                </div>
                <div class="preview-body">
                  <div class="preview-card light-card"></div>
                  <div class="preview-card light-card short"></div>
                  <div class="preview-bar-group">
                    <div class="preview-bar light-bar" style="width:90%"></div>
                    <div class="preview-bar light-bar" style="width:65%"></div>
                    <div class="preview-bar light-bar" style="width:80%"></div>
                  </div>
                </div>
              </div>
            </template>
          </ComparisonSlider>
          <p class="slider-hint">{{ themeStore.lang === 'zh' ? '← 拖动对比 →' : '← Drag to compare →' }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.theme-content {
  display: flex;
  align-items: center;
  gap: var(--space-3xl);
}

.theme-text {
  flex: 1;
}

.theme-slider {
  flex: 1;
}

.theme-preview {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.dark-preview { background: #111; }
.light-preview { background: #f5f5f7; }

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.preview-header.dark { color: rgba(255,255,255,0.8); }
.preview-header.light { color: rgba(0,0,0,0.8); }

.preview-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.3;
}

.preview-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-card {
  height: 50px;
  border-radius: 10px;
}

.preview-card.short { width: 65%; height: 35px; }
.dark-card { background: rgba(255,255,255,0.08); }
.light-card { background: rgba(0,0,0,0.06); }

.preview-bar-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
}

.preview-bar {
  height: 6px;
  border-radius: 3px;
}

.dark-bar { background: rgba(255,255,255,0.12); }
.light-bar { background: rgba(0,0,0,0.1); }

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
  .theme-content {
    flex-direction: column;
    gap: var(--space-xl);
  }
  .theme-text { text-align: center; }
  .section-desc { margin-left: auto; margin-right: auto; }
}
</style>

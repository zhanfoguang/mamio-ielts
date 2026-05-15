<script setup>
import { useThemeStore } from '../../stores/theme'
const themeStore = useThemeStore()
</script>

<template>
  <footer class="footer">
    <div class="footer-inner container">
      <div class="footer-top">
        <div class="footer-brand">
          <div class="logo">
            <span class="logo-icon">M</span>
            <span class="logo-text">mamio</span>
          </div>
          <p class="footer-desc">{{ themeStore.lang === 'zh' ? '雅思备考助手，听说读写一站式训练' : 'IELTS prep assistant, all-in-one speaking, listening, writing & vocab' }}</p>
        </div>
        <div class="footer-links">
          <router-link to="/">{{ themeStore.lang === 'zh' ? '首页' : 'Home' }}</router-link>
          <router-link to="/speaking">{{ themeStore.lang === 'zh' ? '口语' : 'Speaking' }}</router-link>
          <router-link to="/writing">{{ themeStore.lang === 'zh' ? '写作' : 'Writing' }}</router-link>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2026 mamio. {{ themeStore.lang === 'zh' ? '版权所有' : 'All rights reserved' }}.</p>
        <p class="icp">Mamio IELTS - Free IELTS Prep</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--border-color);
  padding: var(--space-2xl) 0;
}

.footer-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-xl);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.logo-icon {
  width: 28px;
  height: 28px;
  background: var(--black);
  color: var(--white);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.85rem;
}

[data-theme="dark"] .logo-icon {
  background: var(--white);
  color: var(--black);
}

.footer-desc {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.footer-links {
  display: flex;
  gap: 24px;
}

.footer-links a {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  transition: color var(--transition-fast);
}

.footer-links a:hover {
  color: var(--text-primary);
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-color);
}

@media (max-width: 768px) {
  .footer-top {
    flex-direction: column;
    gap: 24px;
  }

  .footer-links {
    flex-wrap: wrap;
    gap: 16px;
  }

  .footer-bottom {
    flex-direction: column;
    gap: 4px;
  }
}
</style>

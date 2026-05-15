<script setup>
defineProps({
  variant: { type: String, default: 'primary' }, // primary, secondary, outline, ghost
  size: { type: String, default: 'md' }, // sm, md, lg
  block: { type: Boolean, default: false }
})
</script>

<template>
  <button
    class="btn"
    :class="[`btn-${variant}`, `btn-${size}`, { 'btn-block': block }]"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--radius-full);
  font-weight: 600;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn-sm { padding: 6px 16px; font-size: var(--font-size-xs); }
.btn-md { padding: 10px 24px; font-size: var(--font-size-sm); }
.btn-lg { padding: 14px 32px; font-size: var(--font-size-base); }

.btn-block { width: 100%; }

.btn-primary {
  background: var(--black);
  color: var(--white);
}
[data-theme="dark"] .btn-primary {
  background: var(--white);
  color: var(--black);
}
.btn-primary:hover { opacity: 0.85; }

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.btn-secondary:hover { background: var(--border-color); }

.btn-outline {
  border: 1.5px solid var(--border-color);
  color: var(--text-primary);
  background: transparent;
}
.btn-outline:hover { background: var(--bg-tertiary); }

.btn-ghost {
  color: var(--text-secondary);
  background: transparent;
}
.btn-ghost:hover { background: var(--bg-tertiary); color: var(--text-primary); }
</style>

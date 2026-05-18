<script setup>
import { useCheckinStore } from '../../stores/checkin'
import { useThemeStore } from '../../stores/theme'
import { toLocalDateKey } from '../../utils/date'

const checkinStore = useCheckinStore()
const themeStore = useThemeStore()
const weekDays = checkinStore.getWeekDays()
const today = toLocalDateKey()
</script>

<template>
  <div class="checkin-card">
    <div class="checkin-header">
      <h3>{{ themeStore.lang === 'zh' ? '每日打卡' : 'Daily Check-in' }}</h3>
      <span class="streak">{{ themeStore.lang === 'zh' ? '连续打卡' : 'Streak' }}: {{ checkinStore.currentStreak }} {{ themeStore.lang === 'zh' ? '天' : 'days' }}</span>
    </div>

    <div class="week-grid">
      <div
        v-for="day in weekDays"
        :key="day.date"
        class="day-item"
        :class="{ checked: day.isChecked, today: day.isToday }"
      >
        <span class="day-label">{{ day.day }}</span>
        <div class="day-dot">
          <span v-if="day.isChecked" class="check-icon">✓</span>
        </div>
      </div>
    </div>

    <button
      class="checkin-btn"
      :class="{ checked: checkinStore.isChecked(today) }"
      @click="checkinStore.checkin()"
      :disabled="checkinStore.isChecked(today)"
    >
      {{ checkinStore.isChecked(today)
        ? (themeStore.lang === 'zh' ? '已打卡 ✓' : 'Checked In ✓')
        : (themeStore.lang === 'zh' ? '打卡' : 'Check In')
      }}
    </button>
  </div>
</template>

<style scoped>
.checkin-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.checkin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.checkin-header h3 {
  font-size: var(--font-size-lg);
  font-weight: 700;
}

.streak {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.week-grid {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: var(--space-lg);
}

.day-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.day-label {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  font-weight: 600;
}

.day-dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.day-item.checked .day-dot {
  background: var(--black);
  color: var(--white);
}

[data-theme="dark"] .day-item.checked .day-dot {
  background: var(--white);
  color: var(--black);
}

.day-item.today .day-dot {
  box-shadow: 0 0 0 3px var(--bg-primary), 0 0 0 5px var(--black);
}

[data-theme="dark"] .day-item.today .day-dot {
  box-shadow: 0 0 0 3px var(--bg-primary), 0 0 0 5px var(--white);
}

.check-icon {
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.checkin-btn {
  width: 100%;
  padding: 14px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-size-base);
  transition: all var(--transition-fast);
}

[data-theme="dark"] .checkin-btn {
  background: var(--white);
  color: var(--black);
}

.checkin-btn.checked {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

[data-theme="dark"] .checkin-btn.checked {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.checkin-btn:disabled {
  cursor: default;
}
</style>

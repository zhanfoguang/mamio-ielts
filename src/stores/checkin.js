import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useThemeStore } from './theme'
import { parseLocalDateKey, toLocalDateKey } from '../utils/date'

export const useCheckinStore = defineStore('checkin', () => {
  const checkedDays = ref(JSON.parse(localStorage.getItem('mamio-checkin') || '[]'))

  const currentStreak = computed(() => {
    if (checkedDays.value.length === 0) return 0
    const sorted = [...checkedDays.value].sort().reverse()
    const today = parseLocalDateKey(toLocalDateKey())
    let streak = 0
    for (let i = 0; i < sorted.length; i++) {
      const checkDate = parseLocalDateKey(sorted[i])
      if (!checkDate) break
      const diff = Math.floor((today - checkDate) / (1000 * 60 * 60 * 24))
      if (diff === i) {
        streak++
      } else {
        break
      }
    }
    return streak
  })

  function checkin() {
    const today = toLocalDateKey()
    if (!checkedDays.value.includes(today)) {
      checkedDays.value.push(today)
      localStorage.setItem('mamio-checkin', JSON.stringify(checkedDays.value))
    }
  }

  function isChecked(dateStr) {
    return checkedDays.value.includes(dateStr)
  }

  function getWeekDays() {
    const themeStore = useThemeStore()
    const today = new Date()
    const todayKey = toLocalDateKey(today)
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

    const daysZh = ['一', '二', '三', '四', '五', '六', '日']
    const daysEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const dateStr = toLocalDateKey(date)
      return {
        date: dateStr,
        day: themeStore.lang === 'zh' ? daysZh[i] : daysEn[i],
        isToday: dateStr === todayKey,
        isChecked: checkedDays.value.includes(dateStr)
      }
    })
  }

  return { checkedDays, currentStreak, checkin, isChecked, getWeekDays }
})

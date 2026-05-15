import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref(localStorage.getItem('mamio-theme') || 'light')
  const lang = ref(localStorage.getItem('mamio-lang') || 'zh')

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function setLang(newLang) {
    lang.value = newLang
  }

  watch(theme, (val) => {
    document.documentElement.setAttribute('data-theme', val)
    localStorage.setItem('mamio-theme', val)
  })

  watch(lang, (val) => {
    localStorage.setItem('mamio-lang', val)
  })

  // Initialize
  document.documentElement.setAttribute('data-theme', theme.value)

  return { theme, lang, toggleTheme, setLang }
})

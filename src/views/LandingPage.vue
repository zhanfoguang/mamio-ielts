<script setup>
import { onMounted } from 'vue'
import HeroSection from '../components/landing/HeroSection.vue'
import FeaturesGrid from '../components/landing/FeaturesGrid.vue'
import PricingSection from '../components/landing/PricingSection.vue'
import VideoDemo from '../components/landing/VideoDemo.vue'
import PhonemeDemo from '../components/landing/PhonemeDemo.vue'
import ThemeToggle from '../components/landing/ThemeToggle.vue'
import LangToggle from '../components/landing/LangToggle.vue'
import DownloadSection from '../components/landing/DownloadSection.vue'

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    },
    { threshold: 0.1 }
  )

  document.querySelectorAll('.fade-up').forEach((el) => {
    observer.observe(el)
  })
})
</script>

<template>
  <div class="landing-page">
    <HeroSection />
    <FeaturesGrid />
    <PricingSection />
    <VideoDemo />
    <PhonemeDemo />
    <ThemeToggle />
    <LangToggle />
    <DownloadSection />
  </div>
</template>

<style scoped>
.landing-page {
  overflow-x: hidden;
}
</style>

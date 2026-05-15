<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  leftLabel: { type: String, default: '' },
  rightLabel: { type: String, default: '' },
  leftColor: { type: String, default: '#a78bfa' },
  rightColor: { type: String, default: '#fbbf24' }
})

const sliderPos = ref(50)
const isDragging = ref(false)
const containerRef = ref(null)

function onPointerDown(e) {
  isDragging.value = true
  updatePosition(e)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(e) {
  if (isDragging.value) updatePosition(e)
}

function onPointerUp() {
  isDragging.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

function updatePosition(e) {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  sliderPos.value = Math.max(0, Math.min(100, (x / rect.width) * 100))
}

onUnmounted(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template>
  <div class="comparison-slider" ref="containerRef" @pointerdown="onPointerDown">
    <div class="slider-left" :style="{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }">
      <slot name="left" />
      <span class="label label-left" :style="{ background: leftColor }">{{ leftLabel }}</span>
    </div>
    <div class="slider-right">
      <slot name="right" />
      <span class="label label-right" :style="{ background: rightColor }">{{ rightLabel }}</span>
    </div>
    <div class="slider-handle" :style="{ left: sliderPos + '%' }">
      <div class="handle-line"></div>
      <div class="handle-circle">
        <span>◀▶</span>
      </div>
      <div class="handle-line"></div>
    </div>
  </div>
</template>

<style scoped>
.comparison-slider {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  cursor: col-resize;
  user-select: none;
  touch-action: none;
}

.slider-left,
.slider-right {
  position: absolute;
  inset: 0;
}

.slider-left {
  z-index: 2;
}

.label {
  position: absolute;
  top: 16px;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: white;
  backdrop-filter: blur(8px);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.label-left { left: 16px; }
.label-right { right: 16px; }

.slider-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
  pointer-events: none;
}

.handle-line {
  flex: 1;
  width: 2px;
  background: white;
}

.handle-circle {
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  font-size: 10px;
  color: #333;
  flex-shrink: 0;
}
</style>

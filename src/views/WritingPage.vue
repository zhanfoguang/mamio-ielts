<script setup>
import { ref, computed } from 'vue'
import { useThemeStore } from '../stores/theme'
import { writingTasks } from '../data/ielts/writing'
import { batchWriting } from '../services/ai'

const themeStore = useThemeStore()
const activeTask = ref(1)
const selectedPrompt = ref(null)
const essay = ref('')
const wordCount = computed(() => essay.value.trim().split(/\s+/).filter(w => w).length)
const aiResult = ref(null)
const loading = ref(false)
const showResult = ref(false)

const tasks = computed(() => activeTask.value === 1 ? writingTasks.task1 : writingTasks.task2)

function selectPrompt(prompt) {
  selectedPrompt.value = prompt
  essay.value = ''
  showResult.value = false
  aiResult.value = null
}

async function submitEssay() {
  if (!essay.value.trim()) return
  loading.value = true
  try {
    aiResult.value = await batchWriting(selectedPrompt.value.prompt, essay.value, activeTask.value)
    showResult.value = true
  } catch (e) {
    aiResult.value = { error: e.response?.data?.error || '批改失败，请稍后重试' }
    showResult.value = true
  } finally {
    loading.value = false
  }
}

function getScoreColor(score) {
  if (score >= 7) return 'var(--green)'
  if (score >= 5.5) return 'var(--yellow)'
  return 'var(--red)'
}
</script>

<template>
  <div class="writing-page">
    <div class="container">
      <h1>{{ themeStore.lang === 'zh' ? '雅思写作练习' : 'IELTS Writing Practice' }}</h1>

      <div class="task-tabs">
        <button class="task-btn" :class="{ active: activeTask === 1 }" @click="activeTask = 1; selectedPrompt = null">Task 1</button>
        <button class="task-btn" :class="{ active: activeTask === 2 }" @click="activeTask = 2; selectedPrompt = null">Task 2</button>
      </div>

      <div class="writing-layout">
        <!-- Prompt list -->
        <div class="prompt-sidebar">
          <div v-for="p in tasks" :key="p.id" class="prompt-item" :class="{ active: selectedPrompt?.id === p.id }" @click="selectPrompt(p)">
            <span class="prompt-type">{{ p.type }}</span>
            <p class="prompt-preview">{{ p.prompt.substring(0, 60) }}...</p>
          </div>
        </div>

        <!-- Main area -->
        <div class="writing-main">
          <template v-if="selectedPrompt">
            <div class="prompt-card">
              <span class="prompt-badge">{{ activeTask === 1 ? 'Task 1' : 'Task 2' }} · {{ selectedPrompt.type }}</span>
              <p class="prompt-full">{{ selectedPrompt.prompt }}</p>
              <div class="key-points">
                <h4>{{ themeStore.lang === 'zh' ? '要点提示' : 'Key Points' }}</h4>
                <ul>
                  <li v-for="p in selectedPrompt.keyPoints" :key="p">{{ p }}</li>
                </ul>
              </div>
              <div class="sample-outline" v-if="selectedPrompt.sampleOutline">
                <h4>{{ themeStore.lang === 'zh' ? '结构参考' : 'Structure' }}</h4>
                <p>{{ selectedPrompt.sampleOutline }}</p>
              </div>
            </div>

            <div class="editor-area">
              <textarea v-model="essay" :placeholder="themeStore.lang === 'zh' ? '在此输入你的作文...' : 'Write your essay here...'" rows="16"></textarea>
              <div class="editor-footer">
                <span class="word-count" :class="{ enough: (activeTask === 1 && wordCount >= 150) || (activeTask === 2 && wordCount >= 250) }">
                  {{ wordCount }} {{ themeStore.lang === 'zh' ? '词' : 'words' }}
                  <span v-if="activeTask === 1 && wordCount < 150"> / 150 min</span>
                  <span v-if="activeTask === 2 && wordCount < 250"> / 250 min</span>
                </span>
                <button class="submit-btn" @click="submitEssay" :disabled="loading || wordCount < 20">
                  {{ loading ? (themeStore.lang === 'zh' ? 'AI 批改中...' : 'AI Grading...') : (themeStore.lang === 'zh' ? 'AI 批改' : 'Get AI Feedback') }}
                </button>
              </div>
            </div>

            <!-- AI Result -->
            <div v-if="showResult && aiResult" class="ai-result">
              <div v-if="aiResult.error" class="result-error">{{ aiResult.error }}</div>
              <template v-else>
                <div class="result-header">
                  <div class="overall-score" :style="{ borderColor: getScoreColor(aiResult.overall) }">
                    <span class="score-num">{{ aiResult.overall }}</span>
                    <span class="score-label">Band</span>
                  </div>
                </div>

                <div class="score-dimensions">
                  <div v-for="(dim, key) in { taskResponse: aiResult.taskResponse, coherence: aiResult.coherence, lexical: aiResult.lexical, grammar: aiResult.grammar }" :key="key" class="dim-item">
                    <div class="dim-header">
                      <span class="dim-name">{{ { taskResponse: themeStore.lang === 'zh' ? '任务回应' : 'Task Response', coherence: themeStore.lang === 'zh' ? '连贯性' : 'Coherence', lexical: themeStore.lang === 'zh' ? '词汇' : 'Lexical', grammar: themeStore.lang === 'zh' ? '语法' : 'Grammar' }[key] }}</span>
                      <span class="dim-score" :style="{ color: getScoreColor(dim.score) }">{{ dim.score }}</span>
                    </div>
                    <p class="dim-comment">{{ dim.comment }}</p>
                    <p class="dim-direction" v-if="dim.direction">💡 {{ dim.direction }}</p>
                  </div>
                </div>

                <div v-if="aiResult.strengths?.length" class="feedback-section">
                  <h4>{{ themeStore.lang === 'zh' ? '优点' : 'Strengths' }}</h4>
                  <ul><li v-for="s in aiResult.strengths" :key="s" class="strength-item">{{ s }}</li></ul>
                </div>

                <div v-if="aiResult.weaknesses?.length" class="feedback-section">
                  <h4>{{ themeStore.lang === 'zh' ? '问题' : 'Weaknesses' }}</h4>
                  <ul><li v-for="w in aiResult.weaknesses" :key="w" class="weakness-item">{{ w }}</li></ul>
                </div>

                <div v-if="aiResult.actionPlan?.length" class="feedback-section">
                  <h4>{{ themeStore.lang === 'zh' ? '行动计划' : 'Action Plan' }}</h4>
                  <ol><li v-for="a in aiResult.actionPlan" :key="a">{{ a }}</li></ol>
                  <p class="gemini-hint">{{ themeStore.lang === 'zh' ? '提示：可以把以上问题复制到 Gemini 进行深入学习和讨论' : 'Tip: Copy these issues to Gemini for deeper learning and discussion' }}</p>
                </div>
              </template>
            </div>
          </template>

          <div v-else class="empty-state">
            <p>{{ themeStore.lang === 'zh' ? '← 选择一个题目开始写作' : '← Select a prompt to start writing' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.writing-page {
  padding-top: calc(var(--header-height) + var(--space-xl));
  padding-bottom: var(--space-3xl);
}

.writing-page h1 {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: var(--space-lg);
}

.task-tabs { display: flex; gap: 8px; margin-bottom: var(--space-xl); }

.task-btn {
  padding: 8px 24px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--font-size-sm);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.task-btn.active { background: var(--black); color: var(--white); }
[data-theme="dark"] .task-btn.active { background: var(--white); color: var(--black); }

.writing-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
}

.prompt-sidebar {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow-y: auto;
  max-height: 600px;
}

.prompt-item {
  padding: 14px 16px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all var(--transition-fast);
}

.prompt-item:hover { background: var(--bg-tertiary); }
.prompt-item.active { border-left-color: var(--green); background: var(--green-soft); }

.prompt-type {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--blue);
  text-transform: uppercase;
}

.prompt-preview {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: 4px;
  line-height: 1.4;
}

.writing-main { display: flex; flex-direction: column; gap: var(--space-lg); }

.prompt-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
}

.prompt-badge {
  display: inline-block;
  padding: 3px 12px;
  background: var(--blue-soft);
  color: var(--blue);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 700;
  margin-bottom: var(--space-md);
  text-transform: uppercase;
}

.prompt-full { font-size: var(--font-size-base); line-height: 1.7; margin-bottom: var(--space-lg); }

.key-points, .sample-outline {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-color);
}

.key-points h4, .sample-outline h4 {
  font-size: var(--font-size-sm);
  font-weight: 700;
  margin-bottom: 6px;
}

.key-points ul { list-style: disc; padding-left: 20px; }
.key-points li, .sample-outline p { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6; }

.editor-area {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.editor-area textarea {
  width: 100%;
  padding: var(--space-xl);
  border: none;
  outline: none;
  resize: vertical;
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  line-height: 1.7;
  background: transparent;
  color: var(--text-primary);
  min-height: 300px;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px var(--space-xl);
  border-top: 1px solid var(--border-color);
}

.word-count { font-size: var(--font-size-sm); color: var(--text-tertiary); }
.word-count.enough { color: var(--green); font-weight: 600; }

.submit-btn {
  padding: 10px 24px;
  background: var(--black);
  color: var(--white);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-size-sm);
}

[data-theme="dark"] .submit-btn { background: var(--white); color: var(--black); }
.submit-btn:disabled { opacity: 0.5; }

.ai-result {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
}

.result-header { text-align: center; margin-bottom: var(--space-xl); }

.overall-score {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 4px solid;
  justify-content: center;
}

.score-num { font-size: var(--font-size-2xl); font-weight: 800; }
.score-label { font-size: var(--font-size-xs); color: var(--text-tertiary); }

.score-dimensions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: var(--space-lg);
}

.dim-item { background: var(--bg-tertiary); border-radius: var(--radius-sm); padding: 14px; }
.dim-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
.dim-name { font-weight: 600; font-size: var(--font-size-sm); }
.dim-score { font-size: var(--font-size-lg); font-weight: 800; }
.dim-comment { font-size: var(--font-size-xs); color: var(--text-secondary); line-height: 1.5; margin-bottom: 6px; }
.dim-direction { font-size: var(--font-size-xs); color: var(--blue); font-style: italic; }

.feedback-section {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border-color);
}

.feedback-section h4 { font-size: var(--font-size-sm); font-weight: 700; margin-bottom: 6px; }
.feedback-section ul, .feedback-section ol { padding-left: 20px; }
.feedback-section li { font-size: var(--font-size-sm); color: var(--text-secondary); margin-bottom: 4px; }
.strength-item { color: var(--green); }
.weakness-item { color: var(--red); }

.gemini-hint {
  margin-top: var(--space-md);
  padding: 10px 14px;
  background: var(--blue-soft);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  color: var(--blue);
}

.result-error { color: var(--red); text-align: center; }

.empty-state {
  text-align: center;
  padding: var(--space-3xl);
  color: var(--text-tertiary);
  font-size: var(--font-size-lg);
}

@media (max-width: 768px) {
  .writing-layout { grid-template-columns: 1fr; }
  .prompt-sidebar { max-height: 200px; }
  .score-dimensions { grid-template-columns: 1fr; }
}
</style>

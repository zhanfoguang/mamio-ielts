# Mamio IELTS

Free, no-registration, AI-powered IELTS preparation platform. Practice Speaking, Listening, Writing, and Vocabulary directly in your browser.

**Live:** http://47.88.87.116:8080

## Features

### Speaking
- Part 1/2/3 topic browser with 35+ real IELTS questions
- Browser-based speech recognition (Web Speech API)
- Part 2 countdown timer (1min prep + 2min speaking)
- Audio recording and playback
- AI scoring on 4 dimensions: Fluency, Lexical, Grammar, Pronunciation
- Practice history with score tracking

### Listening
- Audio dictation with playback speed control (0.75x / 1x / 1.25x / 1.5x)
- Word-by-word comparison with tolerance for plurals, tenses, and case
- AI-generated comprehension questions (choice + fill-in-the-blank)
- Progress tracking per session

### Writing
- Task 1 (6 prompts) and Task 2 (6 prompts) with real IELTS question styles
- Countdown timer (20min for Task 1, 40min for Task 2)
- Auto-save drafts to localStorage
- AI grading on 4 dimensions: Task Response, Coherence, Lexical, Grammar
- Model essays (Band 7+) for every prompt
- Grading history with word count and time spent

### Vocabulary
- 8 topics with 80 curated high-frequency IELTS words
- Flashcard flip animation with phonetics, meanings, examples, and collocations
- SM-2 spaced repetition system (SRS) for efficient memorization
- Quiz mode: multiple choice, spelling, and English-to-Chinese
- AI-generated additional words per topic
- Learning statistics (new / learning / mastered)

## Tech Stack

- **Frontend:** Vue 3, Vite, Pinia, Vue Router
- **Backend:** Express.js
- **AI:** DeepSeek API
- **Speech:** Web Speech API + MediaRecorder API
- **Storage:** localStorage (no database, no auth)
- **Deploy:** GitHub Actions + PM2 + nginx

## Development

```bash
# Frontend
npm install
npm run dev

# Backend (separate terminal)
cd server
cp .env.example .env   # add your DEEPSEEK_API_KEY
npm install
node index.js
```

## Deployment

1. Push to GitHub
2. SSH into your VPS:
```bash
ssh root@your-server
cd /var/www/mimio
bash deploy.sh
```

The deploy script runs: `git pull` → `npm install` → `npm run build` → `pm2 restart`

### Nginx config

```nginx
server {
    listen 8080;
    server_name _;

    root /var/www/mimio/dist;
    index index.html;

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Project Structure

```
mamio-ielts/
├── src/
│   ├── views/           # Page components
│   │   ├── SpeakingPage.vue
│   │   ├── ListeningPage.vue
│   │   ├── WritingPage.vue
│   │   ├── VocabPage.vue
│   │   └── DashboardPage.vue
│   ├── components/      # Reusable UI components
│   ├── composables/     # Vue composables (speech recognition)
│   ├── data/ielts/      # Static question banks
│   ├── services/        # API clients
│   ├── stores/          # Pinia stores
│   └── router/          # Vue Router config
├── server/
│   ├── index.js         # Express server entry
│   └── routes/ai.js     # DeepSeek API endpoints
└── dist/                # Built output
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/speaking` | Score a speaking response |
| POST | `/api/ai/writing` | Grade an essay |
| POST | `/api/ai/vocab` | Generate topic vocabulary |
| POST | `/api/ai/listening` | Generate listening material |
| GET | `/api/health` | Health check |

## License

MIT

# QuizVerse AI — Real-Time Multiplayer AI Quiz Arena

A full-stack, real-time multiplayer AI Quiz application built with the **MERN** stack, **Socket.io** WebSockets, and **Google Gemini AI**. A host creates a quiz lobby with any custom topic prompt, players join via a 6-character room code, and upon starting, unique AI-generated questions on that topic are served concurrently to each participant to eliminate screen peeking, complete with server-synchronized timers and an animated victory podium.

---

## 🌟 Key Features

1. **Custom AI Topic Prompting:**
   - Host enters any topic (e.g. *"React Performance Optimization"*, *"World War II Pacific Theater"*, *"Quantum Computing"*).
   - Configurable question counts ($N$) and per-question round timers ($T$).

2. **AI Anti-Screen Peeking System:**
   - Concurrently triggers individual LLM prompts per player with distinct seeds and analytical angles.
   - Randomized option sequences prevent adjacent competitors from looking at each other's screens.

3. **Server-Side Authoritative Timers & Speed Bonus:**
   - Server orchestrates rounds using server-side timers to prevent client-side clock manipulation.
   - High-fidelity score calculation combining base accuracy and speed bonus:
     $$\text{Score} = \text{Base Points} + \left(\frac{\text{Time Remaining}}{\text{Total Time}} \times \text{Speed Multiplier}\right)$$

4. **Live Scoreboards & Animated Victory Podium:**
   - Real-time score shifts as players submit answers.
   - Dynamic 3D victory podium (1st, 2nd, 3rd) with confetti celebration.
   - Question-by-question review with AI explanations.

5. **Audio Synthesizer Engine:**
   - Built-in Web Audio API sound synthesizer (countdown ticks, start horn, correct arpeggios, wrong buzzer, victory fanfare) without external audio files.

6. **Educational Creator Portal (PDF-to-Quiz):**
   - Drag-and-drop textbook chapter & notes upload (`.pdf` up to 25MB).
   - Dynamic topic-wise question distribution allocating exact question quotas across chapters.
   - Strict educational assessor prompt strictly grounded in document text.
   - Instant preloaded room deployment bypassing live synthesis latency.

📖 **For a detailed breakdown of all project enhancements and architectural milestones, see [IMPROVEMENTS.txt](IMPROVEMENTS.txt).**

---

## 🛠️ Tech Stack

- **Frontend:** React (Vite), Tailwind CSS v4, Lucide React, Socket.io-client, Canvas Confetti.
- **Backend:** Node.js, Express.js, Socket.io, Mongoose (MongoDB).
- **AI Integration:** Google Gemini API (`@google/generative-ai` with structured JSON schema) + intelligent fallback generator.
- **Database:** MongoDB with Mongoose (`Room` and `QuizSession` schemas) + resilient offline caching mode.

---

## 🚀 Quick Start Guide

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
*Runs on `http://localhost:5000`.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Runs on `http://localhost:5173`.*

---

## ⚙️ Environment Variables

Create a `backend/.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai_quiz_builder
GEMINI_API_KEY=your_gemini_api_key_here
CLIENT_URL=http://localhost:5173
```
*(Note: If `GEMINI_API_KEY` is not provided, the application automatically uses its dynamic topic knowledge generator so quizzes can be tested immediately.)*

---

## 📡 WebSocket Event Reference

| Event Name | Direction | Payload Description |
|---|---|---|
| `create_room` | Client ➔ Server | `{ hostName, topic, questionCount, timePerQuestion, customApiKey, avatarSeed }` |
| `room_created` | Server ➔ Client | `{ roomCode, room }` |
| `join_room` | Client ➔ Server | `{ roomCode, username, avatarSeed }` |
| `roster_updated`| Server ➔ Client | `{ players, hostSocketId }` |
| `start_quiz` | Client ➔ Server | `{ roomCode }` |
| `quiz_generating`| Server ➔ Client | `{ message, playerCount }` |
| `countdown_start`| Server ➔ Client | `{ count: 3 }` |
| `round_question`| Server ➔ Client | `{ questionIndex, totalQuestions, timeLimit, question, options, id }` |
| `submit_answer` | Client ➔ Server | `{ roomCode, questionIndex, answerIndex }` |
| `answer_result` | Server ➔ Client | `{ isCorrect, correctIndex, pointsEarned, totalScore, explanation }` |
| `round_ended` | Server ➔ Client | `{ questionIndex, totalQuestions, leaderboard }` |
| `game_over` | Server ➔ Client | `{ roomCode, topic, leaderboard, podium, playerBreakdowns }` |
| `play_again` | Client ➔ Server | `{ roomCode }` |

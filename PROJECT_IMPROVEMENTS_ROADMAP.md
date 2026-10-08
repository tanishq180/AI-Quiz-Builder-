# QuizVerse AI — Comprehensive Improvements & Engineering Roadmap

This document serves as the master engineering roadmap for **QuizVerse AI**. It outlines architecture bottlenecks, feature expansions, security hardenings, and UX improvements identified during the codebase audit, organized by priority and technical domain.

---

## 📊 Summary & Priority Matrix

| Category | Priority | Impact Area | Complexity |
| :--- | :---: | :--- | :---: |
| **Multimodal Uploads (OCR & Scanned PDF)** | **P1 (High)** | AI Parsing Capabilities | Medium |
| **Solo / Practice Mode** | **P1 (High)** | User Acquisition & Accessibility | Medium |
| **Host Moderation (Kick, Pause, Abort)** | **P1 (High)** | Multiplayer Room Management | Medium |
| **Export to Anki & Printable Study PDF** | **P2 (Medium)** | Educational Utility & Study Retention | Medium |
| **Question Bank & Saved Quizzes Library** | **P2 (Medium)** | MongoDB Persistence & Reusability | Medium |
| **Live Social Reactions & Lobby Chat** | **P2 (Medium)** | Multiplayer Engagement | Low |
| **Redis Adapter for Socket.io** | **P2 (Medium)** | Production Scalability & Clustered Nodes | Medium |
| **Alternative Game Modes (Battle Royale / Teams)**| **P2 (Medium)** | Gameplay Variety | High |
| **Root Dev Runner & Docker Compose** | **P3 (Convenience)** | Developer Experience & Deployment | Low |
| **Keyboard Shortcuts & Sound Volume Slider** | **P3 (Polish)** | Accessibility (a11y) & Audio Control | Low |

---

## 1. 🛠️ Backend Architecture, Stability & Memory Management

### 1.1 Socket.io Redis Adapter & Distributed Session State
- **Priority:** `P2 (Medium)`
- **Affected Files:** `backend/src/server.js`, `backend/src/socket/quizSocket.js`
- **Current Problem:**
  `activeRooms` and round clock timers exist exclusively within single-process memory. If deploying to cloud clusters, serverless environments, or multiple Node workers, sockets on different instances cannot communicate.
- **Recommended Solution:**
  1. Integrate `@socket.io/redis-adapter` with Redis or Dragonfly.
  2. Move room metadata and active game timers into Redis keys with automatic TTL expiration.

---

## 2. 🛡️ Security & Input Validation

### 2.1 Strict Schema Validation
- **Priority:** `P2 (Medium)`
- **Affected Files:** `backend/src/server.js`, `backend/src/socket/quizSocket.js`
- **Recommended Solution:**
  Use `zod` to validate all incoming socket payloads (`create_room`, `submit_answer`, `join_room`) and HTTP body parameters to reject malformed data before processing.

---

## 3. 🧠 AI Engine, Document Parsing & Creator Portal

### 3.1 Multimodal Document Ingestion (OCR & Scanned PDF Support)
- **Priority:** `P1 (High)`
- **Affected Files:** `backend/src/server.js`, `backend/src/services/aiService.js`
- **Current Problem:**
  `pdf-parse` only extracts digital text layers. Scanned textbooks, lecture slide images, and photocopied study sheets return 0 characters and fail.
- **Recommended Solution:**
  1. Integrate Google Generative AI File API (`GoogleAIFileManager`) to upload PDF files directly to Gemini 1.5/2.0 Flash as multimodal inputs.
  2. Or integrate `tesseract.js` as an OCR fallback when extracted text character count is below 50.

### 3.3 Multi-Model Selection & Provider Fallbacks
- **Priority:** `P2 (Medium)`
- **Affected Files:** `backend/src/services/aiService.js`, `frontend/src/components/ApiKeyModal.jsx`
- **Recommended Solution:**
  1. Update default Gemini model from `gemini-1.5-flash` to `gemini-2.0-flash`.
  2. Provide user-selectable model presets in settings:
     - Google Gemini (`gemini-2.0-flash`, `gemini-1.5-pro`)
     - OpenAI (`gpt-4o-mini`)
     - Groq (`llama-3.3-70b-versatile`) for ultra-low latency generation
     - Local Ollama endpoint for offline, private use.

### 3.4 Extended Source Formats
- **Priority:** `P2 (Medium)`
- **Affected Files:** `backend/src/server.js`, `frontend/src/components/CreatorPortal.jsx`
- **Recommended Solution:**
  Add support for:
  - Microsoft Word (`.docx` via `mammoth`)
  - PowerPoint slides (`.pptx`)
  - Raw Markdown / Text files (`.md`, `.txt`)
  - Wikipedia / Web URL scraping and YouTube video transcript extraction.

---

## 4. 🎮 Multiplayer Mechanics, Moderation & Interactivity

### 4.1 Solo / Practice Mode
- **Priority:** `P1 (High)`
- **Affected Files:** `frontend/src/App.jsx`, `frontend/src/components/LobbyCreation.jsx`
- **Current Problem:**
  Single players must create a multiplayer room, navigate through the lobby, and wait for timers alone.
- **Recommended Solution:**
  1. Add a **"Solo Practice"** option on the home screen.
  2. Run the game loop locally on the client or in an isolated single-player socket room without waiting delays or room codes.
  3. Allow self-paced progression ("Next Question" immediately without transition timers).

### 4.2 Host Administrative Controls
- **Priority:** `P1 (High)`
- **Affected Files:** `frontend/src/components/WaitingLobby.jsx`, `frontend/src/components/QuizArena.jsx`, `backend/src/socket/quizSocket.js`
- **Recommended Solution:**
  Equip the host with in-game controls:
  - **Kick Player**: Remove trolls or AFK players from the lobby.
  - **Pause/Resume Round Timer**: Allow teachers to explain questions mid-game.
  - **Skip Question**: Immediately advance to the next round.
  - **Private Room / Password**: Restrict access to designated participants.

### 4.3 Live Social Reactions (Floating Emojis)
- **Priority:** `P2 (Medium)`
- **Affected Files:** `frontend/src/components/QuizArena.jsx`, `backend/src/socket/quizSocket.js`
- **Recommended Solution:**
  1. Add an emoji reaction bar (🔥, 👏, 💡, 😱, ⚡) on the player screen.
  2. Broadcast `player_reaction` socket events.
  3. Render floating animated emoji bursts ascending the screen (similar to Kahoot and livestream platforms).

### 4.4 Alternative Game Modes
- **Priority:** `P2 (Medium)`
- **Affected Files:** `backend/src/socket/quizSocket.js`, `frontend/src/components/LobbyCreation.jsx`
- **Recommended Modes:**
  1. **Battle Royale / Elimination:** Lowest-scoring 20% of players are eliminated each round; top survivors battle in the final round.
  2. **Team Arena:** Group players into 2–4 teams (Red vs Blue); aggregate scores for cooperative gameplay.
  3. **Wager / Double-Down:** Players wager 10%–50% of their current points before seeing the question options.

---

## 5. 📚 Educational Tools, Export & Analytics

### 5.1 Export to Anki Flashcards & Printable PDF
- **Priority:** `P2 (Medium)`
- **Affected Files:** `frontend/src/components/FinalLeaderboard.jsx`, `frontend/src/components/CreatorPortal.jsx`
- **Recommended Solution:**
  1. **Printable PDF Worksheet:** Export questions and answer keys formatted cleanly with CSS `@media print` or `jspdf`.
  2. **Anki Flashcard Deck (`.csv` / `.apkg`):** Front = Question, Back = Correct Answer + AI Explanation for spaced repetition study.

### 5.2 Question Bank & Saved Quizzes Library
- **Priority:** `P2 (Medium)`
- **Affected Files:** `backend/src/models/QuizSession.js`, `frontend/src/components/Navbar.jsx`
- **Recommended Solution:**
  1. Create a `QuizLibrary` schema in MongoDB storing title, topic, questions, creator metadata, and timestamps.
  2. Add a "Quiz Library" tab where users can browse, preview, and relaunch previously created quizzes with one click.

### 5.3 Weak Area Diagnostic & Topic Analytics
- **Priority:** `P2 (Medium)`
- **Affected Files:** `frontend/src/components/FinalLeaderboard.jsx`
- **Recommended Solution:**
  At the end of the quiz, display an AI-generated study diagnostic:
  - Breakdown of accuracy per topic/chapter.
  - Recommended revision topics based on questions missed.

---

## 6. 🎨 Frontend UI/UX, Accessibility & Audio

### 6.1 Keyboard Accessibility (a11y)
- **Priority:** `P3 (Polish)`
- **Affected Files:** `frontend/src/components/QuizArena.jsx`
- **Recommended Solution:**
  - Key bindings `1`, `2`, `3`, `4` or `A`, `B`, `C`, `D` to select options.
  - Key `Space` / `Enter` to confirm answer or trigger "Next Question" for host.
  - Full screen toggle (`F` or button).

### 6.2 Granular Audio Controls
- **Priority:** `P3 (Polish)`
- **Affected Files:** `frontend/src/utils/soundEffects.js`, `frontend/src/components/Navbar.jsx`
- **Current Problem:**
  Only a binary Mute / Unmute toggle exists.
- **Recommended Solution:**
  Add a volume slider (0% to 100%) stored in `localStorage` that controls the master gain node in Web Audio API.

---

## 7. 🚀 DevOps, Automation & Developer Experience

### 7.1 Root Project Dev Runner
- **Priority:** `P3 (Convenience)`
- **Affected Files:** Root `package.json`
- **Current Problem:**
  Developers must manually open two terminal windows (`cd backend; npm run dev` and `cd frontend; npm run dev`).
- **Recommended Solution:**
  Create a root `package.json` with `concurrently`:
  ```json
  {
    "name": "ai-quiz-builder-workspace",
    "private": true,
    "scripts": {
      "dev": "concurrently \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\"",
      "install:all": "npm install --prefix backend && npm install --prefix frontend"
    },
    "devDependencies": {
      "concurrently": "^9.1.2"
    }
  }
  ```

### 7.2 Docker & Docker Compose Containerization
- **Priority:** `P3 (Convenience)`
- **Affected Files:** `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`
- **Recommended Solution:**
  Provide a single-command setup `docker-compose up` orchestrating MongoDB, Express Backend, and Vite Frontend.

---

## 📅 Suggested Implementation Phases

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: STABILITY & CORE SECURITY (P0)                    │
│ • ActiveRooms TTL garbage collection                        │
│ • Express rate limiting on PDF upload & generation         │
│ • Production CORS enforcement                               │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 2: CREATOR & MODERATOR CONTROLS (P1)                  │
│ • Question Review & Edit modal in Creator Portal            │
│ • Host controls (Kick player, Pause/Resume round timer)     │
│ • Solo Practice Mode for single-player study                │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 3: EXPANDED CAPABILITIES & STUDY TOOLS (P2)           │
│ • Anki (.csv) & Printable PDF export                        │
│ • Persistent Quiz Library & MongoDB re-hosting              │
│ • Live floating emoji reactions                             │
│ • Multimodal scanned document parsing (Gemini Vision)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 4: SCALABILITY & POLISH (P3)                          │
│ • Root package.json / concurrently script                   │
│ • Docker Compose setup                                      │
│ • Keyboard shortcuts & audio volume slider                  │
└─────────────────────────────────────────────────────────────┘
```

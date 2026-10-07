import { Room } from '../models/Room.js';
import { QuizSession } from '../models/QuizSession.js';
import { generatePersonalizedQuizzes, generatePersonalizedPDFQuizzes } from '../services/aiService.js';
import { getDBStatus } from '../config/db.js';

// In-memory runtime state for low-latency authoritative synchronization
const activeRooms = new Map();

/**
 * Server-Side Timer Manager using setInterval per room to guarantee authoritative round clocks
 */
class RoomTimerManager {
  constructor() {
    this.intervals = new Map(); // roomCode -> NodeJS.Timeout
    this.transitionIntervals = new Map(); // roomCode -> NodeJS.Timeout
  }

  startRoundTimer(roomCode, totalSeconds, onTick, onExpire) {
    this.clearTimer(roomCode);

    let remaining = totalSeconds;
    const intervalId = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        onTick(remaining);
      } else {
        this.clearTimer(roomCode);
        onExpire();
      }
    }, 1000);

    this.intervals.set(roomCode, intervalId);
  }

  clearTimer(roomCode) {
    if (this.intervals.has(roomCode)) {
      clearInterval(this.intervals.get(roomCode));
      this.intervals.delete(roomCode);
    }
  }

  startTransitionTimer(roomCode, totalSeconds, onTick, onExpire) {
    this.clearTransitionTimer(roomCode);

    let remaining = totalSeconds;
    const intervalId = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        onTick(remaining);
      } else {
        this.clearTransitionTimer(roomCode);
        onExpire();
      }
    }, 1000);

    this.transitionIntervals.set(roomCode, intervalId);
  }

  clearTransitionTimer(roomCode) {
    if (this.transitionIntervals.has(roomCode)) {
      clearInterval(this.transitionIntervals.get(roomCode));
      this.transitionIntervals.delete(roomCode);
    }
  }
}

const timerManager = new RoomTimerManager();

// Input Sanitization utility
function sanitizeInput(str, maxLength = 60) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // Strip potential script injection characters
    .trim()
    .slice(0, maxLength);
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid visually ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function createPreloadedRoom({
  roomCode,
  hostName,
  topic,
  difficulty,
  questionCount,
  timePerQuestion,
  questions,
  avatarSeed,
  hostSocketId = null,
  pdfText = '',
  topicDistribution = [],
  customApiKey = null
}) {
  const cleanHostName = sanitizeInput(hostName, 24) || 'Host';
  const cleanTopic = sanitizeInput(topic, 100) || 'Custom Curriculum';
  const diff = ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium';
  const qCount = questions.length || Number(questionCount) || 5;
  const tPerQ = Math.min(Math.max(Number(timePerQuestion) || 15, 5), 60);
  const cleanAvatar = sanitizeInput(avatarSeed, 8) || '⚡';

  const roomConfig = {
    roomCode,
    hostSocketId: hostSocketId || 'HOST_PENDING',
    topic: cleanTopic,
    status: 'LOBBY',
    settings: {
      questionCount: qCount,
      timePerQuestion: tPerQ,
      difficulty: diff
    },
    players: [
      {
        socketId: hostSocketId || 'HOST_PENDING',
        username: cleanHostName,
        score: 0,
        isReady: true,
        streak: 0,
        avatarSeed: cleanAvatar,
        isDisconnected: false
      }
    ],
    isPreloaded: true,
    preloadedQuestions: questions,
    pdfText: pdfText || '',
    topicDistribution: topicDistribution || [],
    customApiKey: customApiKey || null
  };

  const runtimeGame = {
    ...roomConfig,
    currentQuestionIndex: 0,
    roundStartTime: null,
    playerQuestions: new Map(),
    playerAnswers: new Map(),
    submissionsCurrentRound: new Set()
  };

  activeRooms.set(roomCode, runtimeGame);
  return runtimeGame;
}

export function getActiveRoom(roomCode) {
  return activeRooms.get(roomCode);
}

export function setupQuizSocket(io) {
  io.on('connection', (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    // 1. Create Room (Host)
    socket.on('create_room', async ({ hostName, topic, questionCount, timePerQuestion, difficulty, customApiKey, avatarSeed }) => {
      try {
        const cleanHostName = sanitizeInput(hostName, 24) || 'Host';
        const cleanTopic = sanitizeInput(topic, 100) || 'General Science & History';
        const qCount = Math.min(Math.max(Number(questionCount) || 5, 2), 15);
        const tPerQ = Math.min(Math.max(Number(timePerQuestion) || 15, 5), 60);
        const diff = ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium';
        const cleanAvatar = sanitizeInput(avatarSeed, 8) || '⚡';

        let roomCode = generateRoomCode();
        while (activeRooms.has(roomCode)) {
          roomCode = generateRoomCode();
        }

        const roomConfig = {
          roomCode,
          hostSocketId: socket.id,
          topic: cleanTopic,
          status: 'LOBBY',
          settings: {
            questionCount: qCount,
            timePerQuestion: tPerQ,
            difficulty: diff
          },
          players: [
            {
              socketId: socket.id,
              username: cleanHostName,
              score: 0,
              isReady: true,
              streak: 0,
              avatarSeed: cleanAvatar,
              isDisconnected: false
            }
          ],
          customApiKey: customApiKey ? String(customApiKey).trim() : null
        };

        const runtimeGame = {
          ...roomConfig,
          currentQuestionIndex: 0,
          roundStartTime: null,
          playerQuestions: new Map(), // socketId -> Array of questions
          playerAnswers: new Map(),   // socketId -> Array of user answers
          submissionsCurrentRound: new Set(),
        };

        activeRooms.set(roomCode, runtimeGame);
        socket.join(roomCode);

        if (getDBStatus()) {
          try {
            await Room.create({
              roomCode,
              hostSocketId: socket.id,
              topic: runtimeGame.topic,
              status: 'LOBBY',
              settings: runtimeGame.settings,
              players: runtimeGame.players
            });
          } catch (dbErr) {
            console.warn('[DB Error on Room Create]:', dbErr.message);
          }
        }

        console.log(`[Room Created] ${roomCode} by ${cleanHostName} (${socket.id}) | Difficulty: ${diff}`);
        socket.emit('room_created', {
          roomCode,
          room: sanitizeRoomForClient(runtimeGame)
        });
      } catch (err) {
        console.error('Error in create_room:', err);
        socket.emit('error_message', { message: 'Failed to create room. Please try again.' });
      }
    });

    // 2. Join Room (Player)
    socket.on('join_room', async ({ roomCode, username, avatarSeed }) => {
      try {
        const code = sanitizeInput(roomCode, 6).toUpperCase();
        const cleanName = sanitizeInput(username, 24);
        const cleanAvatar = sanitizeInput(avatarSeed, 8) || '🧠';

        const game = activeRooms.get(code);

        if (!game) {
          return socket.emit('error_message', { message: 'Room not found. Check your 6-character code.' });
        }

        if (game.status !== 'LOBBY') {
          return socket.emit('error_message', { message: 'Game has already started or concluded.' });
        }

        const existingPlayer = game.players.find(p => p.socketId === socket.id || p.username.toLowerCase() === cleanName.toLowerCase());
        
        if (existingPlayer) {
          existingPlayer.socketId = socket.id;
          existingPlayer.username = cleanName || existingPlayer.username;
          existingPlayer.isDisconnected = false;
          if (game.hostSocketId === 'HOST_PENDING' || game.hostSocketId === existingPlayer.socketId) {
            game.hostSocketId = socket.id;
          }
        } else {
          const newPlayer = {
            socketId: socket.id,
            username: cleanName || `Player_${game.players.length + 1}`,
            score: 0,
            isReady: false,
            streak: 0,
            avatarSeed: cleanAvatar,
            isDisconnected: false
          };
          game.players.push(newPlayer);
        }

        socket.join(code);

        if (getDBStatus()) {
          try {
            await Room.updateOne({ roomCode: code }, { $set: { players: game.players } });
          } catch (dbErr) {
            console.warn('[DB Error on Join]:', dbErr.message);
          }
        }

        console.log(`[Player Joined] ${cleanName} joined room ${code}`);

        socket.emit('room_joined', {
          roomCode: code,
          room: sanitizeRoomForClient(game)
        });

        io.to(code).emit('roster_updated', {
          players: game.players,
          hostSocketId: game.hostSocketId
        });
      } catch (err) {
        console.error('Error in join_room:', err);
        socket.emit('error_message', { message: 'Unable to join room.' });
      }
    });

    // 3. Reconnect Player (Handling network dropouts)
    socket.on('reconnect_player', ({ roomCode, username }) => {
      const code = sanitizeInput(roomCode, 6).toUpperCase();
      const game = activeRooms.get(code);
      if (!game) return socket.emit('error_message', { message: 'Session expired or invalid.' });

      const player = game.players.find(p => p.username.toLowerCase() === (username || '').toLowerCase());
      if (player) {
        const oldSocketId = player.socketId;
        player.socketId = socket.id;
        player.isDisconnected = false;
        socket.join(code);

        // Migrate question sets if game is in progress
        if (game.playerQuestions.has(oldSocketId)) {
          const qList = game.playerQuestions.get(oldSocketId);
          game.playerQuestions.set(socket.id, qList);
        }
        if (game.playerAnswers.has(oldSocketId)) {
          const aList = game.playerAnswers.get(oldSocketId);
          game.playerAnswers.set(socket.id, aList);
        }

        console.log(`🔄 [Player Reconnected] ${player.username} restored in room ${code}`);

        socket.emit('reconnect_success', {
          room: sanitizeRoomForClient(game),
          currentQuestionIndex: game.currentQuestionIndex,
          status: game.status
        });

        io.to(code).emit('roster_updated', {
          players: game.players,
          hostSocketId: game.hostSocketId
        });
      }
    });

    // 4. Toggle Ready (Lobby)
    socket.on('toggle_ready', ({ roomCode }) => {
      const code = sanitizeInput(roomCode, 6).toUpperCase();
      const game = activeRooms.get(code);
      if (!game || game.status !== 'LOBBY') return;

      const player = game.players.find(p => p.socketId === socket.id);
      if (player) {
        player.isReady = !player.isReady;
        io.to(code).emit('roster_updated', {
          players: game.players,
          hostSocketId: game.hostSocketId
        });
      }
    });

    // 4b. Claim Preloaded Room as Host (From Creator Portal)
    socket.on('claim_preloaded_host', ({ roomCode, username, avatarSeed }) => {
      const code = sanitizeInput(roomCode, 6).toUpperCase();
      const game = activeRooms.get(code);
      if (!game) return socket.emit('error_message', { message: 'Preloaded room not found.' });

      game.hostSocketId = socket.id;
      const hostPlayer = game.players.find(p => p.username === username) || game.players[0];
      if (hostPlayer) {
        hostPlayer.socketId = socket.id;
        hostPlayer.username = username || hostPlayer.username;
        hostPlayer.isDisconnected = false;
        if (avatarSeed) hostPlayer.avatarSeed = avatarSeed;
      }
      socket.join(code);
      console.log(`[Preloaded Host Connected] ${hostPlayer?.username || 'Host'} (${socket.id}) claimed room ${code}`);
      
      socket.emit('room_created', {
        roomCode: code,
        room: sanitizeRoomForClient(game)
      });
      io.to(code).emit('roster_updated', {
        players: game.players,
        hostSocketId: game.hostSocketId
      });
    });

    // 5. Start Game (Host) — Supports both 'start_game' and 'start_quiz'
    const handleStartGame = async ({ roomCode }) => {
      const code = sanitizeInput(roomCode, 6).toUpperCase();
      const game = activeRooms.get(code);

      if (!game) return socket.emit('error_message', { message: 'Room not found.' });
      if (game.hostSocketId !== socket.id) {
        return socket.emit('error_message', { message: 'Only the host can start the game.' });
      }
      if (game.status !== 'LOBBY') {
        return socket.emit('error_message', { message: 'Game has already started.' });
      }

      // If room was created with preloaded curriculum questions (e.g. from Creator Portal PDF)
      if (game.isPreloaded) {
        console.log(`[Preloaded Game Start] Room ${code} - Synthesizing distinct PDF curriculum questions for ${game.players.length} players...`);

        game.status = 'GENERATING';
        io.to(code).emit('quiz_generating', {
          message: `Synthesizing personalized curriculum questions on "${game.topic}" for each player...`,
          playerCount: game.players.length
        });

        try {
          let playerQuizzes;
          if (game.pdfText && game.pdfText.trim().length > 0) {
            playerQuizzes = await generatePersonalizedPDFQuizzes({
              pdfText: game.pdfText,
              totalQuestions: game.settings.questionCount,
              topicDistribution: game.topicDistribution || [],
              difficulty: game.settings.difficulty,
              playerCount: game.players.length,
              customApiKey: game.customApiKey,
              roomCode: code
            });
          } else {
            // Guarantee distinct tracks per player by shuffling options and permuting question keys
            playerQuizzes = game.players.map((player, pIdx) => {
              return (game.preloadedQuestions || []).map((q, qIdx) => {
                const shift = (pIdx + qIdx) % 4;
                const rotated = [...q.options.slice(shift), ...q.options.slice(0, shift)];
                const correctOptionText = q.options[q.correctIndex];
                const newCorrectIdx = rotated.indexOf(correctOptionText);

                return {
                  ...q,
                  id: `${q.id || 'pdf-q'}-p${pIdx}-${qIdx}`,
                  options: rotated,
                  correctIndex: newCorrectIdx,
                  subFocus: q.subFocus || `Topic Focus (Track ${pIdx + 1})`
                };
              });
            });
          }

          game.players.forEach((player, idx) => {
            const questions = playerQuizzes[idx] || [];
            game.playerQuestions.set(player.socketId, questions);
            game.playerAnswers.set(player.socketId, []);
          });

          console.log(`[PDF Quizzes Ready] Unique curriculum question streams deployed for all ${game.players.length} players in ${code}`);

          // Broadcast synchronized 3-second countdown
          game.status = 'IN_PROGRESS';
          let countdown = 3;
          io.to(code).emit('countdown_start', { count: countdown });

          const countdownInterval = setInterval(() => {
            countdown -= 1;
            if (countdown > 0) {
              io.to(code).emit('countdown_tick', { count: countdown });
            } else {
              clearInterval(countdownInterval);
              io.to(code).emit('countdown_end');
              startSynchronizedRound(io, code, 0);
            }
          }, 1000);
          return;
        } catch (preloadErr) {
          console.error('Error generating personalized PDF questions:', preloadErr);
          // Resilient fallback: assign questions with rotated options so players never have identical screens
          game.players.forEach((player, pIdx) => {
            const playerQuestionsCopy = (game.preloadedQuestions || []).map((q, qIdx) => {
              const shift = (pIdx + qIdx) % 4;
              const rotated = [...q.options.slice(shift), ...q.options.slice(0, shift)];
              const correctOptionText = q.options[q.correctIndex];
              const newCorrectIdx = rotated.indexOf(correctOptionText);

              return {
                ...q,
                id: `${q.id || 'pdf-q'}-${player.socketId}-${qIdx}`,
                options: rotated,
                correctIndex: newCorrectIdx
              };
            });
            game.playerQuestions.set(player.socketId, playerQuestionsCopy);
            game.playerAnswers.set(player.socketId, []);
          });
          game.status = 'IN_PROGRESS';
          startSynchronizedRound(io, code, 0);
          return;
        }
      }

      console.log(`[Game Start] Room ${code} - Synthesizing distinct AI quizzes for ${game.players.length} players...`);
      game.status = 'GENERATING';

      io.to(code).emit('quiz_generating', {
        message: `Synthesizing personalized AI questions on "${game.topic}" (${game.settings.difficulty})...`,
        playerCount: game.players.length
      });

      if (getDBStatus()) {
        try {
          await Room.updateOne({ roomCode: code }, { $set: { status: 'GENERATING' } });
        } catch (e) {
          console.warn(e.message);
        }
      }

      try {
        // Generate personalized, non-overlapping question sets using rate-limited AI generator
        const playerQuizzes = await generatePersonalizedQuizzes(
          game.topic,
          game.players.length,
          {
            questionCount: game.settings.questionCount,
            difficulty: game.settings.difficulty,
            customApiKey: game.customApiKey,
            roomCode: code
          }
        );

        // Assign unique question bank to each player
        game.players.forEach((player, idx) => {
          const questions = playerQuizzes[idx] || [];
          game.playerQuestions.set(player.socketId, questions);
          game.playerAnswers.set(player.socketId, []);
        });

        console.log(`[AI Quizzes Ready] Unique question streams created for all ${game.players.length} players in ${code}`);

        // Broadcast synchronized 3-second countdown
        game.status = 'IN_PROGRESS';
        let countdown = 3;
        io.to(code).emit('countdown_start', { count: countdown });

        const countdownInterval = setInterval(() => {
          countdown -= 1;
          if (countdown > 0) {
            io.to(code).emit('countdown_tick', { count: countdown });
          } else {
            clearInterval(countdownInterval);
            io.to(code).emit('countdown_end');
            startSynchronizedRound(io, code, 0);
          }
        }, 1000);

      } catch (err) {
        console.error('Error starting game:', err);
        game.status = 'LOBBY';
        io.to(code).emit('error_message', { message: 'Question generation encountered an error. Returning to lobby.' });
        io.to(code).emit('roster_updated', { players: game.players, hostSocketId: game.hostSocketId });
      }
    };

    socket.on('start_game', handleStartGame);
    socket.on('start_quiz', handleStartGame);

    // 6. Submit Answer (Synchronous Round)
    socket.on('submit_answer', ({ roomCode, questionIndex, answerIndex }) => {
      const code = sanitizeInput(roomCode, 6).toUpperCase();
      const game = activeRooms.get(code);

      if (!game || game.status !== 'IN_PROGRESS') return;
      if (game.currentQuestionIndex !== Number(questionIndex)) return;

      const player = game.players.find(p => p.socketId === socket.id);
      if (!player) return;

      // Prevent duplicate submissions in same round
      if (game.submissionsCurrentRound.has(socket.id)) return;
      game.submissionsCurrentRound.add(socket.id);

      const questions = game.playerQuestions.get(socket.id) || [];
      const currentQ = questions[questionIndex];
      if (!currentQ) return;

      // Authoritative time remaining calculation from server timestamp
      const now = Date.now();
      const elapsedMs = Math.max(0, now - (game.roundStartTime || now));
      const totalTimeSec = game.settings.timePerQuestion;
      const elapsedSec = elapsedMs / 1000;
      const timeRemaining = Math.max(0, totalTimeSec - elapsedSec);

      const parsedAnswerIndex = Number(answerIndex);
      const isCorrect = parsedAnswerIndex === Number(currentQ.correctIndex);
      let pointsEarned = 0;

      if (isCorrect) {
        // Base Points = 500, Speed Multiplier = 500
        // Score = Base Points + ((Time Remaining / Total Time) * Speed Multiplier)
        const basePoints = 500;
        const speedMultiplier = 500;
        const speedRatio = Math.max(0, Math.min(1, timeRemaining / totalTimeSec));
        const speedBonus = Math.round(speedRatio * speedMultiplier);

        // Streak progression
        player.streak = (player.streak || 0) + 1;
        const streakBonus = player.streak > 1 ? (player.streak - 1) * 50 : 0;

        pointsEarned = basePoints + speedBonus + streakBonus;
        player.score = (player.score || 0) + pointsEarned;
      } else {
        player.streak = 0;
      }

      const answerRecord = {
        question: currentQ.question,
        options: currentQ.options,
        correctIndex: currentQ.correctIndex,
        explanation: currentQ.explanation,
        userAnswer: parsedAnswerIndex,
        timeSpent: parseFloat(elapsedSec.toFixed(2)),
        pointsEarned
      };

      const userAnswersList = game.playerAnswers.get(socket.id) || [];
      userAnswersList[questionIndex] = answerRecord;
      game.playerAnswers.set(socket.id, userAnswersList);

      // Instant private feedback to user
      socket.emit('answer_result', {
        questionIndex,
        isCorrect,
        correctIndex: currentQ.correctIndex,
        pointsEarned,
        totalScore: player.score,
        streak: player.streak,
        explanation: currentQ.explanation
      });

      // Broadcast real-time score shifts to room
      io.to(code).emit('live_score_update', {
        players: getLeaderboard(game.players)
      });

      // If all active players have submitted, trigger answer reveal immediately
      const activePlayers = game.players.filter(p => !p.isDisconnected);
      if (game.submissionsCurrentRound.size >= activePlayers.length) {
        timerManager.clearTimer(code);
        triggerAnswerReveal(io, code);
      }
    });

    // 6b. Reveal / Trigger Next Question Manually (via Button)
    socket.on('next_question_trigger', ({ roomCode }) => {
      const code = sanitizeInput(roomCode, 6).toUpperCase();
      const game = activeRooms.get(code);
      if (!game || game.status !== 'IN_PROGRESS') return;

      console.log(`[Next Question Button] Room ${code} triggered by ${socket.id}`);
      advanceToNextRound(io, code);
    });

    // 7. Play Again (Host resets lobby)
    socket.on('play_again', ({ roomCode }) => {
      const code = sanitizeInput(roomCode, 6).toUpperCase();
      const game = activeRooms.get(code);
      if (!game || game.hostSocketId !== socket.id) return;

      timerManager.clearTimer(code);
      timerManager.clearTransitionTimer(code);
      game.status = 'LOBBY';
      game.currentQuestionIndex = 0;
      game.submissionsCurrentRound.clear();
      game.playerQuestions.clear();
      game.playerAnswers.clear();
      game.players.forEach(p => {
        p.score = 0;
        p.streak = 0;
        p.isReady = p.socketId === game.hostSocketId;
      });

      io.to(code).emit('game_reset_to_lobby', {
        room: sanitizeRoomForClient(game)
      });
    });

    // 8. Disconnect Handling with Reconnection Tolerance
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      for (const [code, game] of activeRooms.entries()) {
        const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex !== -1) {
          const leavingPlayer = game.players[playerIndex];

          if (game.status === 'LOBBY') {
            game.players.splice(playerIndex, 1);

            // Reassign host if host left
            if (game.hostSocketId === socket.id && game.players.length > 0) {
              game.hostSocketId = game.players[0].socketId;
              game.players[0].isReady = true;
            }

            if (game.players.length === 0) {
              timerManager.clearTimer(code);
              activeRooms.delete(code);
              console.log(`[Room Cleaned] Empty lobby ${code} deleted.`);
            } else {
              io.to(code).emit('roster_updated', {
                players: game.players,
                hostSocketId: game.hostSocketId
              });
            }
          } else {
            leavingPlayer.isDisconnected = true;
            leavingPlayer.lastActive = new Date();
            io.to(code).emit('player_status_change', {
              socketId: socket.id,
              isDisconnected: true,
              username: leavingPlayer.username
            });

            // Check if all remaining players have submitted
            const remainingActive = game.players.filter(p => !p.isDisconnected);
            if (remainingActive.length > 0 && game.submissionsCurrentRound.size >= remainingActive.length) {
              timerManager.clearTimer(code);
              triggerAnswerReveal(io, code);
            }
          }
          break;
        }
      }
    });
  });
}

/**
 * Start a question round orchestrated by authoritative Server-Side Timer Manager
 */
function startSynchronizedRound(io, roomCode, questionIndex) {
  const game = activeRooms.get(roomCode);
  if (!game) return;

  game.currentQuestionIndex = questionIndex;
  game.submissionsCurrentRound.clear();
  game.roundStartTime = Date.now();
  const totalSeconds = game.settings.timePerQuestion;

  console.log(`[Round ${questionIndex + 1}/${game.settings.questionCount}] Commenced in room ${roomCode}`);

  // Dispatch individualized questions to each player (hiding correctIndex)
  game.players.forEach((player) => {
    const questions = game.playerQuestions.get(player.socketId) || [];
    const qData = questions[questionIndex];

    if (qData) {
      io.to(player.socketId).emit('round_question', {
        questionIndex,
        totalQuestions: game.settings.questionCount,
        timeLimit: totalSeconds,
        question: qData.question,
        options: qData.options,
        id: qData.id,
        roundStartTime: game.roundStartTime,
        subFocus: qData.subFocus || ''
      });
    }
  });

  // Start authoritative countdown timer
  timerManager.startRoundTimer(
    roomCode,
    totalSeconds,
    (remainingSeconds) => {
      io.to(roomCode).emit('timer_tick', {
        roundIndex: questionIndex,
        timeRemaining: remainingSeconds
      });
    },
    () => {
      // Authoritative round timer hit zero -> trigger answer reveal
      triggerAnswerReveal(io, roomCode);
    }
  );
}

/**
 * Intercept round completion, broadcast answer_reveal, and orchestrate 5s transition timer
 */
function triggerAnswerReveal(io, roomCode) {
  const game = activeRooms.get(roomCode);
  if (!game) return;

  timerManager.clearTimer(roomCode);
  const qIndex = game.currentQuestionIndex;

  // Process any unanswered players as timed out
  game.players.forEach(player => {
    if (!game.submissionsCurrentRound.has(player.socketId)) {
      const questions = game.playerQuestions.get(player.socketId) || [];
      const currentQ = questions[qIndex];
      if (currentQ) {
        const userAnswersList = game.playerAnswers.get(player.socketId) || [];
        userAnswersList[qIndex] = {
          question: currentQ.question,
          options: currentQ.options,
          correctIndex: currentQ.correctIndex,
          explanation: currentQ.explanation,
          userAnswer: -1, // timed out
          timeSpent: game.settings.timePerQuestion,
          pointsEarned: 0
        };
        game.playerAnswers.set(player.socketId, userAnswersList);
        player.streak = 0;
      }
    }
  });

  const transitionDuration = 15; // 15-second reveal window (can be advanced early via Next Question button)
  console.log(`[Answer Reveal] Room ${roomCode} Round ${qIndex + 1} - ${transitionDuration}s transition timer active (or click Next Question)`);

  // Broadcast tailored answer_reveal event to each player
  game.players.forEach(player => {
    const questions = game.playerQuestions.get(player.socketId) || [];
    const currentQ = questions[qIndex];
    const userAnswersList = game.playerAnswers.get(player.socketId) || [];
    const answerItem = userAnswersList[qIndex] || {
      userAnswer: -1,
      pointsEarned: 0
    };

    if (currentQ) {
      io.to(player.socketId).emit('answer_reveal', {
        questionIndex: qIndex,
        totalQuestions: game.settings.questionCount,
        correctIndex: currentQ.correctIndex,
        explanation: currentQ.explanation,
        userAnswer: answerItem.userAnswer,
        isCorrect: answerItem.userAnswer === currentQ.correctIndex,
        pointsEarned: answerItem.pointsEarned,
        totalScore: player.score,
        streak: player.streak,
        timedOut: answerItem.userAnswer === -1,
        transitionDuration
      });
    }
  });

  // Also broadcast room-level standings during reveal
  io.to(roomCode).emit('answer_reveal_room', {
    questionIndex: qIndex,
    totalQuestions: game.settings.questionCount,
    leaderboard: getLeaderboard(game.players),
    transitionDuration
  });

  // Start authoritative transition timer (automatically expires after transitionDuration or early via button)
  timerManager.startTransitionTimer(
    roomCode,
    transitionDuration,
    (remainingSeconds) => {
      io.to(roomCode).emit('transition_tick', {
        secondsRemaining: remainingSeconds,
        questionIndex: qIndex
      });
    },
    () => {
      advanceToNextRound(io, roomCode);
    }
  );
}

/**
 * Advance to next round or finalize game (triggered either by timer or Next Question button)
 */
function advanceToNextRound(io, roomCode) {
  const game = activeRooms.get(roomCode);
  if (!game || game.status !== 'IN_PROGRESS') return;

  timerManager.clearTransitionTimer(roomCode);
  timerManager.clearTimer(roomCode);

  const qIndex = game.currentQuestionIndex;
  const nextIndex = qIndex + 1;

  if (nextIndex < game.settings.questionCount) {
    console.log(`[Next Question] Room ${roomCode} advancing to Round ${nextIndex + 1}`);
    io.to(roomCode).emit('next_question', {
      nextQuestionIndex: nextIndex,
      totalQuestions: game.settings.questionCount
    });
    startSynchronizedRound(io, roomCode, nextIndex);
  } else {
    finalizeGame(io, roomCode);
  }
}

/**
 * Finalize Game, compute podium, and persist QuizSession
 */
async function finalizeGame(io, roomCode) {
  const game = activeRooms.get(roomCode);
  if (!game) return;

  timerManager.clearTimer(roomCode);
  timerManager.clearTransitionTimer(roomCode);
  game.status = 'FINISHED';

  const leaderboard = getLeaderboard(game.players);
  const podium = {
    first: leaderboard[0] || null,
    second: leaderboard[1] || null,
    third: leaderboard[2] || null
  };

  const sessionData = {};
  game.playerAnswers.forEach((answers, socketId) => {
    sessionData[socketId] = answers;
  });

  if (getDBStatus()) {
    try {
      await Room.updateOne(
        { roomCode },
        { 
          $set: { 
            status: 'FINISHED',
            players: game.players 
          } 
        }
      );

      await QuizSession.create({
        roomCode,
        playerData: sessionData,
        topic: game.topic,
        completedAt: new Date()
      });
      console.log(`[DB Saved] QuizSession for room ${roomCode}`);
    } catch (dbErr) {
      console.warn('[DB Save Error]:', dbErr.message);
    }
  }

  console.log(`🏆 [Game Concluded] Room ${roomCode} | Champion: ${leaderboard[0]?.username}`);

  io.to(roomCode).emit('game_over', {
    roomCode,
    topic: game.topic,
    difficulty: game.settings.difficulty,
    leaderboard,
    podium,
    playerBreakdowns: sessionData
  });
}

function getLeaderboard(players) {
  return [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
}

function sanitizeRoomForClient(game) {
  return {
    roomCode: game.roomCode,
    hostSocketId: game.hostSocketId,
    topic: game.topic,
    status: game.status,
    settings: game.settings,
    players: game.players
  };
}

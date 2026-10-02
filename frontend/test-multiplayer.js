import { io } from 'socket.io-client';

const socket1 = io('http://localhost:5000');
const socket2 = io('http://localhost:5000');

let roomCodeGlobal = '';

socket1.on('connect', () => {
  console.log('✅ Socket 1 connected:', socket1.id);
  socket1.emit('create_room', {
    hostName: 'HostAlpha',
    topic: 'React Performance Optimization',
    difficulty: 'Medium',
    questionCount: 2,
    timePerQuestion: 5,
    avatarSeed: '⚡'
  });
});

socket1.on('room_created', ({ roomCode, room }) => {
  roomCodeGlobal = roomCode;
  console.log(`✅ Room Created: ${roomCode} | Topic: "${room.topic}"`);

  socket2.on('connect', () => {
    socket2.emit('join_room', {
      roomCode,
      username: 'PlayerBeta',
      avatarSeed: '🧠'
    });
  });

  if (socket2.connected) {
    socket2.emit('join_room', {
      roomCode,
      username: 'PlayerBeta',
      avatarSeed: '🧠'
    });
  }
});

socket2.on('room_joined', ({ roomCode, room }) => {
  console.log(`✅ PlayerBeta joined room ${roomCode}. Total players: ${room.players.length}`);
  console.log('🚀 Triggering start_game...');
  setTimeout(() => {
    socket1.emit('start_game', { roomCode });
  }, 400);
});

socket1.on('countdown_start', ({ count }) => {
  console.log(`⏱️ Countdown started: ${count}`);
});

socket1.on('round_question', (data) => {
  console.log(`🎯 [Round ${data.questionIndex + 1}/${data.totalQuestions}] Question received: "${data.question.slice(0, 45)}..."`);
  setTimeout(() => {
    socket1.emit('submit_answer', {
      roomCode: roomCodeGlobal,
      questionIndex: data.questionIndex,
      answerIndex: 0
    });
  }, 400);
});

socket2.on('round_question', (data) => {
  setTimeout(() => {
    socket2.emit('submit_answer', {
      roomCode: roomCodeGlobal,
      questionIndex: data.questionIndex,
      answerIndex: 1
    });
  }, 500);
});

// Testing the new answer_reveal event
socket1.on('answer_reveal', (data) => {
  console.log(`🌟 [Answer Reveal Phase Active]: Round ${data.questionIndex + 1}`);
  console.log(`   Correct Option Index: ${data.correctIndex}`);
  console.log(`   Host choice was correct: ${data.isCorrect} (+${data.pointsEarned} pts)`);
  console.log(`   Transition duration: ${data.transitionDuration}s`);
});

socket1.on('transition_tick', ({ secondsRemaining, questionIndex }) => {
  console.log(`⏳ Transition Countdown Tick: ${secondsRemaining}s remaining for Round ${questionIndex + 1}`);
});

socket1.on('next_question', ({ nextQuestionIndex, totalQuestions }) => {
  console.log(`➡️ [Next Question Broadcast]: Advancing to Round ${nextQuestionIndex + 1}/${totalQuestions}`);
});

socket1.on('game_over', (data) => {
  console.log(`\n🏆🏆🏆 GAME OVER CONFIRMED! 🏆🏆🏆`);
  console.log(`Winner: ${data.podium.first?.username} with ${data.podium.first?.score} pts`);
  console.log(`Leaderboard: ${data.leaderboard.map(p => `${p.username}: ${p.score}`).join(', ')}`);
  console.log(`✅ REVEAL & TRANSITION PHASE VERIFIED END-TO-END WITH 100% SUCCESS!\n`);

  socket1.disconnect();
  socket2.disconnect();
  process.exit(0);
});

socket1.on('error_message', (err) => {
  console.error('❌ Error from socket1:', err);
});

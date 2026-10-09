import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import Navbar from './components/Navbar';
import LobbyCreation from './components/LobbyCreation';
import WaitingLobby from './components/WaitingLobby';
import CountdownOverlay from './components/CountdownOverlay';
import QuizArena from './components/QuizArena';
import RoundRecap from './components/RoundRecap';
import FinalLeaderboard from './components/FinalLeaderboard';
import ApiKeyModal from './components/ApiKeyModal';
import CreatorPortal from './components/CreatorPortal';
import QuizLibraryModal from './components/QuizLibraryModal';
import { sounds } from './utils/soundEffects';

export default function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [currentSocketId, setCurrentSocketId] = useState(null);

  // App View State: 'LOBBY_SELECT' | 'LOBBY_WAITING' | 'QUIZ_ROUND' | 'ROUND_RECAP' | 'GAME_OVER'
  const [viewState, setViewState] = useState('LOBBY_SELECT');
  const [isCreatorPortalOpen, setIsCreatorPortalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Game Room & Question Data
  const [roomData, setRoomData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [liveLeaderboard, setLiveLeaderboard] = useState([]);
  const [roundRecapData, setRoundRecapData] = useState(null);
  const [gameOverData, setGameOverData] = useState(null);
  const [serverAuthoritativeTime, setServerAuthoritativeTime] = useState(null);

  // Dedicated Round Status: 'WAITING_FOR_PLAYERS' | 'ACTIVE_QUESTION' | 'REVEAL_ANSWER'
  const [roundStatus, setRoundStatus] = useState('WAITING_FOR_PLAYERS');
  const [answerRevealData, setAnswerRevealData] = useState(null);
  const [transitionSecondsRemaining, setTransitionSecondsRemaining] = useState(null);

  // Moderation & Reaction State
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [incomingReaction, setIncomingReaction] = useState(null);

  // Global Alerts / Error Toast
  const [notification, setNotification] = useState(null);

  // Optional custom Gemini API key
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Connect socket and register events
  useEffect(() => {
    socket.connect();

    function onConnect() {
      setIsConnected(true);
      setCurrentSocketId(socket.id);

      // Auto-reconnect session if available in sessionStorage
      const savedCode = sessionStorage.getItem('quiz_room_code');
      const savedUsername = sessionStorage.getItem('quiz_username');
      if (savedCode && savedUsername) {
        console.log(`[Auto-Reconnecting] Room: ${savedCode} as ${savedUsername}`);
        socket.emit('reconnect_player', {
          roomCode: savedCode,
          username: savedUsername
        });
      }
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onRoomCreated({ roomCode, room }) {
      sessionStorage.setItem('quiz_room_code', roomCode);
      sessionStorage.setItem('quiz_username', room.players[0]?.username || 'Host');
      setRoomData(room);
      setLiveLeaderboard(room.players);
      setViewState('LOBBY_WAITING');
      setRoundStatus('WAITING_FOR_PLAYERS');
      setIsGenerating(false);

      // In Solo Practice mode, automatically begin quiz generation and start
      if (room.isSolo) {
        showNotification('Solo Practice Room initialized! Starting countdown...');
        setTimeout(() => {
          socket.emit('start_game', { roomCode });
        }, 300);
      }
    }

    function onRoomJoined({ roomCode, room }) {
      sessionStorage.setItem('quiz_room_code', roomCode);
      const myPlayer = room.players.find(p => p.socketId === socket.id);
      if (myPlayer) sessionStorage.setItem('quiz_username', myPlayer.username);
      setRoomData(room);
      setLiveLeaderboard(room.players);
      setViewState('LOBBY_WAITING');
      setRoundStatus('WAITING_FOR_PLAYERS');
    }

    function onReconnectSuccess({ room, status }) {
      setRoomData(room);
      setLiveLeaderboard(room.players);
      if (status === 'LOBBY') {
        setViewState('LOBBY_WAITING');
        setRoundStatus('WAITING_FOR_PLAYERS');
      }
      showNotification('Reconnected to active arena successfully!');
    }

    function onRosterUpdated({ players, hostSocketId }) {
      setRoomData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players,
          hostSocketId
        };
      });
      setLiveLeaderboard(players);
    }

    function onPlayerStatusChange({ username, isDisconnected }) {
      if (isDisconnected) {
        showNotification(`${username || 'A player'} disconnected (waiting for reconnect...)`);
      }
    }

    function onQuizGenerating({ message }) {
      setIsGenerating(true);
      setRoundStatus('WAITING_FOR_PLAYERS');
      showNotification(message || 'AI is generating tailored questions...');
    }

    function onCountdownStart({ count }) {
      setIsGenerating(false);
      setCountdownNumber(count);
    }

    function onCountdownTick({ count }) {
      setCountdownNumber(count);
    }

    function onCountdownEnd() {
      setCountdownNumber(null);
    }

    function onRoundQuestion(data) {
      setRoundStatus('ACTIVE_QUESTION');
      setIsTimerPaused(false);
      setAnswerRevealData(null);
      setTransitionSecondsRemaining(null);
      setRoundRecapData(null);
      setAnswerResult(null);
      setServerAuthoritativeTime(data.timeLimit);
      setCurrentQuestion(data);
      setViewState('QUIZ_ROUND');
    }

    function onTimerTick({ timeRemaining }) {
      setServerAuthoritativeTime(timeRemaining);
    }

    function onAnswerResult(result) {
      setAnswerResult(result);
    }

    // Answer Reveal Phase
    function onAnswerReveal(data) {
      setRoundStatus('REVEAL_ANSWER');
      setAnswerRevealData(data);
      setTransitionSecondsRemaining(data.transitionDuration || 5);
      setAnswerResult(data);
    }

    function onAnswerRevealRoom({ leaderboard, transitionDuration }) {
      setLiveLeaderboard(leaderboard);
    }

    function onTransitionTick({ secondsRemaining }) {
      setTransitionSecondsRemaining(secondsRemaining);
    }

    function onNextQuestion() {
      setRoundStatus('ACTIVE_QUESTION');
      setAnswerRevealData(null);
      setTransitionSecondsRemaining(null);
    }

    function onLiveScoreUpdate({ players }) {
      setLiveLeaderboard(players);
    }

    function onRoundEnded(data) {
      setLiveLeaderboard(data.leaderboard);
      setRoundRecapData(data);
    }

    function onGameOver(data) {
      setGameOverData(data);
      setLiveLeaderboard(data.leaderboard);
      setViewState('GAME_OVER');
      setRoundStatus('WAITING_FOR_PLAYERS');
    }

    function onGameReset({ room }) {
      setRoomData(room);
      setLiveLeaderboard(room.players);
      setCurrentQuestion(null);
      setAnswerResult(null);
      setAnswerRevealData(null);
      setTransitionSecondsRemaining(null);
      setRoundRecapData(null);
      setGameOverData(null);
      setIsTimerPaused(false);
      setViewState('LOBBY_WAITING');
      setRoundStatus('WAITING_FOR_PLAYERS');
    }

    function onError({ message }) {
      showNotification(message, true);
      setIsGenerating(false);
    }

    // Moderation & Reaction Socket Events
    function onRoundTimerPaused() {
      setIsTimerPaused(true);
      showNotification('⏸️ Round clock paused by host.');
    }

    function onRoundTimerResumed() {
      setIsTimerPaused(false);
      showNotification('▶️ Round clock resumed.');
    }

    function onPlayerReaction(reaction) {
      setIncomingReaction(reaction);
    }

    function onPlayerKicked({ socketId, reason }) {
      if (socketId === socket.id) {
        showNotification(reason || 'You were removed from the room by the host.', true);
        handleLeaveGame();
      } else {
        showNotification('A player was removed by the host.');
      }
    }

    function onPlayerEliminated({ playerName }) {
      showNotification(`☠️ ${playerName} eliminated in Battle Royale!`, true);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_created', onRoomCreated);
    socket.on('room_joined', onRoomJoined);
    socket.on('reconnect_success', onReconnectSuccess);
    socket.on('roster_updated', onRosterUpdated);
    socket.on('player_status_change', onPlayerStatusChange);
    socket.on('quiz_generating', onQuizGenerating);
    socket.on('countdown_start', onCountdownStart);
    socket.on('countdown_tick', onCountdownTick);
    socket.on('countdown_end', onCountdownEnd);
    socket.on('round_question', onRoundQuestion);
    socket.on('timer_tick', onTimerTick);
    socket.on('answer_result', onAnswerResult);
    socket.on('answer_reveal', onAnswerReveal);
    socket.on('answer_reveal_room', onAnswerRevealRoom);
    socket.on('transition_tick', onTransitionTick);
    socket.on('next_question', onNextQuestion);
    socket.on('live_score_update', onLiveScoreUpdate);
    socket.on('round_ended', onRoundEnded);
    socket.on('game_over', onGameOver);
    socket.on('game_reset_to_lobby', onGameReset);
    socket.on('error_message', onError);

    socket.on('round_timer_paused', onRoundTimerPaused);
    socket.on('round_timer_resumed', onRoundTimerResumed);
    socket.on('player_reaction', onPlayerReaction);
    socket.on('player_kicked', onPlayerKicked);
    socket.on('player_eliminated', onPlayerEliminated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_created', onRoomCreated);
      socket.off('room_joined', onRoomJoined);
      socket.off('reconnect_success', onReconnectSuccess);
      socket.off('roster_updated', onRosterUpdated);
      socket.off('player_status_change', onPlayerStatusChange);
      socket.off('quiz_generating', onQuizGenerating);
      socket.off('countdown_start', onCountdownStart);
      socket.off('countdown_tick', onCountdownTick);
      socket.off('countdown_end', onCountdownEnd);
      socket.off('round_question', onRoundQuestion);
      socket.off('timer_tick', onTimerTick);
      socket.off('answer_result', onAnswerResult);
      socket.off('answer_reveal', onAnswerReveal);
      socket.off('answer_reveal_room', onAnswerRevealRoom);
      socket.off('transition_tick', onTransitionTick);
      socket.off('next_question', onNextQuestion);
      socket.off('live_score_update', onLiveScoreUpdate);
      socket.off('round_ended', onRoundEnded);
      socket.off('game_over', onGameOver);
      socket.off('game_reset_to_lobby', onGameReset);
      socket.off('error_message', onError);

      socket.off('round_timer_paused', onRoundTimerPaused);
      socket.off('round_timer_resumed', onRoundTimerResumed);
      socket.off('player_reaction', onPlayerReaction);
      socket.off('player_kicked', onPlayerKicked);
      socket.off('player_eliminated', onPlayerEliminated);
    };
  }, []);

  const showNotification = (msg, isError = false) => {
    setNotification({ message: msg, isError });
    setTimeout(() => setNotification(null), 4500);
  };

  // Handlers
  const handleCreateRoom = (params) => {
    socket.emit('create_room', {
      ...params,
      customApiKey: customApiKey || null
    });
  };

  const handleJoinRoom = (params) => {
    socket.emit('join_room', params);
  };

  const handleToggleReady = () => {
    if (!roomData) return;
    socket.emit('toggle_ready', { roomCode: roomData.roomCode });
  };

  const handlePdfQuizCreated = ({ roomCode, room, questions, hostName, avatarSeed }) => {
    sessionStorage.setItem('quiz_room_code', roomCode);
    sessionStorage.setItem('quiz_username', hostName || 'Host');

    socket.emit('claim_preloaded_host', {
      roomCode,
      username: hostName,
      avatarSeed,
      questions
    });

    setRoomData(room);
    setLiveLeaderboard(room?.players || []);
    setViewState('LOBBY_WAITING');
    setRoundStatus('WAITING_FOR_PLAYERS');
    setIsCreatorPortalOpen(false);
    showNotification(`Curriculum quiz ready with ${questions.length} questions! Awaiting players in lobby.`);
  };

  const handleLibraryQuizLaunch = ({ roomCode, room, questions }) => {
    sessionStorage.setItem('quiz_room_code', roomCode);
    sessionStorage.setItem('quiz_username', 'Library Host');

    socket.emit('claim_preloaded_host', {
      roomCode,
      username: 'Library Host',
      avatarSeed: '📚',
      questions
    });

    setRoomData(room);
    setLiveLeaderboard(room?.players || []);
    setViewState('LOBBY_WAITING');
    setRoundStatus('WAITING_FOR_PLAYERS');
    showNotification(`Library quiz loaded into Room ${roomCode}! Share code with competitors.`);
  };

  const handleStartQuiz = () => {
    if (!roomData) return;
    socket.emit('start_game', { roomCode: roomData.roomCode });
  };

  const handleSubmitAnswer = (questionIndex, answerIndex) => {
    if (!roomData) return;
    socket.emit('submit_answer', {
      roomCode: roomData.roomCode,
      questionIndex,
      answerIndex
    });
  };

  const handleNextQuestion = () => {
    if (!roomData) return;
    socket.emit('next_question_trigger', { roomCode: roomData.roomCode });
  };

  const handlePlayAgain = () => {
    if (!roomData) return;
    socket.emit('play_again', { roomCode: roomData.roomCode });
  };

  const handleLeaveGame = () => {
    sessionStorage.removeItem('quiz_room_code');
    sessionStorage.removeItem('quiz_username');
    window.location.reload();
  };

  const handleSaveApiKey = (key) => {
    setCustomApiKey(key);
    if (key) {
      localStorage.setItem('gemini_api_key', key);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  };

  // Host Moderation Handlers
  const handleKickPlayer = (targetSocketId) => {
    if (!roomData) return;
    socket.emit('kick_player', {
      roomCode: roomData.roomCode,
      targetSocketId
    });
  };

  const handlePauseTimer = () => {
    if (!roomData) return;
    socket.emit('pause_timer', { roomCode: roomData.roomCode });
  };

  const handleResumeTimer = () => {
    if (!roomData) return;
    socket.emit('resume_timer', { roomCode: roomData.roomCode });
  };

  const handleSkipQuestion = () => {
    if (!roomData) return;
    socket.emit('skip_question', { roomCode: roomData.roomCode });
  };

  const handleSendReaction = (emoji) => {
    if (!roomData) return;
    socket.emit('send_reaction', {
      roomCode: roomData.roomCode,
      emoji
    });
  };

  const isHost = roomData?.hostSocketId === currentSocketId;
  const myPlayer = liveLeaderboard?.find(p => p.socketId === currentSocketId);

  return (
    <div className="min-h-screen flex flex-col studio-canvas text-zinc-100 relative selection:bg-indigo-500 selection:text-white">
      {/* Studio Ambient Atmospheric Light Glows */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[380px] bg-indigo-500/[0.08] blur-[140px] rounded-full -z-10" />
      <div className="pointer-events-none fixed top-1/3 -right-24 w-[500px] h-[350px] bg-violet-600/[0.05] blur-[120px] rounded-full -z-10" />
      <div className="pointer-events-none fixed bottom-10 -left-20 w-[500px] h-[350px] bg-cyan-600/[0.04] blur-[120px] rounded-full -z-10" />
      
      {/* Global Studio Navbar */}
      <Navbar
        isConnected={isConnected}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        hasCustomApiKey={!!customApiKey}
        isCreatorPortalOpen={isCreatorPortalOpen}
        onToggleCreatorPortal={() => setIsCreatorPortalOpen(!isCreatorPortalOpen)}
        canToggleCreator={viewState === 'LOBBY_SELECT'}
        onOpenLibrary={() => setIsLibraryOpen(true)}
      />

      {/* Modern Studio Notification Banner */}
      {notification && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-xs font-medium shadow-2xl backdrop-blur-xl border transition-all animate-fade-in flex items-center gap-2 ${
          notification.isError
            ? 'bg-red-950/80 border-red-500/40 text-red-200 shadow-red-950/50'
            : 'bg-zinc-900/90 border-white/10 text-zinc-200 shadow-black/80'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${notification.isError ? 'bg-red-400' : 'bg-indigo-400'} animate-pulse`} />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Dynamic View Area */}
      <main className="flex-1 flex flex-col justify-center relative z-10 py-6 sm:py-8">
        {viewState === 'LOBBY_SELECT' && (
          isCreatorPortalOpen ? (
            <CreatorPortal
              onQuizCreated={handlePdfQuizCreated}
              customApiKey={customApiKey}
              currentSocketId={currentSocketId}
              onCancel={() => setIsCreatorPortalOpen(false)}
            />
          ) : (
            <LobbyCreation
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              isConnecting={!isConnected}
              onOpenCreatorPortal={() => setIsCreatorPortalOpen(true)}
              onOpenLibrary={() => setIsLibraryOpen(true)}
            />
          )
        )}

        {viewState === 'LOBBY_WAITING' && roomData && (
          <WaitingLobby
            room={roomData}
            currentSocketId={currentSocketId}
            onStartQuiz={handleStartQuiz}
            onToggleReady={handleToggleReady}
            onKickPlayer={handleKickPlayer}
            isGenerating={isGenerating}
          />
        )}

        {viewState === 'QUIZ_ROUND' && currentQuestion && (
          <QuizArena
            questionData={currentQuestion}
            roundStatus={roundStatus}
            answerRevealData={answerRevealData}
            transitionSecondsRemaining={transitionSecondsRemaining}
            onSubmitAnswer={handleSubmitAnswer}
            answerResult={answerResult}
            leaderboard={liveLeaderboard}
            currentSocketId={currentSocketId}
            serverAuthoritativeTime={serverAuthoritativeTime}
            isHost={isHost}
            isTimerPaused={isTimerPaused}
            onPauseTimer={handlePauseTimer}
            onResumeTimer={handleResumeTimer}
            onSkipQuestion={handleSkipQuestion}
            onSendReaction={handleSendReaction}
            incomingReaction={incomingReaction}
            isEliminated={myPlayer?.isEliminated || false}
            onNextQuestion={handleNextQuestion}
          />
        )}

        {viewState === 'ROUND_RECAP' && roundRecapData && (
          <RoundRecap
            roundData={roundRecapData}
            currentSocketId={currentSocketId}
            lastQuestion={currentQuestion}
            lastAnswerResult={answerResult}
          />
        )}

        {viewState === 'GAME_OVER' && gameOverData && (
          <FinalLeaderboard
            gameOverData={gameOverData}
            currentSocketId={currentSocketId}
            isHost={isHost}
            onPlayAgain={handlePlayAgain}
            onLeaveGame={handleLeaveGame}
          />
        )}
      </main>

      {/* Synchronized Countdown Overlay */}
      {countdownNumber !== null && (
        <CountdownOverlay count={countdownNumber} />
      )}

      {/* Optional Gemini API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        currentKey={customApiKey}
        onSaveKey={handleSaveApiKey}
      />

      {/* Quiz Library & Question Bank Modal */}
      <QuizLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onLaunchQuiz={handleLibraryQuizLaunch}
      />

      {/* Sleek Studio Footer */}
      <footer className="w-full py-4 px-6 flex items-center justify-between text-[11px] text-zinc-500 border-t border-white/[0.06] bg-[#08090d]/60 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/70" />
          <span className="font-medium text-zinc-400">QuizVerse AI Studio</span>
          <span className="hidden sm:inline text-zinc-600">• Real-Time Multiplayer Engine</span>
        </div>
        <div className="flex items-center gap-4 text-zinc-400">
          <span className="font-mono text-[10px] text-zinc-500">v2.4 Linear Edition</span>
        </div>
      </footer>

    </div>
  );
}

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
import { sounds } from './utils/soundEffects';

export default function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [currentSocketId, setCurrentSocketId] = useState(null);

  // App View State: 'LOBBY_SELECT' | 'LOBBY_WAITING' | 'QUIZ_ROUND' | 'ROUND_RECAP' | 'GAME_OVER'
  const [viewState, setViewState] = useState('LOBBY_SELECT');
  const [isCreatorPortalOpen, setIsCreatorPortalOpen] = useState(false);

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
      setViewState('LOBBY_WAITING');
      setRoundStatus('WAITING_FOR_PLAYERS');
    }

    function onError({ message }) {
      showNotification(message, true);
      setIsGenerating(false);
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

    // Claim host socket connection
    socket.emit('claim_preloaded_host', {
      roomCode,
      username: hostName,
      avatarSeed
    });

    setRoomData(room);
    setLiveLeaderboard(room?.players || []);
    setViewState('LOBBY_WAITING');
    setRoundStatus('WAITING_FOR_PLAYERS');
    setIsCreatorPortalOpen(false);
    showNotification(`Curriculum quiz ready with ${questions.length} questions! Awaiting players in lobby.`);
  };

  const handleStartQuiz = () => {
    if (!roomData) return;
    // Emits start_game (with server handling both start_game and start_quiz)
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

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 relative selection:bg-zinc-800 selection:text-zinc-100">
      
      {/* Global Navbar */}
      <Navbar
        isConnected={isConnected}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        hasCustomApiKey={!!customApiKey}
        isCreatorPortalOpen={isCreatorPortalOpen}
        onToggleCreatorPortal={() => setIsCreatorPortalOpen(!isCreatorPortalOpen)}
        canToggleCreator={viewState === 'LOBBY_SELECT'}
      />

      {/* Subtle notification banner */}
      {notification && (
        <div className={`fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium shadow-lg backdrop-blur-md transition-all ${
          notification.isError
            ? 'bg-zinc-900 border border-zinc-700 text-zinc-200'
            : 'bg-zinc-900 border border-zinc-700 text-zinc-300'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Main Dynamic View Area */}
      <main className="flex-1 flex flex-col justify-center">
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
            />
          )
        )}

        {viewState === 'LOBBY_WAITING' && roomData && (
          <WaitingLobby
            room={roomData}
            currentSocketId={currentSocketId}
            onStartQuiz={handleStartQuiz}
            onToggleReady={handleToggleReady}
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
            isHost={roomData?.hostSocketId === currentSocketId}
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

      {/* Minimal Footer */}
      <footer className="w-full py-4 text-center text-xs text-zinc-500 border-t border-zinc-900">
        QuizVerse • Real-Time AI Multiplayer Quiz Arena
      </footer>

    </div>
  );
}

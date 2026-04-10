import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Terminal, Bomb } from 'lucide-react';

const COLS = 10;
const ROWS = 20;

const COLORS = {
  I: '#00f0f0', J: '#0000f0', L: '#f0a000', O: '#f0f000',
  S: '#00f000', T: '#a000f0', Z: '#f00000',
};

const SHAPES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
};

const RANDOM_TETROMINO = () => {
  const keys = Object.keys(SHAPES);
  return keys[Math.floor(Math.random() * keys.length)];
};

const TerminalLog = ({ logs }) => (
  <div className="flex flex-col gap-1 font-mono text-[9px] leading-none uppercase">
    {logs.map((log, i) => (
      <div key={i} className={`flex gap-2 ${log.type === 'error' ? 'text-rose-500' : log.type === 'success' ? 'text-cyan-400' : log.type === 'warning' ? 'text-amber-400' : 'text-white/40'}`}>
        <span className="shrink-0">[{new Date(log.time).toLocaleTimeString().split(' ')[0]}]</span>
        <span className="truncate">{log.msg}</span>
      </div>
    ))}
  </div>
);

const App = () => {
  const [grid, setGrid] = useState(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
  const [activePiece, setActivePiece] = useState(null);
  const [nextPiece, setNextPiece] = useState(RANDOM_TETROMINO());
  const [linesCleared, setLinesCleared] = useState(0);
  const [score, setScore] = useState(0); 
  const [level, setLevel] = useState(1);
  const [bombs, setBombs] = useState(1);
  const [combo, setCombo] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameClear, setGameClear] = useState(false);
  const [isExtraStage, setIsExtraStage] = useState(false);
  const [isPaused, setIsPaused] = useState(false); 
  const [particles, setParticles] = useState([]);
  const [flashes, setFlashes] = useState([]);
  const [feedback, setFeedback] = useState(null); 
  const [isShaking, setIsShaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [logs, setLogs] = useState([
    { msg: "CITY PROTOCOL v2.3 ONLINE", type: "success", time: Date.now() },
    { msg: "AWAITING INPUT...", type: "info", time: Date.now() }
  ]);

  const audioCtx = useRef(null);
  const requestRef = useRef();
  const lastTimeRef = useRef(0);
  const dropCounterRef = useRef(0);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastMoveXRef = useRef(0); 
  const isSoftDropping = useRef(false);
  const beatCount = useRef(0);
  const lastBombScoreRef = useRef(0);
  const lastRepairScoreRef = useRef(0);

  const stateRef = useRef({ grid, activePiece, nextPiece, gameOver, gameClear, isExtraStage, turnCount, isPaused, level, isMuted, linesCleared, bombs, score, combo });
  useEffect(() => {
    stateRef.current = { grid, activePiece, nextPiece, gameOver, gameClear, isExtraStage, turnCount, isPaused, level, isMuted, linesCleared, bombs, score, combo };
  }, [grid, activePiece, nextPiece, gameOver, gameClear, isExtraStage, turnCount, isPaused, level, isMuted, linesCleared, bombs, score, combo]);

  const addLog = useCallback((msg, type = "info") => {
    setLogs(prev => [ { msg, type, time: Date.now() }, ...prev.slice(0, 4) ]);
  }, []);

  const initAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }
  };

  // City Pop Algorithm Music (Refined)
  const playAlgorithmicMusic = useCallback(() => {
    if (!audioCtx.current || stateRef.current.isMuted || stateRef.current.isPaused || stateRef.current.gameOver || (stateRef.current.gameClear && !stateRef.current.isExtraStage)) return;
    const ctx = audioCtx.current;
    const time = ctx.currentTime;
    const step = beatCount.current % 16;
    
    // Kick & Snare (Disco/Funk pattern)
    if (step === 0 || step === 8 || step === 11) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(70, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
      g.gain.setValueAtTime(0.2, time);
      g.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(time); osc.stop(time + 0.15);
    }
    
    if (step === 4 || step === 12) {
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1500, time);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.1, time);
      g.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      noise.connect(bp); bp.connect(g); g.connect(ctx.destination);
      noise.start(time);
    }

    // Cutting Guitar (High-Pass Noise)
    if (step % 2 !== 0 || step % 4 === 2) {
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(4000, time);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.04, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      noise.connect(hp); hp.connect(g); g.connect(ctx.destination);
      noise.start(time);
    }

    // Walking Bass (Octave Slap Style)
    const bassRoot = [55, 55, 65.41, 65.41, 73.42, 73.42, 82.41, 82.41];
    const bassNote = step % 2 === 0 ? bassRoot[Math.floor(step/2)] : bassRoot[Math.floor(step/2)] * 2;
    const bass = ctx.createOscillator();
    const bg = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    bass.type = 'square';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.15);
    bass.frequency.setValueAtTime(bassNote, time);
    bg.gain.setValueAtTime(0.06, time);
    bg.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    bass.connect(filter); filter.connect(bg); bg.connect(ctx.destination);
    bass.start(time); bass.stop(time + 0.15);

    // Mellow E.Piano with Syncopation
    if (step === 2 || step === 7 || step === 10) {
      const chords = [
        [261.63, 329.63, 392.00, 493.88], // CM7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [293.66, 349.23, 440.00, 523.25]  // Dm7
      ];
      const chord = chords[Math.floor(beatCount.current / 64) % chords.length] || chords[0];
      chord.forEach(f => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, time);
        g.gain.setValueAtTime(0.02, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(time); osc.stop(time + 0.5);
      });
    }

    beatCount.current++;
  }, []);

  const playSystemDownSound = useCallback(() => {
    if (!audioCtx.current || stateRef.current.isMuted) return;
    const ctx = audioCtx.current;
    const time = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(10, time + 2.0);
    g.gain.setValueAtTime(0.5, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 2.0);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(time); osc.stop(time + 2.0);
  }, []);

  const playCyberSFX = useCallback((type) => {
    if (stateRef.current.isMuted || !audioCtx.current) return;
    const ctx = audioCtx.current;
    const time = ctx.currentTime;
    
    if (type === 'gameClear') {
      const chords = [523.25, 659.25, 783.99, 1046.50]; 
      chords.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, time + i * 0.1);
        g.gain.setValueAtTime(0.1, time + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, time + i * 0.1 + 1.0);
        o.connect(g); g.connect(ctx.destination);
        o.start(time + i * 0.1); o.stop(time + i * 0.1 + 1.0);
      });
      return;
    }
    
    if (type === 'repair') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, time);
      osc.frequency.linearRampToValueAtTime(1760, time + 0.3);
      gain.gain.setValueAtTime(0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(time); osc.stop(time + 0.3);
      return;
    }

    if (type === 'shuffle') {
      for (let i = 0; i < 5; i++) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400 + Math.random()*600, time + i*0.05);
          osc.frequency.linearRampToValueAtTime(100, time + i*0.05 + 0.1);
          g.gain.setValueAtTime(0.1, time + i*0.05);
          g.gain.exponentialRampToValueAtTime(0.01, time + i*0.05 + 0.1);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(time + i*0.05); osc.stop(time + i*0.05 + 0.1);
      }
      return;
    }
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    if (type === 'bomb') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, time);
      osc.frequency.exponentialRampToValueAtTime(20, time + 1.0);
      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 1.0);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(time); osc.stop(time + 1.0);
    } else if (type === 'hardDrop') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, time);
      osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);
      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(time); osc.stop(time + 0.1);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'mega' ? 1200 : 880, time);
      osc.frequency.exponentialRampToValueAtTime(440, time + 0.15);
      gain.gain.setValueAtTime(0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(time); osc.stop(time + 0.15);
    }
  }, []);

  const createPiece = useCallback((type) => {
    if (!type || !SHAPES[type]) return null;
    return {
      type, 
      shape: SHAPES[type],
      pos: { x: Math.floor(COLS / 2) - (type === 'O' ? 1 : 2), y: 0 },
      color: COLORS[type]
    };
  }, []);

  const checkCollision = useCallback((piece, pos, shape, customGrid) => {
    const s = shape || (piece ? piece.shape : null);
    if (!s || !Array.isArray(s)) return false;
    const p = pos || (piece ? piece.pos : { x: 0, y: 0 });
    const currentGrid = customGrid || stateRef.current.grid;
    for (let y = 0; y < s.length; y++) {
      for (let x = 0; x < s[y].length; x++) {
        if (s[y][x] !== 0) {
          const nextX = p.x + x;
          const nextY = p.y + y;
          if (nextX < 0 || nextX >= COLS || nextY >= ROWS) return true;
          if (nextY >= 0 && currentGrid[nextY] && currentGrid[nextY][nextX] !== 0) return true;
        }
      }
    }
    return false;
  }, []);

  const rotate = (matrix) => matrix[0].map((_, index) => matrix.map(col => col[index]).reverse());

  const spawnParticles = useCallback((rowIndices, currentGrid) => {
    const newParticles = [];
    rowIndices.forEach(y => {
      for (let x = 0; x < COLS; x++) {
        for (let i = 0; i < 4; i++) {
          newParticles.push({
            id: Math.random(),
            x: x * 10 + 5,
            y: y * 5 + 2.5,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            color: currentGrid[y][x] || '#ffffff',
            life: 1.0
          });
        }
      }
    });
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  const shuffleGrid = (gridToShuffle) => {
    const emptyRows = gridToShuffle.filter(row => row.every(cell => cell === 0));
    let filledRows = gridToShuffle.filter(row => row.some(cell => cell !== 0));
    
    // 行内のセルをシャッフル
    filledRows = filledRows.map(row => {
        const newRow = [...row];
        for (let i = newRow.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newRow[i], newRow[j]] = [newRow[j], newRow[i]];
        }
        return newRow;
    });
    
    // 行の順序をシャッフル
    for (let i = filledRows.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filledRows[i], filledRows[j]] = [filledRows[j], filledRows[i]];
    }
    
    return [...emptyRows, ...filledRows];
  };

  const lockPiece = useCallback(() => {
    const { grid: currentGrid, activePiece: piece, level: currentLevel, linesCleared: currentLines, score: currentScore, bombs: currentBombs, combo: currentCombo, nextPiece: nPieceType, isExtraStage, turnCount } = stateRef.current;
    if (!piece) return;

    const newGrid = currentGrid.map(row => [...row]);
    piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const gridY = piece.pos.y + y;
          const gridX = piece.pos.x + x;
          if (gridY >= 0 && gridY < ROWS) newGrid[gridY][gridX] = piece.color;
        }
      });
    });

    const rowsToClear = [];
    newGrid.forEach((row, y) => { if (row.every(cell => cell !== 0)) rowsToClear.push(y); });
    
    let finalGrid = newGrid;

    if (rowsToClear.length > 0) {
      const newCombo = currentCombo + 1;
      setCombo(newCombo);
      const isMega = rowsToClear.length >= 4;

      spawnParticles(rowsToClear, newGrid);
      const filteredGrid = newGrid.filter((_, y) => !rowsToClear.includes(y));
      while (filteredGrid.length < ROWS) filteredGrid.unshift(Array(COLS).fill(0));
      finalGrid = filteredGrid;
      
      const newTotalLines = currentLines + rowsToClear.length;
      setLinesCleared(newTotalLines);
      
      const linePoints = [0, 100, 300, 500, 800];
      const addedPoints = (linePoints[rowsToClear.length] || 0) * currentLevel * (1 + (newCombo - 1) * 0.5);
      const newScore = Math.floor(currentScore + addedPoints);
      setScore(newScore);

      setIsShaking(isMega ? 'heavy' : 'light');
      setTimeout(() => setIsShaking(false), 300);
      
      setFeedback({ text: newCombo > 1 ? `${newCombo} COMBO!` : isMega ? 'QUADRA!!' : 'NICE!!', type: isMega ? 'mega' : 'standard', id: Math.random() });
      addLog(newCombo > 1 ? `SYNC COMBO x${newCombo} ACTIVE` : isMega ? "QUAD SYNC SUCCESSFUL" : "LINE DECRYPTED", isMega ? "success" : "info");
      playCyberSFX(isMega ? 'mega' : 'standard');
      setTimeout(() => setFeedback(null), 1000);

      if (Math.floor(newScore / 2000) > Math.floor(lastBombScoreRef.current / 2000)) {
        if (currentBombs < 3) {
          setBombs(prev => prev + 1);
          addLog("BOMB MODULE ACTIVATED", "success");
        }
        lastBombScoreRef.current = newScore;
      }

      if (Math.floor(newScore / 3000) > Math.floor(lastRepairScoreRef.current / 3000)) {
        addLog("SYSTEM AUTO-REPAIR INITIATED", "warning");
        playCyberSFX('repair');
        lastRepairScoreRef.current = newScore;
        for (let y = ROWS - 1; y >= 0; y--) {
          if (finalGrid[y].some(c => c === 0) && finalGrid[y].some(c => c !== 0)) {
             finalGrid.splice(y, 1);
             finalGrid.unshift(Array(COLS).fill(0));
             addLog("BUG FIXED: LINE RESTORED", "success");
             break;
          }
        }
      }

      if (!isExtraStage) {
        const newLevel = Math.floor(newTotalLines / 10) + 1;
        if (newLevel > currentLevel) {
          setLevel(newLevel);
          if (newLevel >= 10) {
            setGameClear(true);
            playCyberSFX('gameClear');
            addLog("PROTOCOL COMPLETE: CITY RESTORED", "success");
          } else {
            setFeedback({ text: `PHASE ${newLevel}`, type: 'mega', id: Math.random() });
            addLog(`PHASE SHIFT: ${newLevel}`, "success");
            setTimeout(() => setFeedback(null), 1000);
          }
        }
      }
    } else {
      setCombo(0);
    }
    
    // EXTRA STAGE SHUFFLE LOGIC
    if (isExtraStage) {
      const nextTurn = turnCount + 1;
      setTurnCount(nextTurn);
      if (nextTurn % 3 === 0) {
        finalGrid = shuffleGrid(finalGrid);
        addLog("SYSTEM HACKED: SHUFFLE TIME!", "warning");
        playCyberSFX('shuffle');
        setFeedback({ text: 'SHUFFLE!!', type: 'mega', id: Math.random() });
        setTimeout(() => setFeedback(null), 1000);
      }
    }

    setGrid(finalGrid);

    if (stateRef.current.gameClear && !isExtraStage) return;

    const nextP = createPiece(nPieceType);
    if (!nextP || checkCollision(nextP, nextP.pos, nextP.shape, finalGrid)) {
      setGameOver(true);
      playSystemDownSound();
      addLog("GAME OVER: SYSTEM DOWN", "error");
      setActivePiece(null);
    } else {
      setActivePiece(nextP);
      setNextPiece(RANDOM_TETROMINO());
    }
  }, [createPiece, checkCollision, addLog, spawnParticles, playCyberSFX, playSystemDownSound]);

  const drop = useCallback(() => {
    const piece = stateRef.current.activePiece;
    if (!piece || stateRef.current.gameOver || (stateRef.current.gameClear && !stateRef.current.isExtraStage) || stateRef.current.isPaused) return;
    const newPos = { ...piece.pos, y: piece.pos.y + 1 };
    if (!checkCollision(piece, newPos)) {
      setActivePiece(prev => prev ? ({ ...prev, pos: newPos }) : null);
    } else {
      lockPiece();
    }
  }, [checkCollision, lockPiece]);

  const resetGame = useCallback((isExtra = false) => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
    setLinesCleared(0);
    setScore(0);
    setCombo(0);
    setTurnCount(0);
    setIsExtraStage(isExtra);
    lastBombScoreRef.current = 0;
    lastRepairScoreRef.current = 0;
    setLevel(isExtra ? 10 : 1);
    setBombs(isExtra ? 3 : 1);
    setGameOver(false);
    setGameClear(false);
    setIsPaused(false);
    setParticles([]);
    setFlashes([]);
    const firstType = RANDOM_TETROMINO();
    const nextType = RANDOM_TETROMINO();
    setActivePiece(createPiece(firstType));
    setNextPiece(nextType);
    addLog(isExtra ? "EXTRA STAGE INITIALIZED" : "SYSTEM REBOOT SUCCESSFUL", "success");
    lastTimeRef.current = performance.now();
    dropCounterRef.current = 0;
  }, [createPiece, addLog]);

  const useBomb = useCallback(() => {
    const { bombs: currentBombs, gameOver: isOver, gameClear: isClear, isExtraStage: extra, isPaused: paused, grid: currentGrid } = stateRef.current;
    if (currentBombs <= 0 || isOver || (isClear && !extra) || paused) return;
    setBombs(prev => prev - 1);
    addLog("CRITICAL: FULL SYSTEM DEFRAG", "error");
    playCyberSFX('bomb');
    setIsShaking('heavy');
    setTimeout(() => setIsShaking(false), 1000);
    
    setFeedback({ text: 'BOMB!!', type: 'mega', id: Math.random() });
    setTimeout(() => setFeedback(null), 1500);

    const newParticles = [];
    currentGrid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell !== 0) {
          for (let i = 0; i < 2; i++) {
            newParticles.push({
              id: Math.random(),
              x: x * 10 + 5,
              y: y * 5 + 2.5,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              color: cell,
              life: 1.0
            });
          }
        }
      });
    });
    setParticles(prev => [...prev, ...newParticles]);
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
  }, [addLog, playCyberSFX]);

  const handleMove = useCallback((dir) => {
    const piece = stateRef.current.activePiece;
    if (!piece || stateRef.current.gameOver || (stateRef.current.gameClear && !stateRef.current.isExtraStage) || stateRef.current.isPaused) return;
    const newPos = { ...piece.pos, x: piece.pos.x + dir };
    if (!checkCollision(piece, newPos)) setActivePiece(prev => prev ? ({ ...prev, pos: newPos }) : null);
  }, [checkCollision]);

  const handleRotate = useCallback(() => {
    const piece = stateRef.current.activePiece;
    if (!piece || stateRef.current.gameOver || (stateRef.current.gameClear && !stateRef.current.isExtraStage) || stateRef.current.isPaused) return;
    const newShape = rotate(piece.shape);
    if (!checkCollision(piece, piece.pos, newShape)) setActivePiece(prev => prev ? ({ ...prev, shape: newShape }) : null);
  }, [checkCollision]);

  const hardDrop = useCallback(() => {
    const piece = stateRef.current.activePiece;
    if (!piece || stateRef.current.gameOver || (stateRef.current.gameClear && !stateRef.current.isExtraStage) || stateRef.current.isPaused) return;
    let newY = piece.pos.y;
    while (!checkCollision(piece, { ...piece.pos, y: newY + 1 })) newY++;
    const flashId = Math.random();
    setFlashes(prev => [...prev, { id: flashId, x: piece.pos.x, width: piece.shape[0].length, color: piece.color }]);
    setTimeout(() => setFlashes(prev => prev.filter(f => f.id !== flashId)), 150);
    playCyberSFX('hardDrop');
    setActivePiece(prev => prev ? ({ ...prev, pos: { ...prev.pos, y: newY } }) : null);
    dropCounterRef.current = 10000;
  }, [checkCollision, playCyberSFX]);

  const animate = useCallback((time) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    if (!stateRef.current.isPaused && !stateRef.current.gameOver && (!stateRef.current.gameClear || stateRef.current.isExtraStage)) {
      dropCounterRef.current += deltaTime;
      const baseInterval = stateRef.current.isExtraStage ? 250 : Math.max(80, 800 - (stateRef.current.level - 1) * 80);
      const dropInterval = isSoftDropping.current ? 40 : baseInterval;
      
      const bgmSpeed = stateRef.current.isExtraStage ? 200 : 250;
      if (Math.floor(time / bgmSpeed) > Math.floor((time - deltaTime) / bgmSpeed)) {
        playAlgorithmicMusic();
      }
      if (dropCounterRef.current >= dropInterval) {
        drop();
        dropCounterRef.current = 0;
      }
    }
    setParticles(prev => prev.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.02 })).filter(p => p.life > 0));
    requestRef.current = requestAnimationFrame(animate);
  }, [drop, playAlgorithmicMusic]);

  useEffect(() => {
    if (!activePiece && !gameOver && (!gameClear || isExtraStage)) setActivePiece(createPiece(RANDOM_TETROMINO()));
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate, activePiece, gameOver, gameClear, isExtraStage, createPiece]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      initAudio();
      if (stateRef.current.gameOver || (stateRef.current.gameClear && !stateRef.current.isExtraStage)) {
        if (e.key === 'Enter') resetGame(false);
        return;
      }
      if (stateRef.current.isPaused && e.key.toLowerCase() !== 'p') return;
      switch (e.key) {
        case 'ArrowLeft': handleMove(-1); break;
        case 'ArrowRight': handleMove(1); break;
        case 'ArrowDown': drop(); break;
        case 'ArrowUp': handleRotate(); break;
        case 'b': case 'B': useBomb(); break;
        case ' ': e.preventDefault(); hardDrop(); break;
        case 'p': case 'P': setIsPaused(prev => !prev); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, handleRotate, drop, hardDrop, resetGame, useBomb]);

  const onTouchStart = (e) => {
    initAudio();
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    lastMoveXRef.current = touch.clientX; 
  };

  const onTouchMove = (e) => {
    if (stateRef.current.gameOver || (stateRef.current.gameClear && !stateRef.current.isExtraStage) || stateRef.current.isPaused) return;
    const touch = e.touches[0];
    const dx = touch.clientX - lastMoveXRef.current;
    const dy = touch.clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 30) { handleMove(dx > 0 ? 1 : -1); lastMoveXRef.current = touch.clientX; }
    isSoftDropping.current = dy > 60;
  };

  const onTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    isSoftDropping.current = false;
    if (dy < -60 && Math.abs(dx) < 60) hardDrop();
    else if (Math.abs(dx) < 20 && Math.abs(dy) < 20 && dt < 200) handleRotate();
  };

  const getNextPieceOffset = () => {
    if (!nextPiece || !SHAPES[nextPiece]) return { x: 0, y: 0 };
    const shape = SHAPES[nextPiece];
    const rows = shape.length, cols = shape[0].length;
    let minX = cols, maxX = 0, minY = rows, maxY = 0;
    shape.forEach((row, y) => row.forEach((v, x) => {
      if (v) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    }));
    return { x: (4 - (maxX - minX + 1)) / 2 - minX, y: (4 - (maxY - minY + 1)) / 2 - minY };
  };

  const nextOffset = getNextPieceOffset();

  return (
    <div className="fixed inset-0 bg-[#02020a] text-white font-sans overflow-hidden flex flex-col items-center select-none touch-none"
         onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      
      <style>{`
        @keyframes flicker { 0%, 19%, 21%, 62%, 64%, 100% { opacity: 1; text-shadow: 0 0 20px currentColor, 0 0 40px currentColor; } 20%, 63% { opacity: 0.4; text-shadow: none; } }
        @keyframes feedback-in { 0% { transform: scale(0.4) translateY(60px); opacity: 0; } 25% { transform: scale(1.2) translateY(0); opacity: 1; } 75% { transform: scale(1.1) translateY(-10px); opacity: 0.8; } 100% { transform: scale(1.5) translateY(-60px); opacity: 0; filter: blur(10px); } }
        @keyframes screen-shake-heavy { 0%, 100% { transform: translate(0, 0); } 10%, 50%, 90% { transform: translate(-4px, 2px); } 30%, 70% { transform: translate(4px, -2px); } }
        @keyframes glow-pulse { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.2; } }
        @keyframes flash-fade { 0% { opacity: 1; transform: scaleY(1); } 100% { opacity: 0; transform: scaleY(1.05); } }
        .animate-flicker { animation: flicker 3s linear infinite; }
        .animate-feedback { animation: feedback-in 0.8s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; }
        .shake-heavy { animation: screen-shake-heavy 0.1s infinite; }
        .glow-pulse { animation: glow-pulse 5s infinite ease-in-out; }
        .neon-border { box-shadow: 0 0 20px rgba(34, 211, 238, 0.2), inset 0 0 10px rgba(34, 211, 238, 0.1); }
        .neon-border-extra { box-shadow: 0 0 20px rgba(244, 63, 94, 0.2), inset 0 0 10px rgba(244, 63, 94, 0.1); }
        .animate-flash { animation: flash-fade 0.15s ease-out forwards; }
      `}</style>
      
      <div className="absolute inset-0 z-0 pointer-events-none transition-colors duration-1000">
        <div className={`absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[120px] glow-pulse ${isExtraStage ? 'bg-rose-600/10' : 'bg-cyan-600/5'}`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full blur-[120px] glow-pulse ${isExtraStage ? 'bg-orange-600/10' : 'bg-blue-600/5'}`} style={{ animationDelay: '2s' }} />
      </div>

      <header className="relative z-50 w-full max-w-md px-6 pt-8 pb-2 flex justify-between items-center">
        <h1 className={`text-2xl font-black italic tracking-tighter bg-clip-text text-transparent uppercase leading-none animate-flicker ${isExtraStage ? 'bg-gradient-to-r from-rose-400 to-orange-500' : 'bg-gradient-to-r from-cyan-400 to-indigo-500'}`}>
          NEOTETRA{isExtraStage ? ' : EXTRA' : ''}
        </h1>
        <div className="flex gap-1.5">
          <button onClick={() => setIsMuted(!isMuted)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
            {isMuted ? <VolumeX size={16} className="text-rose-500" /> : <Volume2 size={16} className="text-cyan-400" />}
          </button>
          <button onClick={() => { initAudio(); setIsPaused(!isPaused); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
            {isPaused ? <Play size={16} className="text-cyan-400 fill-cyan-400/20" /> : <Pause size={16} />}
          </button>
          <button onClick={() => resetGame(isExtraStage)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      <main className="relative z-10 w-full max-w-md flex-1 flex flex-col px-4 pb-4 gap-3 overflow-hidden">
        <div className="flex gap-3 h-16">
          <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl p-2 backdrop-blur-md flex flex-col items-center justify-center">
            <span className="text-[8px] font-black tracking-[0.2em] uppercase opacity-40 mb-1">Bombs</span>
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} onClick={useBomb} className={`transition-all duration-300 ${i < bombs ? 'opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)] cursor-pointer' : 'opacity-10'}`}>
                  <Bomb size={18} className={i < bombs ? 'text-rose-500 fill-rose-500/20' : 'text-white'} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl p-2 backdrop-blur-md flex flex-col items-center justify-center">
             <span className="text-[8px] font-black tracking-[0.2em] uppercase opacity-40 mb-1">Next</span>
             <div className="relative w-10 h-10 transform scale-75">
                {nextPiece && SHAPES[nextPiece].map((row, y) => row.map((val, x) => (
                  val ? <div key={`${x}-${y}`} className="absolute rounded-[2px]" style={{ left: `${(nextOffset.x + x) * 25}%`, top: `${(nextOffset.y + y) * 25}%`, width: '25%', height: '25%', backgroundColor: COLORS[nextPiece], boxShadow: `0 0 10px ${COLORS[nextPiece]}88` }} /> : null
                )))}
             </div>
          </div>
        </div>

        <div className={`flex-1 relative bg-[#020208]/90 backdrop-blur-3xl rounded-[32px] border border-white/10 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)] ${isExtraStage ? 'neon-border-extra' : 'neon-border'} ${isShaking === 'heavy' ? 'shake-heavy' : ''}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,240,0.05)_0%,transparent_70%)] pointer-events-none" />
          <div className="absolute inset-4 opacity-[0.03] pointer-events-none grid grid-cols-10 grid-rows-20 gap-0 border border-white/20">
            {[...Array(200)].map((_, i) => <div key={i} className="border-[0.5px] border-white/20" />)}
          </div>
          <div className="absolute inset-4">
            {grid.map((row, y) => row.map((cell, x) => (
              cell !== 0 && <div key={`c-${x}-${y}`} className="absolute rounded-[4px] transition-all duration-300" style={{ left: `${x * 10}%`, top: `${y * 5}%`, width: '10%', height: '5%', backgroundColor: cell, border: '1px solid rgba(255,255,255,0.1)', boxShadow: `inset 0 0 8px rgba(0,0,0,0.5), 0 0 12px ${cell}44` }} />
            )))}
            {flashes.map(f => (
              <div key={f.id} className="absolute top-0 bottom-0 z-10 animate-flash pointer-events-none" style={{
                left: `${f.x * 10}%`, width: `${f.width * 10}%`,
                background: `linear-gradient(to bottom, transparent, ${f.color}88, #ffffff)`
              }} />
            ))}
            {activePiece && activePiece.shape && activePiece.shape.map((row, y) => row.map((val, x) => (
              val ? <div key={`a-${x}-${y}`} className="absolute rounded-[4px] z-20" style={{ left: `${(activePiece.pos.x + x) * 10}%`, top: `${(activePiece.pos.y + y) * 5}%`, width: '10%', height: '5%', backgroundColor: activePiece.color, border: '1px solid rgba(255,255,255,0.3)', boxShadow: `0 0 25px ${activePiece.color}cc` }} /> : null
            )))}
            {particles.map(p => <div key={p.id} className="absolute rounded-full z-30 pointer-events-none" style={{ left: `${p.x}%`, top: `${p.y}%`, width: '4px', height: '4px', backgroundColor: p.color, opacity: p.life, transform: `scale(${p.life * 2.5})` }} />)}
            {feedback && (
              <div className="absolute inset-0 flex items-center justify-center z-[60] pointer-events-none">
                <div className="animate-feedback" key={feedback.id}>
                  <span className={`text-6xl font-black italic tracking-tighter font-mono ${feedback.type === 'mega' ? 'text-rose-500 drop-shadow-[0_0_20px_#f43f5e]' : 'text-cyan-400 drop-shadow-[0_0_20px_#22d3ee]'}`}>{feedback.text}</span>
                </div>
              </div>
            )}
          </div>

          {gameClear && !isExtraStage && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-cyan-950/90 backdrop-blur-2xl animate-in fade-in duration-500">
              <div className="flex flex-col items-center w-full max-w-xs text-center border-4 border-cyan-400/30 p-6 rounded-3xl bg-black/50">
                <h2 className="text-4xl font-black italic mb-2 text-cyan-400 uppercase drop-shadow-[0_0_20px_#22d3ee] tracking-tighter">CITY RESTORED</h2>
                <p className="text-[10px] text-cyan-200/60 mb-8 tracking-[0.2em] uppercase font-bold">Protocol Success: System Stable</p>
                <div className="grid grid-cols-2 gap-8 w-full mb-10 font-mono">
                  <div className="flex flex-col"><span className="text-[8px] uppercase tracking-widest opacity-40 mb-1">Final Score</span><span className="text-white text-2xl font-black">{score.toLocaleString()}</span></div>
                  <div className="flex flex-col"><span className="text-[8px] uppercase tracking-widest opacity-40 mb-1">Nodes</span><span className="text-white text-2xl font-black">{linesCleared}</span></div>
                </div>
                <div className="flex flex-col gap-3 w-full">
                  <button onClick={() => resetGame(false)} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-black tracking-[0.3em] rounded-xl active:scale-95 transition-all shadow-[0_15px_40px_rgba(34,211,238,0.4)]">REPLAY</button>
                  <button onClick={() => resetGame(true)} className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white text-sm font-black tracking-[0.3em] rounded-xl active:scale-95 transition-all shadow-[0_15px_40px_rgba(244,63,94,0.4)]">EXTRA STAGE</button>
                </div>
              </div>
            </div>
          )}

          {gameOver && (!gameClear || isExtraStage) && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
              <div className="flex flex-col items-center w-full max-w-xs text-center">
                <h2 className="text-4xl font-black italic mb-10 text-rose-500 uppercase drop-shadow-[0_0_20px_#f43f5e] tracking-tighter">GAME OVER</h2>
                <div className="grid grid-cols-2 gap-8 w-full mb-12 font-mono">
                  <div className="flex flex-col"><span className="text-[8px] uppercase tracking-widest opacity-40 mb-1">Final Score</span><span className="text-white text-2xl font-black">{score.toLocaleString()}</span></div>
                  <div className="flex flex-col"><span className="text-[8px] uppercase tracking-widest opacity-40 mb-1">Max Phase</span><span className="text-white text-2xl font-black">{level}</span></div>
                </div>
                <button onClick={() => resetGame(false)} className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white text-lg font-black tracking-[0.3em] rounded-2xl active:scale-95 transition-all shadow-[0_15px_40px_rgba(244,63,94,0.4)]">RETRY</button>
              </div>
            </div>
          )}

          {isPaused && !gameOver && (!gameClear || isExtraStage) && (
            <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl">
              <button onClick={() => setIsPaused(false)} className="w-24 h-24 flex items-center justify-center rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 active:scale-90 transition-all">
                <Play size={48} fill="currentColor" />
              </button>
              <span className="mt-6 text-[10px] font-black tracking-[0.6em] text-cyan-400/50 uppercase">PAUSED</span>
            </div>
          )}
        </div>

        <div className="h-28 w-full relative bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex gap-4 backdrop-blur-md overflow-hidden">
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            <div className="flex items-center gap-2 text-[8px] font-black tracking-[0.2em] text-cyan-500/50 uppercase">
              <Terminal size={10} /><span>Console_Output</span>
            </div>
            <div className="flex-1 overflow-hidden border-t border-white/5 pt-2">
              <TerminalLog logs={logs} />
            </div>
          </div>
          <div className="flex flex-col gap-3 pl-4 border-l border-white/5 min-w-[100px] justify-center">
            <div className="flex flex-col items-end"><span className="text-[8px] font-black uppercase opacity-20 mb-0.5 tracking-widest">Score</span><span className="text-lg font-mono text-white leading-none tracking-tighter font-black">{score.toLocaleString()}</span></div>
            <div className="flex flex-col items-end"><span className="text-[8px] font-black uppercase opacity-20 mb-0.5 tracking-widest">{isExtraStage ? 'Turn' : 'Phase'}</span><span className={`text-lg font-mono leading-none font-black ${isExtraStage ? 'text-rose-400' : 'text-cyan-400'}`}>{isExtraStage ? turnCount : level}</span></div>
            {combo > 1 && (
              <div className="flex flex-col items-end animate-pulse mt-1"><span className="text-[8px] font-black uppercase text-pink-500 mb-0.5 tracking-widest">Combo</span><span className="text-sm font-mono text-pink-400 leading-none font-black">x{combo}</span></div>
            )}
          </div>
        </div>
      </main>

      <footer className="w-full max-w-md px-6 pb-6 pt-2">
        <div className="flex justify-between items-center text-[7px] font-mono opacity-20 uppercase tracking-[0.4em]">
          <span>© 2026 Phantom Labs</span>
          <span>v2.3.0-ELITE</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
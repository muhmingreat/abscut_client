
import { useEffect, useRef, useState } from "react";
import "./TicTacToe.css";

/* =========================================
   GAME CONSTANTS
========================================= */

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/* =========================================
   GAME HELPERS
========================================= */

function getWinner(board) {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;

    if (
      board[a] &&
      board[a] === board[b] &&
      board[a] === board[c]
    ) {
      return {
        symbol: board[a],
        line,
      };
    }
  }

  return null;
}

function getAvailableMoves(board) {
  return board
    .map((cell, index) => (cell === null ? index : null))
    .filter((index) => index !== null);
}

function findImmediateMove(board, symbol) {
  for (const index of getAvailableMoves(board)) {
    const nextBoard = [...board];
    nextBoard[index] = symbol;

    if (getWinner(nextBoard)) {
      return index;
    }
  }

  return null;
}

/* =========================================
   MINIMAX - HARD MODE
========================================= */

function minimax(board, isComputerTurn, depth = 0) {
  const winner = getWinner(board);

  if (winner?.symbol === "O") {
    return 10 - depth;
  }

  if (winner?.symbol === "X") {
    return depth - 10;
  }

  const availableMoves = getAvailableMoves(board);

  if (availableMoves.length === 0) {
    return 0;
  }

  if (isComputerTurn) {
    let bestScore = -Infinity;

    for (const index of availableMoves) {
      const nextBoard = [...board];
      nextBoard[index] = "O";

      const score = minimax(nextBoard, false, depth + 1);
      bestScore = Math.max(bestScore, score);
    }

    return bestScore;
  }

  let bestScore = Infinity;

  for (const index of availableMoves) {
    const nextBoard = [...board];
    nextBoard[index] = "X";

    const score = minimax(nextBoard, true, depth + 1);
    bestScore = Math.min(bestScore, score);
  }

  return bestScore;
}

/* =========================================
   COMPUTER MOVE
========================================= */

function chooseComputerMove(board, difficulty) {
  const availableMoves = getAvailableMoves(board);

  if (availableMoves.length === 0) {
    return null;
  }

  // EASY: Random valid move
  if (difficulty === "easy") {
    return availableMoves[
      Math.floor(Math.random() * availableMoves.length)
    ];
  }

  // MEDIUM: Win, block, take centre, or play randomly
  if (difficulty === "medium") {
    const winningMove = findImmediateMove(board, "O");

    if (winningMove !== null) {
      return winningMove;
    }

    const blockingMove = findImmediateMove(board, "X");

    if (blockingMove !== null) {
      return blockingMove;
    }

    if (board[4] === null) {
      return 4;
    }

    return availableMoves[
      Math.floor(Math.random() * availableMoves.length)
    ];
  }

  // HARD: Optimal minimax strategy
  let bestMove = null;
  let bestScore = -Infinity;

  for (const index of availableMoves) {
    const nextBoard = [...board];
    nextBoard[index] = "O";

    const score = minimax(nextBoard, false);

    if (score > bestScore) {
      bestScore = score;
      bestMove = index;
    }
  }

  return bestMove;
}

/* =========================================
   MAIN COMPONENT
========================================= */

function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [difficulty, setDifficulty] = useState("medium");
  const [playerTurn, setPlayerTurn] = useState(true);

  const [scores, setScores] = useState({
    player: 0,
    computer: 0,
    draw: 0,
  });

  const [result, setResult] = useState(null);

  const computerTimer = useRef(null);

  const winner = getWinner(board);
  const isDraw = !winner && board.every(Boolean);

  /* =========================================
     ROUND RESULT
  ========================================= */

  const finishRound = (outcome) => {
    setResult(outcome);

    setScores((current) => ({
      ...current,
      [outcome]: current[outcome] + 1,
    }));
  };

  /* =========================================
     PLAYER MOVE
  ========================================= */

  const handlePlayerMove = (index) => {
    if (
      !playerTurn ||
      result ||
      board[index] !== null
    ) {
      return;
    }

    const nextBoard = [...board];
    nextBoard[index] = "X";

    setBoard(nextBoard);

    const gameWinner = getWinner(nextBoard);

    if (gameWinner) {
      finishRound("player");
      return;
    }

    if (nextBoard.every(Boolean)) {
      finishRound("draw");
      return;
    }

    setPlayerTurn(false);
  };

  /* =========================================
     COMPUTER TURN
  ========================================= */

  useEffect(() => {
    if (playerTurn || result) {
      return;
    }

    computerTimer.current = setTimeout(() => {
      const move = chooseComputerMove(board, difficulty);

      if (move === null) {
        return;
      }

      const nextBoard = [...board];
      nextBoard[move] = "O";

      setBoard(nextBoard);

      const gameWinner = getWinner(nextBoard);

      if (gameWinner) {
        finishRound("computer");
        return;
      }

      if (nextBoard.every(Boolean)) {
        finishRound("draw");
        return;
      }

      setPlayerTurn(true);
    }, 550);

    return () => {
      clearTimeout(computerTimer.current);
    };
  }, [board, difficulty, playerTurn, result]);

  /* =========================================
     RESET CONTROLS
  ========================================= */

  const startNewRound = () => {
    clearTimeout(computerTimer.current);

    setBoard(Array(9).fill(null));
    setResult(null);
    setPlayerTurn(true);
  };

  const resetScores = () => {
    startNewRound();

    setScores({
      player: 0,
      computer: 0,
      draw: 0,
    });
  };

  const handleDifficultyChange = (event) => {
    setDifficulty(event.target.value);
    startNewRound();
  };

  /* =========================================
     STATUS
  ========================================= */

  const getStatus = () => {
    if (result === "player") {
      return "You won this round!";
    }

    if (result === "computer") {
      return "Computer wins this round.";
    }

    if (result === "draw") {
      return "It's a draw!";
    }

    if (!playerTurn) {
      return "Computer is thinking...";
    }

    return "Your turn — make your move.";
  };

  return (
    <main className="tic-tac-toe-page">
      <div className="tic-tac-toe-container">

        {/* HEADER */}

        <header className="tic-header">
          <span className="tic-eyebrow">
            ABS CUT PLAY
          </span>

          <h1>
            Tic-Tac-<span>Toe</span>
          </h1>

          <p>
            Challenge the computer and see how many rounds
            you can win.
          </p>
        </header>

        {/* SCOREBOARD */}

        <section className="tic-scoreboard">

          <div className="tic-score-card player-score">
            <span className="tic-score-symbol">X</span>
            <span className="tic-score-label">YOU</span>
            <strong>{scores.player}</strong>
          </div>

          <div className="tic-score-card draw-score">
            <span className="tic-score-symbol">=</span>
            <span className="tic-score-label">DRAWS</span>
            <strong>{scores.draw}</strong>
          </div>

          <div className="tic-score-card computer-score">
            <span className="tic-score-symbol">O</span>
            <span className="tic-score-label">COMPUTER</span>
            <strong>{scores.computer}</strong>
          </div>

        </section>

        {/* GAME PANEL */}

        <section className="tic-game-panel">

          <div className="tic-game-toolbar">

            <div>
              <label htmlFor="tic-difficulty">
                Difficulty
              </label>

              <select
                id="tic-difficulty"
                value={difficulty}
                onChange={handleDifficultyChange}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <span className="tic-player-info">
              You: <strong>X</strong>
              <span> · </span>
              Computer: <strong>O</strong>
            </span>

          </div>

          {/* STATUS */}

          <div
            className={`tic-status ${
              result ? `tic-status-${result}` : ""
            }`}
            aria-live="polite"
          >
            <span className="tic-status-dot" />
            {getStatus()}
          </div>

          {/* BOARD */}

          <div className="tic-board">

            {board.map((cell, index) => {
              const isWinningCell =
                winner?.line.includes(index);

              return (
                <button
                  key={index}
                  type="button"
                  className={[
                    "tic-cell",
                    cell ? `tic-cell-${cell.toLowerCase()}` : "",
                    isWinningCell ? "tic-cell-winning" : "",
                  ].join(" ")}
                  onClick={() => handlePlayerMove(index)}
                  disabled={
                    Boolean(cell) ||
                    !playerTurn ||
                    Boolean(result)
                  }
                  aria-label={
                    `Cell ${index + 1}: ${
                      cell || "empty"
                    }`
                  }
                >
                  {cell && (
                    <span className="tic-cell-mark">
                      {cell}
                    </span>
                  )}
                </button>
              );
            })}

          </div>

          {/* GAME ACTIONS */}

          <div className="tic-actions">

            <button
              type="button"
              className="tic-new-round"
              onClick={startNewRound}
            >
              New Round
            </button>

            <button
              type="button"
              className="tic-reset-scores"
              onClick={resetScores}
            >
              Reset Scores
            </button>

          </div>

        </section>

        {/* GAME GUIDE */}

        <section className="tic-instructions">
          <h2>How to Play</h2>

          <div className="tic-instruction-grid">

            <div>
              <span>01</span>
              <p>You play as X. The computer plays as O.</p>
            </div>

            <div>
              <span>02</span>
              <p>Take turns placing your mark in an empty cell.</p>
            </div>

            <div>
              <span>03</span>
              <p>Get three marks in a row to win.</p>
            </div>

          </div>

          <p className="tic-hard-note">
            Hard mode uses an optimal strategy. Against
            perfect play, the computer will not lose.
          </p>
        </section>

      </div>
    </main>
  );
}

export default TicTacToe;


import { useCallback, useEffect, useRef, useState } from "react";
import "./StyleRunner.css";

const GAME_WIDTH = 900;
const GAME_HEIGHT = 380;
const GROUND_Y = 320;

const PLAYER = {
  x: 105,
  width: 38,
  height: 58,
};

const GRAVITY = 0.75;
const JUMP_POWER = -14;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createObstacle() {
  const height = randomBetween(35, 65);
  const width = randomBetween(25, 42);

  return {
    x: GAME_WIDTH + 30,
    y: GROUND_Y - height,
    width,
    height,
  };
}

function createToken() {
  return {
    x: GAME_WIDTH + 30,
    y: randomBetween(190, 265),
    radius: 11,
    collected: false,
  };
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(
    x + width,
    y,
    x + width,
    y + radius
  );
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height
  );
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(
    x,
    y + height,
    x,
    y + height - radius
  );
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(
    x,
    y,
    x + radius,
    y
  );
  ctx.closePath();
}

function drawGame(ctx, game) {
  const { player, obstacles, tokens, distance, frame } = game;

  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Background
  const background = ctx.createLinearGradient(
    0,
    0,
    0,
    GAME_HEIGHT
  );

  background.addColorStop(0, "#f8f5ed");
  background.addColorStop(1, "#e8e4d7");

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Decorative background circles
  ctx.fillStyle = "rgba(201, 162, 39, 0.10)";

  for (let i = 0; i < 5; i++) {
    const x = ((i * 210 - distance * 0.15) % 1050 + 1050) % 1050;

    ctx.beginPath();
    ctx.arc(x, 75 + (i % 2) * 45, 30 + (i % 3) * 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground
  ctx.fillStyle = "#10251d";
  ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

  ctx.fillStyle = "#c9a227";
  ctx.fillRect(0, GROUND_Y, GAME_WIDTH, 4);

  // Moving ground details
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";

  for (let i = 0; i < 15; i++) {
    const x =
      ((i * 85 - distance * 0.8) % (GAME_WIDTH + 85) + GAME_WIDTH + 85) %
      (GAME_WIDTH + 85);

    ctx.fillRect(x, GROUND_Y + 25, 35, 3);
  }

  // Tokens
  tokens.forEach((token) => {
    if (token.collected) return;

    ctx.beginPath();
    ctx.arc(token.x, token.y, token.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#c9a227";
    ctx.fill();

    ctx.strokeStyle = "#fff1bd";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#fff7dc";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("A", token.x, token.y + 1);
  });

  // Obstacles
  obstacles.forEach((obstacle) => {
    drawRoundedRect(
      ctx,
      obstacle.x,
      obstacle.y,
      obstacle.width,
      obstacle.height,
      7
    );

    ctx.fillStyle = "#9b6d22";
    ctx.fill();

    ctx.fillStyle = "#c9a227";
    ctx.fillRect(
      obstacle.x + 5,
      obstacle.y + 8,
      obstacle.width - 10,
      6
    );

    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(
      obstacle.x + 6,
      obstacle.y + 20,
      4,
      obstacle.height - 25
    );
  });

  // Player shadow
  ctx.beginPath();
  ctx.ellipse(
    PLAYER.x + 20,
    GROUND_Y + 2,
    24,
    5,
    0,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.fill();

  // Player body
  const runningOffset =
    player.onGround ? Math.sin(frame * 0.35) * 3 : 0;

  const playerY = player.y + runningOffset;

  drawRoundedRect(
    ctx,
    PLAYER.x,
    playerY + 18,
    PLAYER.width,
    36,
    10
  );

  ctx.fillStyle = "#0b3d2e";
  ctx.fill();

  // Gold jacket detail
  ctx.fillStyle = "#c9a227";
  ctx.fillRect(PLAYER.x + 17, playerY + 23, 4, 24);

  // Head
  ctx.beginPath();
  ctx.arc(
    PLAYER.x + 19,
    playerY + 10,
    12,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "#b77b4b";
  ctx.fill();

  // Hair
  ctx.beginPath();
  ctx.arc(
    PLAYER.x + 19,
    playerY + 5,
    12,
    Math.PI,
    Math.PI * 2
  );
  ctx.fillStyle = "#10251d";
  ctx.fill();

  // Shoes
  ctx.fillStyle = "#c9a227";

  drawRoundedRect(
    ctx,
    PLAYER.x - 2,
    playerY + 51,
    19,
    7,
    4
  );
  ctx.fill();

  drawRoundedRect(
    ctx,
    PLAYER.x + 20,
    playerY + 51,
    19,
    7,
    4
  );
  ctx.fill();
}

function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function StyleRunner() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const gameRef = useRef(null);

  const [gameStatus, setGameStatus] = useState("ready");
  const [score, setScore] = useState(0);
  const [tokensCollected, setTokensCollected] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return Number(localStorage.getItem("absStyleRunnerHighScore")) || 0;
    } catch {
      return 0;
    }
  });

  const resetGame = useCallback(() => {
    gameRef.current = {
      player: {
        y: GROUND_Y - PLAYER.height,
        velocityY: 0,
        onGround: true,
      },
      obstacles: [],
      tokens: [],
      distance: 0,
      frame: 0,
      score: 0,
      tokensCollected: 0,
      speed: 5,
      obstacleTimer: 0,
      tokenTimer: 0,
      lastTimestamp: 0,
    };

    setScore(0);
    setTokensCollected(0);
  }, []);

  const jump = useCallback(() => {
    const game = gameRef.current;

    if (
      gameStatus !== "running" ||
      !game ||
      !game.player.onGround
    ) {
      return;
    }

    game.player.velocityY = JUMP_POWER;
    game.player.onGround = false;
  }, [gameStatus]);

  const startGame = () => {
    resetGame();
    setGameStatus("running");
  };

  const pauseGame = () => {
    setGameStatus((current) =>
      current === "running" ? "paused" : current
    );
  };

  const resumeGame = () => {
    setGameStatus("running");
  };

//   const endGame = useCallback(() => {
//     const finalScore = Math.floor(gameRef.current?.score || 0);

//     setScore(finalScore);
//     setGameStatus("over");

//     setHighScore((current) => {
//       const nextHighScore = Math.max(current, finalScore);

//       try {
//         localStorage.setItem(
//           "absStyleRunnerHighScore",
//           String(nextHighScore)
//         );
//       } catch {
//         // The game still works if browser storage is unavailable.
//       }

//       return nextHighScore;
//     });
//   }, []);

const endGame = useCallback(() => {
  const finalScore = Math.floor(gameRef.current?.score || 0);

  setScore(finalScore);
  setTokensCollected(
    gameRef.current?.tokensCollected || 0
  );
  setGameStatus("over");

  setHighScore((current) => {
    const nextHighScore = Math.max(current, finalScore);

    try {
      localStorage.setItem(
        "absStyleRunnerHighScore",
        String(nextHighScore)
      );
    } catch {
      // Game remains playable without browser storage.
    }

    return nextHighScore;
  });
}, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.code === "Space" ||
        event.code === "ArrowUp" ||
        event.code === "KeyW"
      ) {
        event.preventDefault();
        jump();
      }

      if (
        event.code === "Escape" &&
        gameStatus === "running"
      ) {
        setGameStatus("paused");
      } else if (
        event.code === "Escape" &&
        gameStatus === "paused"
      ) {
        setGameStatus("running");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [jump, gameStatus]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    if (!gameRef.current) {
      resetGame();
    }

    let active = true;

    const loop = (timestamp) => {
      if (!active) return;

      const game = gameRef.current;

      if (!game) return;

      if (gameStatus === "running") {
        const delta = game.lastTimestamp
          ? Math.min((timestamp - game.lastTimestamp) / 16.67, 2)
          : 1;

        game.lastTimestamp = timestamp;
        game.frame += delta;
        game.distance += game.speed * delta;
        game.score += 0.12 * game.speed * delta;

        // Gradually increase game speed
        game.speed = Math.min(
          11,
          5 + game.score / 450
        );

        // Player physics
        game.player.velocityY += GRAVITY * delta;
        game.player.y += game.player.velocityY * delta;

        const groundPosition = GROUND_Y - PLAYER.height;

        if (game.player.y >= groundPosition) {
          game.player.y = groundPosition;
          game.player.velocityY = 0;
          game.player.onGround = true;
        }

        // Spawn obstacles
        game.obstacleTimer += delta;

        if (game.obstacleTimer > randomBetween(75, 115)) {
          game.obstacles.push(createObstacle());
          game.obstacleTimer = 0;
        }

        // Spawn tokens
        game.tokenTimer += delta;

        if (game.tokenTimer > 90) {
          game.tokens.push(createToken());
          game.tokenTimer = 0;
        }

        // Move obstacles
        game.obstacles.forEach((obstacle) => {
          obstacle.x -= game.speed * delta;
        });

        game.obstacles = game.obstacles.filter(
          (obstacle) =>
            obstacle.x + obstacle.width > 0
        );

        // Collision box
        const playerBox = {
          x: PLAYER.x + 5,
          y: game.player.y + 5,
          width: PLAYER.width - 10,
          height: PLAYER.height - 5,
        };

        for (const obstacle of game.obstacles) {
          if (isColliding(playerBox, obstacle)) {
            endGame();
            break;
          }
        }

        // Move and collect tokens
        game.tokens.forEach((token) => {
          token.x -= game.speed * delta;

          const tokenBox = {
            x: token.x - token.radius,
            y: token.y - token.radius,
            width: token.radius * 2,
            height: token.radius * 2,
          };

          if (
            !token.collected &&
            isColliding(playerBox, tokenBox)
          ) {
            token.collected = true;
            game.tokensCollected += 1;
            game.score += 50;
          }
        });

        game.tokens = game.tokens.filter(
          (token) =>
            token.x + token.radius > 0 &&
            !token.collected
        );

        // Update React HUD less frequently
        if (Math.floor(game.frame) % 6 === 0) {
          setScore(Math.floor(game.score));
          setTokensCollected(game.tokensCollected);
        }
      } else {
        game.lastTimestamp = 0;
      }

      drawGame(ctx, game);

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [gameStatus, resetGame, endGame]);

  

  return (
    <main className="style-runner-page">
      <div className="style-runner-container">

        <header className="style-runner-header">
          <span className="style-runner-eyebrow">
            ABS CUT PLAY
          </span>

          <h1>
            Style <span>Runner</span>
          </h1>

          <p>
            Run through the fashion world, avoid obstacles,
            and collect golden style tokens.
          </p>
        </header>

        <section className="style-runner-stats">
          <div className="style-runner-stat">
            <span>YOUR SCORE</span>
            <strong>{score}</strong>
          </div>

          <div className="style-runner-stat">
            <span>GOLD TOKENS</span>
            <strong>{tokensCollected}</strong>
          </div>

          <div className="style-runner-stat">
            <span>BEST SCORE</span>
            <strong>{highScore}</strong>
          </div>
        </section>

        <section className="style-runner-game-panel">

          <div className="style-runner-game-top">
            <span>THE FASHION RUNWAY</span>

            <span className="style-runner-live">
              <i />
              OFFLINE GAME
            </span>
          </div>

          <div
            className="style-runner-canvas-wrap"
            onPointerDown={jump}
            role="button"
            tabIndex={0}
            aria-label="Tap to make your character jump"
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                jump();
              }
            }}
          >
            <canvas
              ref={canvasRef}
              width={GAME_WIDTH}
              height={GAME_HEIGHT}
              className="style-runner-canvas"
            />

            {gameStatus !== "running" && (
              <div className="style-runner-overlay">

                {gameStatus === "ready" && (
                  <>
                    <span className="style-runner-overlay-icon">
                      ✦
                    </span>

                    <h2>Ready to Run?</h2>

                    <p>
                      Jump over obstacles and collect gold tokens.
                    </p>

                    <button onClick={startGame}>
                      Start Running
                    </button>
                  </>
                )}

                {gameStatus === "paused" && (
                  <>
                    <span className="style-runner-overlay-icon">
                      Ⅱ
                    </span>

                    <h2>Game Paused</h2>

                    <p>Your progress is safe.</p>

                    <button onClick={resumeGame}>
                      Resume Game
                    </button>
                  </>
                )}

                {gameStatus === "over" && (
                  <>
                    <span className="style-runner-overlay-icon">
                      ★
                    </span>

                    <h2>Run Complete!</h2>

                    <p>
                      You scored {score} points and collected{" "}
                      {tokensCollected} tokens.
                    </p>

                    <button onClick={startGame}>
                      Play Again
                    </button>
                  </>
                )}

              </div>
            )}
          </div>

          <div className="style-runner-controls">
            <div>
              <strong>DESKTOP</strong>
              <span>SPACE / ↑ / W to jump</span>
            </div>

            <div>
              <strong>MOBILE</strong>
              <span>Tap the game area to jump</span>
            </div>
          </div>

          <div className="style-runner-actions">

            {gameStatus === "running" ? (
              <button
                className="runner-pause-button"
                onClick={pauseGame}
              >
                Pause Game
              </button>
            ) : (
              <button
                className="runner-restart-button"
                onClick={startGame}
              >
                {gameStatus === "ready"
                  ? "Start Game"
                  : gameStatus === "paused"
                    ? "Resume Game"
                    : "Restart Game"}
              </button>
            )}

          </div>

        </section>

        <section className="style-runner-guide">
          <h2>How to Play</h2>

          <div className="style-runner-guide-grid">
            <div>
              <span>01</span>
              <h3>Keep Running</h3>
              <p>Your character moves automatically.</p>
            </div>

            <div>
              <span>02</span>
              <h3>Avoid Obstacles</h3>
              <p>Jump over every obstacle on the runway.</p>
            </div>

            <div>
              <span>03</span>
              <h3>Collect Gold</h3>
              <p>Collect golden tokens to increase your score.</p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}

export default StyleRunner;

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./MemoryMatch.css";

const fashionItems = [
  { name: "Agbada", icon: "🥻" },
  { name: "Cap", icon: "🧢" },
  { name: "Shoes", icon: "👞" },
  { name: "Fabric", icon: "🧵" },
  { name: "Sunglasses", icon: "🕶️" },
  { name: "Watch", icon: "⌚" },
  { name: "Bag", icon: "👜" },
  { name: "Scissors", icon: "✂️" },
  { name: "Shirt", icon: "👔" },
  { name: "Crown", icon: "👑" },
];

const difficultySettings = {
  Easy: 6,
  Medium: 8,
  Hard: 10,
};

function shuffleCards(items) {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[i],
    ];
  }

  return shuffled;
}

function createCards(difficulty) {
  const pairCount = difficultySettings[difficulty];

  const selectedItems = fashionItems.slice(0, pairCount);

  const pairedCards = selectedItems.flatMap((item, index) => [
    {
      id: `${index}-first`,
      pairId: index,
      ...item,
    },
    {
      id: `${index}-second`,
      pairId: index,
      ...item,
    },
  ]);

  return shuffleCards(pairedCards);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function MemoryMatch() {
  const [difficulty, setDifficulty] = useState("Easy");
  const [cards, setCards] = useState(() => createCards("Easy"));
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);

  const mismatchTimeout = useRef(null);

  const totalPairs = difficultySettings[difficulty];
  const matchesFound = matchedCards.length / 2;
  const isComplete =
    matchedCards.length === cards.length && cards.length > 0;

  const score = isComplete
    ? Math.max(100, 1000 - moves * 10 - seconds)
    : 0;

  useEffect(() => {
    if (!started || isComplete) return;

    const timer = setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [started, isComplete]);

  useEffect(() => {
    if (flippedCards.length !== 2) return;

    const [firstIndex, secondIndex] = flippedCards;

    const firstCard = cards[firstIndex];
    const secondCard = cards[secondIndex];

    if (firstCard.pairId === secondCard.pairId) {
      setMatchedCards((current) => [
        ...current,
        firstCard.id,
        secondCard.id,
      ]);

      setFlippedCards([]);
      return;
    }

    setLocked(true);

    mismatchTimeout.current = setTimeout(() => {
      setFlippedCards([]);
      setLocked(false);
    }, 850);

    return () => clearTimeout(mismatchTimeout.current);
  }, [flippedCards, cards]);

  useEffect(() => {
    return () => clearTimeout(mismatchTimeout.current);
  }, []);

  const restartGame = (nextDifficulty = difficulty) => {
    clearTimeout(mismatchTimeout.current);

    setDifficulty(nextDifficulty);
    setCards(createCards(nextDifficulty));
    setFlippedCards([]);
    setMatchedCards([]);
    setMoves(0);
    setSeconds(0);
    setStarted(false);
    setLocked(false);
  };

  const handleCardClick = (index) => {
    if (locked || isComplete) return;

    const selectedCard = cards[index];

    if (
      flippedCards.includes(index) ||
      matchedCards.includes(selectedCard.id)
    ) {
      return;
    }

    if (!started) setStarted(true);

    if (flippedCards.length === 1) {
      setMoves((current) => current + 1);
    }

    setFlippedCards((current) => [...current, index]);
  };

  return (
    <main className="abs-memory-page">
      <div className="abs-memory-container">
        {/* PAGE HEADER */}

        <Link to="/play" className="abs-memory-back">
          <span>←</span> Back to ABS CUT Play
        </Link>

        <header className="abs-memory-header">
          <span className="abs-memory-eyebrow">
            ABS CUT ENTERTAINMENT
          </span>

          <h1>
            Fashion Memory <span>Match</span>
          </h1>

          <p>
            Flip the cards, find matching fashion items and test
            your memory.
          </p>
        </header>

        {/* GAME STATISTICS */}

        <section className="abs-memory-stats">
          <div className="abs-memory-stat">
            <span>TIME</span>
            <strong>{formatTime(seconds)}</strong>
          </div>

          <div className="abs-memory-stat">
            <span>MOVES</span>
            <strong>{moves}</strong>
          </div>

          <div className="abs-memory-stat">
            <span>MATCHES</span>
            <strong>
              {matchesFound}/{totalPairs}
            </strong>
          </div>

          <div className="abs-memory-stat">
            <span>SCORE</span>
            <strong>{score}</strong>
          </div>
        </section>

        {/* GAME CONTROLS */}

        <section className="abs-memory-controls">
          <div className="abs-memory-difficulty">
            <label htmlFor="memory-difficulty">
              Difficulty
            </label>

            <select
              id="memory-difficulty"
              value={difficulty}
              onChange={(event) => restartGame(event.target.value)}
            >
              <option value="Easy">Easy · 6 pairs</option>
              <option value="Medium">Medium · 8 pairs</option>
              <option value="Hard">Hard · 10 pairs</option>
            </select>
          </div>

          <button
            type="button"
            className="abs-memory-restart"
            onClick={() => restartGame()}
          >
            ↻ Restart Game
          </button>
        </section>

        {/* GAME BOARD */}

        <section
          className={`abs-memory-board difficulty-${difficulty.toLowerCase()}`}
          aria-label="Fashion memory matching cards"
        >
          {cards.map((card, index) => {
            const isFlipped = flippedCards.includes(index);
            const isMatched = matchedCards.includes(card.id);

            return (
              <button
                type="button"
                key={card.id}
                className={[
                  "abs-memory-card",
                  isFlipped || isMatched ? "flipped" : "",
                  isMatched ? "matched" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleCardClick(index)}
                disabled={isMatched || locked}
                aria-label={
                  isFlipped || isMatched
                    ? `${card.name}${isMatched ? ", matched" : ""}`
                    : "Hidden fashion card"
                }
              >
                <span className="abs-memory-card-inner">
                  <span className="abs-memory-card-front">
                    <span>AC</span>
                    <small>✦</small>
                  </span>

                  <span className="abs-memory-card-back">
                    <span className="abs-memory-card-icon">
                      {card.icon}
                    </span>

                    <small>{card.name}</small>
                  </span>
                </span>
              </button>
            );
          })}
        </section>

        {/* GAME STATUS */}

        <section className="abs-memory-status">
          {isComplete ? (
            <div className="abs-memory-victory">
              <span className="abs-memory-victory-icon">🏆</span>

              <h2>Excellent Work!</h2>

              <p>
                You've matched all {totalPairs} fashion pairs.
                Your final score is <strong>{score}</strong>.
              </p>

              <button
                type="button"
                onClick={() => restartGame()}
              >
                Play Again
              </button>
            </div>
          ) : (
            <>
              <span className="abs-memory-status-icon">✦</span>

              <p>
                {!started
                  ? "Choose a card to begin your game."
                  : locked
                    ? "Not a match. Try again!"
                    : flippedCards.length === 1
                      ? "Find the matching card."
                      : "Find all the matching fashion items!"}
              </p>
            </>
          )}
        </section>

        <footer className="abs-memory-footer">
          <span>ABS CUT</span>
          <span>FUN • STYLE • CHALLENGE</span>
        </footer>
      </div>
    </main>
  );
}

export default MemoryMatch;
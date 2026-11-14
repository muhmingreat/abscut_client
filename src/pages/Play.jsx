
import { useState } from "react";
import { Link } from "react-router-dom";
import "./Play.css";

const games = [
  {
    id: "memory-match",
    number: "01",
    title: "Fashion Memory Match",
    description:
      "Test your memory by matching beautiful fashion items, clothing and accessories.",
    icon: "🧥",
    category: "MEMORY GAME",
    difficulty: "Easy",
    color: "memory",
    path: "/play/memory-match",
  },
  {
    id: "word-challenge",
    number: "02",
    title: "Fashion Word Challenge",
    description:
      "Unscramble fashion words and discover how well you know the world of style.",
    icon: "🔤",
    category: "WORD PUZZLE",
    difficulty: "Medium",
    color: "words",
    path: "/play/word-challenge",
  },
  {
    id: "tic-tac-toe",
    number: "03",
    title: "Tic-Tac-Toe",
    description:
      "Take a break and challenge the computer to a quick game of Tic-Tac-Toe.",
    icon: "⭕",
    category: "CLASSIC GAME",
    difficulty: "Easy",
    color: "tic-tac-toe",
    path: "/play/tic-tac-toe",
  },
  {
  id: "style-runner",
  title: "Style Runner",
  description:
    "Run through the fashion runway, dodge obstacles, and collect golden tokens.",
  icon: "🏃",
  category: "ACTION GAME",
  difficulty: "Medium",
  path: "/play/style-runner",
},
];

function Play() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Memory Game", "Word Puzzle", "Classic Game","Action Game",];

  const filteredGames =
    selectedCategory === "All"
      ? games
      : games.filter(
          (game) =>
            game.category.toLowerCase() === selectedCategory.toLowerCase()
        );

  return (
    <main className="abs-play-page">
      {/* HERO SECTION */}
      <section className="abs-play-hero">
        <div className="abs-play-hero-content">
          <span className="abs-play-eyebrow">
            <span className="abs-play-eyebrow-line" />
            THE ABS CUT ENTERTAINMENT HUB
          </span>

          <h1>
            Take a Break.
            <br />
            <span>Play Something Fun.</span>
          </h1>

          <p>
            Welcome to ABS CUT Play. Explore fun challenges, test your
            skills and enjoy a little entertainment while discovering
            the world of fashion.
          </p>

          <a href="#abs-play-games" className="abs-play-hero-button">
            Explore Games
            <span>→</span>
          </a>

          <div className="abs-play-hero-note">
            <span className="abs-play-online-dot" />
            No account required. Play anytime.
          </div>
        </div>

        <div className="abs-play-hero-art" aria-hidden="true">
          <div className="abs-play-art-circle abs-play-art-circle-one" />
          <div className="abs-play-art-circle abs-play-art-circle-two" />

          <div className="abs-play-art-card">
            <span className="abs-play-art-star">✦</span>
            <span className="abs-play-art-icon">🎮</span>
            <span className="abs-play-art-label">ABS CUT</span>
            <strong>LET'S PLAY</strong>
            <span className="abs-play-art-bottom">FUN • STYLE • CHALLENGE</span>
          </div>

          <span className="abs-play-floating abs-play-floating-one">✦</span>
          <span className="abs-play-floating abs-play-floating-two">♛</span>
          <span className="abs-play-floating abs-play-floating-three">✧</span>
        </div>
      </section>

      {/* GAME INTRODUCTION */}
      <section className="abs-play-section" id="abs-play-games">
        <div className="abs-play-section-heading">
          <div>
            <span className="abs-play-section-label">CHOOSE YOUR GAME</span>
            <h2>Find Your Next Challenge</h2>
            <p>
              A little competition, a little creativity and plenty of fun.
            </p>
          </div>

          <div className="abs-play-game-count">
            <strong>{games.length.toString().padStart(2, "0")}</strong>
            <span>GAMES AVAILABLE</span>
          </div>
        </div>

        {/* CATEGORY FILTER */}
        <div className="abs-play-filters" aria-label="Filter games">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={
                selectedCategory === category ? "active" : ""
              }
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* GAME CARDS */}
        <div className="abs-play-games-grid">
          {filteredGames.map((game) => (
            <article
              className={`abs-play-game-card ${game.color}`}
              key={game.id}
            >
              <div className="abs-play-card-top">
                <span className="abs-play-game-number">
                  GAME {game.number}
                </span>

                <span className="abs-play-game-category">
                  {game.category}
                </span>
              </div>

              <div className="abs-play-game-icon">
                <span>{game.icon}</span>
              </div>

              <div className="abs-play-game-info">
                <div className="abs-play-game-meta">
                  <span>{game.difficulty}</span>
                  <span className="abs-play-meta-dot" />
                  <span>Offline friendly</span>
                </div>

                <h3>{game.title}</h3>

                <p>{game.description}</p>

                <Link
                  to={game.path}
                  className="abs-play-game-button"
                >
                  Play Game
                  <span>→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>

        {filteredGames.length === 0 && (
          <p className="abs-play-empty">
            No games found in this category.
          </p>
        )}
      </section>

      {/* BOTTOM MESSAGE */}
      <section className="abs-play-footer-banner">
        <div className="abs-play-footer-symbol">✦</div>

        <div>
          <span>THE ABS CUT EXPERIENCE</span>
          <h2>Style is serious. Fun doesn't have to be.</h2>
          <p>
            Enjoy your time with ABS CUT. More games and challenges
            are coming.
          </p>
        </div>

        <Link to="/shop" className="abs-play-shop-link">
          Explore Our Shop →
        </Link>
      </section>
    </main>
  );
}

export default Play;

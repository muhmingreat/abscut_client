
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./WordChallenge.css";

const questionBank = {
  Easy: [
    {
      word: "AGBADA",
      hint: "A flowing traditional Nigerian outfit.",
      category: "Traditional Wear",
    },
    {
      word: "CAP",
      hint: "A head accessory often worn with traditional outfits.",
      category: "Accessory",
    },
    {
      word: "SHIRT",
      hint: "A common upper-body clothing item.",
      category: "Clothing",
    },
    {
      word: "SHOES",
      hint: "Footwear worn to protect and cover your feet.",
      category: "Footwear",
    },
    {
      word: "FABRIC",
      hint: "Material used to make clothes.",
      category: "Materials",
    },
    {
      word: "BUTTON",
      hint: "A small fastening used on clothing.",
      category: "Fashion Detail",
    },
  ],
  Medium: [
    {
      word: "CAFTAN",
      hint: "A loose-fitting garment worn in many African cultures.",
      category: "Traditional Wear",
    },
    {
      word: "SENATOR",
      hint: "A popular Nigerian traditional outfit, often made with matching trousers.",
      category: "Traditional Wear",
    },
    {
      word: "DANSIKI",
      hint: "A loose traditional top worn in West Africa.",
      category: "Traditional Wear",
    },
    {
      word: "TAILOR",
      hint: "A professional who makes or alters clothes.",
      category: "Fashion Profession",
    },
    {
      word: "POCKET",
      hint: "A small sewn compartment on a garment.",
      category: "Clothing Detail",
    },
    {
      word: "THREAD",
      hint: "A thin strand used for sewing.",
      category: "Materials",
    },
  ],
  Hard: [
    {
      word: "EMBROIDERY",
      hint: "Decorative designs stitched onto fabric.",
      category: "Fashion Craft",
    },
    {
      word: "MEASUREMENT",
      hint: "The dimensions used to make clothing fit properly.",
      category: "Tailoring",
    },
    {
      word: "MONOGRAM",
      hint: "A design made from initials, often added to clothing.",
      category: "Personalisation",
    },
    {
      word: "STITCHING",
      hint: "The process of joining fabric with thread.",
      category: "Tailoring",
    },
    {
      word: "ACCESSORY",
      hint: "An additional item used to complement an outfit.",
      category: "Fashion",
    },
    {
      word: "GARMENT",
      hint: "An item of clothing.",
      category: "Clothing",
    },
  ],
};

function shuffleLetters(word) {
  const letters = word.split("");

  // Try to avoid showing the original word.
  for (let attempt = 0; attempt < 10; attempt++) {
    for (let i = letters.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));

      [letters[i], letters[randomIndex]] = [
        letters[randomIndex],
        letters[i],
      ];
    }

    if (letters.join("") !== word) break;
  }

  return letters;
}

function createQuestions(difficulty) {
  return [...questionBank[difficulty]]
    .sort(() => Math.random() - 0.5)
    .map((question) => ({
      ...question,
      scrambled: shuffleLetters(question.word),
    }));
}

function WordChallenge() {
  const [difficulty, setDifficulty] = useState("Easy");
  const [questions, setQuestions] = useState(() =>
    createQuestions("Easy")
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [completed, setCompleted] = useState(false);

  const currentQuestion = questions[questionIndex];

  const progress = useMemo(
    () =>
      questions.length
        ? (questionIndex / questions.length) * 100
        : 0,
    [questionIndex, questions.length]
  );

  const startNewGame = (nextDifficulty = difficulty) => {
    setDifficulty(nextDifficulty);
    setQuestions(createQuestions(nextDifficulty));
    setQuestionIndex(0);
    setAnswer("");
    setScore(0);
    setStreak(0);
    setHintUsed(false);
    setFeedback("");
    setCompleted(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!currentQuestion || completed || feedback) return;

    const submittedAnswer = answer.trim().toUpperCase();

    if (!submittedAnswer) return;

    if (submittedAnswer === currentQuestion.word) {
      const points = hintUsed ? 5 : 10;

      setScore((current) => current + points);
      setStreak((current) => current + 1);
      setFeedback("correct");
    } else {
      setStreak(0);
      setFeedback("incorrect");
    }
  };

  const handleNext = () => {
    if (questionIndex + 1 >= questions.length) {
      setCompleted(true);
      return;
    }

    setQuestionIndex((current) => current + 1);
    setAnswer("");
    setHintUsed(false);
    setFeedback("");
  };

  const handleHint = () => {
    if (!hintUsed && !feedback && !completed) {
      setHintUsed(true);
    }
  };

  return (
    <main className="abs-word-page">
      <div className="abs-word-container">
        <Link to="/play" className="abs-word-back">
          <span>←</span> Back to ABS CUT Play
        </Link>

        {/* HEADER */}

        <header className="abs-word-header">
          <span className="abs-word-eyebrow">
            ABS CUT FASHION PUZZLE
          </span>

          <h1>
            Fashion Word <span>Challenge</span>
          </h1>

          <p>
            Rearrange the letters, discover the fashion word and
            prove your knowledge of style.
          </p>
        </header>

        {/* STATISTICS */}

        <section className="abs-word-stats">
          <div className="abs-word-stat">
            <span>SCORE</span>
            <strong>{score}</strong>
          </div>

          <div className="abs-word-stat">
            <span>QUESTION</span>
            <strong>
              {completed ? questions.length : questionIndex + 1}
              <small> / {questions.length}</small>
            </strong>
          </div>

          <div className="abs-word-stat">
            <span>STREAK</span>
            <strong>{streak} 🔥</strong>
          </div>
        </section>

        {/* DIFFICULTY */}

        <section className="abs-word-difficulty">
          <span>CHOOSE DIFFICULTY</span>

          <div className="abs-word-difficulty-options">
            {Object.keys(questionBank).map((level) => (
              <button
                key={level}
                type="button"
                className={difficulty === level ? "active" : ""}
                onClick={() => startNewGame(level)}
              >
                {level}
              </button>
            ))}
          </div>
        </section>

        {/* PROGRESS */}

        <div className="abs-word-progress">
          <div
            className="abs-word-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* GAME AREA */}

        {!completed && currentQuestion && (
          <section className="abs-word-game-card">
            <div className="abs-word-question-heading">
              <span>UNSCRAMBLE THIS WORD</span>
              <span className="abs-word-category">
                {currentQuestion.category}
              </span>
            </div>

            <div className="abs-word-letter-board">
              {currentQuestion.scrambled.map((letter, index) => (
                <div className="abs-word-letter" key={`${letter}-${index}`}>
                  {letter}
                </div>
              ))}
            </div>

            <form
              className="abs-word-answer-form"
              onSubmit={handleSubmit}
            >
              <label htmlFor="abs-word-answer">
                YOUR ANSWER
              </label>

              <input
                id="abs-word-answer"
                type="text"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Type the correct word..."
                autoComplete="off"
                autoCapitalize="characters"
                disabled={Boolean(feedback)}
                maxLength={20}
              />

              {!feedback && (
                <button
                  type="submit"
                  className="abs-word-submit"
                  disabled={!answer.trim()}
                >
                  Check Answer <span>→</span>
                </button>
              )}
            </form>

            {/* HINT */}

            {!hintUsed && !feedback && (
              <button
                type="button"
                className="abs-word-hint-button"
                onClick={handleHint}
              >
                💡 Need a hint?
              </button>
            )}

            {hintUsed && (
              <div className="abs-word-hint">
                <strong>HINT:</strong> {currentQuestion.hint}
                <small>Using a hint reduces this answer's points.</small>
              </div>
            )}

            {/* FEEDBACK */}

            {feedback === "correct" && (
              <div className="abs-word-feedback correct">
                <strong>Excellent! Correct answer.</strong>
                <span>
                  You earned {hintUsed ? 5 : 10} points.
                </span>

                <button type="button" onClick={handleNext}>
                  {questionIndex + 1 === questions.length
                    ? "View Results"
                    : "Next Question"}{" "}
                  →
                </button>
              </div>
            )}

            {feedback === "incorrect" && (
              <div className="abs-word-feedback incorrect">
                <strong>Not quite. Try again!</strong>
                <span>Check the letters and give it another go.</span>

                <button
                  type="button"
                  onClick={() => {
                    setFeedback("");
                    setAnswer("");
                  }}
                >
                  Try Again
                </button>
              </div>
            )}
          </section>
        )}

        {/* COMPLETION */}

        {completed && (
          <section className="abs-word-results">
            <span className="abs-word-trophy">🏆</span>

            <span className="abs-word-eyebrow">
              CHALLENGE COMPLETED
            </span>

            <h2>Well Played!</h2>

            <p>
              You've completed all {questions.length} questions
              in {difficulty} mode.
            </p>

            <div className="abs-word-final-score">
              <span>YOUR FINAL SCORE</span>
              <strong>{score}</strong>
              <small>POINTS</small>
            </div>

            <button
              type="button"
              onClick={() => startNewGame()}
            >
              Play Again ↻
            </button>
          </section>
        )}

        <footer className="abs-word-footer">
          <span>ABS CUT</span>
          <span>FUN • STYLE • CHALLENGE</span>
        </footer>
      </div>
    </main>
  );
}

export default WordChallenge;

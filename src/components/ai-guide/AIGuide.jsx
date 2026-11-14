
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  FiX,
  FiStar,
  FiMapPin,
  FiSend,
  FiRotateCcw,
} from "react-icons/fi";

import { apiRequest } from "../../services/api";
import "./AIGuide.css";

const INITIAL_MESSAGE = {
  role: "model",
  text: "Welcome to ABS CUT! I'm your AI Guide. I can explain how the platform works, help you navigate its features, and guide you through shopping, custom orders, payments, delivery and Fashion Academy. What would you like help with?",
};

const PAGE_GUIDES = {
  "/": "The customer is viewing the ABS CUT homepage.",
  "/shop": "The customer is browsing the ABS CUT shop.",
  "/cart": "The customer is viewing their shopping cart.",
  "/checkout": "The customer is on the checkout page.",
  "/custom-order": "The customer is viewing the custom clothing order page.",
  "/my-orders": "The customer is viewing their orders.",
  "/account": "The customer is viewing their account.",
  "/academy": "The customer is browsing ABS CUT Fashion Academy.",
  "/academy/my-courses": "The customer is viewing their enrolled courses.",
  "/ai-measurement": "The customer is using the AI measurement feature.",
  "/contact": "The customer is viewing the contact page.",
  "/play": "The customer is exploring the ABS CUT games section.",
};

function getPageContext(pathname) {
  if (PAGE_GUIDES[pathname]) {
    return PAGE_GUIDES[pathname];
  }

  if (pathname.startsWith("/product/")) {
    return "The customer is viewing a product details page.";
  }

  if (pathname.startsWith("/track-order/")) {
    return "The customer is viewing an order tracking page.";
  }

  if (pathname.startsWith("/academy/courses/")) {
    return "The customer is viewing a Fashion Academy course details page.";
  }

  if (pathname.startsWith("/academy/learn/")) {
    return "The customer is learning inside a Fashion Academy course.";
  }

  if (pathname.startsWith("/admin")) {
    return "The user is viewing an ABS CUT administration page. Provide general navigation guidance only. Do not claim access to private admin data or perform administrative actions.";
  }

  return `The customer is currently viewing the page: ${pathname}`;
}

function AIGuide() {
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const currentPage = location.pathname;
  const pageContext = getPageContext(currentPage);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text) => {
    const trimmedMessage = text.trim();

    if (!trimmedMessage || isLoading) {
      return;
    }

    const userMessage = {
      role: "user",
      text: trimmedMessage,
    };

    const previousMessages = messages.filter(
      (item) => item.role === "user" || item.role === "model"
    );

    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setError("");
    setIsLoading(true);

    try {
      const history = previousMessages.slice(-8).map((item) => ({
        role: item.role,
        text: item.text,
      }));

      const data = await apiRequest("/ai-guide/chat", {
        method: "POST",
        body: JSON.stringify({
          message: trimmedMessage,
          page: `${currentPage} - ${pageContext}`,
          history,
        }),
      });

      if (!data.success || !data.reply) {
        throw new Error(
          data.message || "The AI Guide could not generate a response."
        );
      }

      setMessages((current) => [
        ...current,
        {
          role: "model",
          text: data.reply,
        },
      ]);
    } catch (requestError) {
      console.error("ABS CUT AI Guide error:", requestError);

      setError(
        requestError.message ||
          "Unable to connect to the AI Guide. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageContext, isLoading, messages]);

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(message);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleClearChat = () => {
    if (isLoading) return;

    setMessages([INITIAL_MESSAGE]);
    setError("");
  };

  const suggestions = [
    "How does ABS CUT work?",
    "How do I place a custom order?",
    "How does Fashion Academy work?",
  ];

  return (
    <div className="ai-guide-container">
      {isOpen && (
        <section
          className="ai-guide-panel"
          aria-label="ABS CUT AI Guide"
          aria-modal="false"
          role="dialog"
        >
          <header className="ai-guide-header">
            <div className="ai-guide-brand">
              <div className="ai-guide-avatar">
                <span>AI</span>
              </div>

              <div>
                <h3>ABS CUT AI Guide</h3>
                <span className="ai-guide-status">
                  <span className="ai-guide-status-dot" />
                  Your virtual assistant
                </span>
              </div>
            </div>

            <div className="ai-guide-header-actions">
              <button
                type="button"
                onClick={handleClearChat}
                disabled={isLoading}
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <FiRotateCcw />
              </button>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close AI Guide"
                title="Close"
              >
                <FiX />
              </button>
            </div>
          </header>

          <div className="ai-guide-context">
            <FiMapPin />
            <span>Current page: {currentPage}</span>
          </div>

          <div className="ai-guide-messages">
            {messages.map((item, index) => (
              <div
                key={`${index}-${item.role}`}
                className={`ai-guide-message ${
                  item.role === "user" ? "user-message" : "bot-message"
                }`}
              >
                {item.role === "model" && (
                  <div className="ai-guide-message-avatar">AI</div>
                )}

                <div className="ai-guide-message-content">
                  {item.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="ai-guide-message bot-message">
                <div className="ai-guide-message-avatar">AI</div>

                <div className="ai-guide-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            {error && (
              <div className="ai-guide-error" role="alert">
                {error}
                <button
                  type="button"
                  onClick={() => sendMessage(message || "Please try again.")}
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="ai-guide-suggestions">
              <p>Try asking:</p>

              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={isLoading}
                  onClick={() => sendMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form
            className="ai-guide-input-area"
            onSubmit={handleSubmit}
          >
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask me anything about ABS CUT..."
              maxLength={2000}
              disabled={isLoading}
              aria-label="Message the ABS CUT AI Guide"
            />

            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              aria-label="Send message"
            >
              <FiSend />
            </button>
          </form>

          <footer className="ai-guide-footer">
            Powered by ABS CUT AI · Responses may need verification
          </footer>
        </section>
      )}

      <button
        type="button"
        className={`ai-guide-launcher ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "Close AI Guide" : "Open ABS CUT AI Guide"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <FiX />
        ) : (
          <>
            <FiStar />
            <span>AI Guide</span>
          </>
        )}
      </button>
    </div>
  );
}

export default AIGuide;

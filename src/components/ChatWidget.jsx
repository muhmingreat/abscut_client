import { useEffect, useRef, useState } from "react";
import CustomerChat from "./CustomerChat";
import "./ChatWidget.css";

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const launcherRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        launcherRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [isOpen]);

  return (
    <div className="abs-chat-widget">
      {isOpen && (
        <section
          className="abs-chat-popup"
          role="dialog"
          aria-modal="false"
          aria-label="ABS CUT customer support chat"
        >
          <div className="abs-chat-popup-topbar">
            <div className="abs-chat-popup-brand">
              <span className="abs-chat-popup-logo">AC</span>

              <div>
                <h3>ABS CUT Support</h3>
                <p>We're here to help</p>
              </div>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              className="abs-chat-popup-close"
              onClick={() => {
                setIsOpen(false);
                launcherRef.current?.focus();
              }}
              aria-label="Close chat"
              title="Close chat"
            >
              <svg
                viewBox="0 0 24 24"
                width="21"
                height="21"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div id="abs-chat-popup-content" className="abs-chat-popup-content">
            <CustomerChat />
          </div>
        </section>
      )}

      <button
        ref={launcherRef}
        type="button"
        className={`abs-chat-launcher ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? "Close support chat" : "Open support chat"}
        aria-expanded={isOpen}
        aria-controls={isOpen ? "abs-chat-popup-content" : undefined}
        title={isOpen ? "Close chat" : "Chat with ABS CUT"}
      >
        {isOpen ? (
          <svg
            viewBox="0 0 24 24"
            width="27"
            height="27"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="m18 6-12 12" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            width="27"
            height="27"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default ChatWidget;

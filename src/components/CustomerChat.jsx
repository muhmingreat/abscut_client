
import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../services/api";
import { connectChatSocket } from "../services/chatSocket";
import "./CustomerChat.css";

function formatTime(date) {
  if (!date) return "";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMessageDate(date) {
  if (!date) return "";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getMessageDay(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";

  return [
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  ].join("-");
}

function getMessageConversationId(message) {
  return String(
    message?.conversation?._id || message?.conversation || ""
  );
}

function CustomerChat() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] =
    useState("Connecting");
  const [typingRole, setTypingRole] = useState("");

  const messagesEndRef = useRef(null);
  const sendingRef = useRef(false);

  const addMessage = useCallback((message) => {
    if (!message?._id) return;

    setMessages((previous) => {
      if (previous.some((item) => item._id === message._id)) {
        return previous;
      }

      return [...previous, message].sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
      );
    });
  }, []);

  // Load or create the customer's conversation and history.
  useEffect(() => {
    let cancelled = false;

    async function loadConversation() {
      try {
        setLoading(true);
        setError("");

        const result = await apiRequest("/chat/conversations", {
          method: "POST",
          body: JSON.stringify({}),
        });

        if (cancelled) return;

        if (!result?.conversation?._id) {
          throw new Error("The server did not return a conversation.");
        }

        const initialConversation = result.conversation;
        setConversation(initialConversation);

        const history = await apiRequest(
          `/chat/conversations/${initialConversation._id}/messages`
        );

        if (cancelled) return;

        setMessages(history?.messages || []);
        setConversation(history?.conversation || initialConversation);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load your chat.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadConversation();

    return () => {
      cancelled = true;
    };
  }, []);

  // Join the live room and listen for messages and typing events.
  useEffect(() => {
    if (!conversation?._id) return;

    let active = true;
    const conversationId = String(conversation._id);
    let chatSocket;

    const joinConversation = () => {
      if (!active) return;

      chatSocket.emit(
        "chat:join",
        { conversationId },
        (result) => {
          if (!active) return;

          if (result?.success) {
            setConnectionStatus("Connected");
            setError("");
          } else {
            setConnectionStatus("Connection issue");
            setError(result?.message || "Could not join the chat.");
          }
        }
      );
    };

    // const handleNewMessage = (payload) => {
    //   const message = payload?.message;

    //   if (!active || !message) return;

    //   if (
    //     getMessageConversationId(message) !== conversationId
    //   ) {
    //     return;
    //   }

    //   addMessage(message);
    // };

const handleNewMessage = (payload) => {
    console.log("[CUSTOMER] Received chat:new_message:", payload);
  if (!active || !payload) return;

  const message = payload.message || payload;

  const messageConversationId = String(
    getMessageConversationId(message) ||
    payload.conversationId ||
    ""
  );

  if (
    !message?._id ||
    messageConversationId !== conversationId
  ) {
    return;
  }

  addMessage(message);
};

    const handleTyping = (payload) => {
      if (
        !active ||
        String(payload?.conversationId) !== conversationId
      ) {
        return;
      }

      setTypingRole(
        payload.isTyping && payload.senderRole === "admin"
          ? "admin"
          : ""
      );
    };

    const handleDisconnect = () => {
      if (!active) return;

      setConnectionStatus("Reconnecting");
      setTypingRole("");
    };

    const handleConnectError = () => {
      if (!active) return;

      setConnectionStatus("Connection issue");
      setError("Chat connection failed. Check that the server is running.");
    };

    try {
      chatSocket = connectChatSocket();

      chatSocket.on("connect", joinConversation);
      chatSocket.on("disconnect", handleDisconnect);
      chatSocket.on("connect_error", handleConnectError);
      chatSocket.on("chat:new_message", handleNewMessage);
      chatSocket.on("chat:typing", handleTyping);

      if (chatSocket.connected) {
        joinConversation();
      } else {
        setConnectionStatus("Connecting");
      }
    } catch (err) {
      setConnectionStatus("Connection issue");
      setError(err.message || "Could not connect to chat.");
    }

    return () => {
      active = false;

      if (chatSocket) {
        chatSocket.off("connect", joinConversation);
        chatSocket.off("disconnect", handleDisconnect);
        chatSocket.off("connect_error", handleConnectError);
        chatSocket.off("chat:new_message", handleNewMessage);
        chatSocket.off("chat:typing", handleTyping);

        if (chatSocket.connected) {
          chatSocket.emit("chat:leave", { conversationId });
        }
      }
    };
  }, [conversation?._id, addMessage]);

  // Keep the latest message in view.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, typingRole]);

  function notifyTyping(isTyping) {
    if (!conversation?._id) return;

    try {
      const socket = connectChatSocket();
      if (!socket.connected) return;

      socket.emit("chat:typing", {
        conversationId: conversation._id,
        isTyping,
      });
    } catch {
      // Typing indicators are optional.
    }
  }

  async function handleSend(event) {
    event.preventDefault();

    const text = messageText.trim();

    if (!text || sendingRef.current || !conversation?._id) return;

    if (conversation.status !== "open") {
      setError("This conversation is not open.");
      return;
    }

    let chatSocket;

    try {
      chatSocket = connectChatSocket();

      if (!chatSocket.connected) {
        throw new Error("Chat is reconnecting. Please try again shortly.");
      }

      sendingRef.current = true;
      setSending(true);
      setError("");
      notifyTyping(false);

      const result = await new Promise((resolve, reject) => {
        chatSocket.timeout(10000).emit(
          "chat:send",
          {
            conversationId: conversation._id,
            text,
          },
          (timeoutError, response) => {
            if (timeoutError) {
              reject(new Error("Message timed out. Please try again."));
              return;
            }

            if (!response?.success) {
              reject(
                new Error(
                  response?.message || "Message could not be sent."
                )
              );
              return;
            }

            resolve(response);
          }
        );
      });

      addMessage(result.message);
      setMessageText("");
      setTypingRole("");
    } catch (err) {
      setError(err.message || "Could not send your message.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  if (loading) {
    return (
      <section className="abs-chat-page">
        <div className="abs-chat-loading">
          <span className="abs-chat-spinner" />
          <p>Opening your ABS CUT support chat...</p>
        </div>
      </section>
    );
  }

  if (!conversation) {
    return (
      <section className="abs-chat-page">
        <div className="abs-chat-error">
          <h2>We couldn't open your chat</h2>
          <p>{error || "Please try again."}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="abs-chat-page">
      <div className="abs-chat-card">
        <header className="abs-chat-header">
          <div className="abs-chat-brand-icon">AC</div>

          <div className="abs-chat-heading">
            <span className="abs-chat-eyebrow">ABS CUT SUPPORT</span>
            <h2>Let's talk</h2>
            <p>
              Questions about orders, tailoring, or payments? We're here
              to help.
            </p>
          </div>

          <span
            className={`abs-chat-status ${
              connectionStatus === "Connected" ? "is-connected" : ""
            }`}
          >
            <span />
            {connectionStatus}
          </span>
        </header>

        <div className="abs-chat-notice">
          <span className="abs-chat-notice-icon">✦</span>
          <p>
            Welcome to ABS CUT. Send us a message and our team will
            respond as soon as possible.
          </p>
        </div>

        <div
          className="abs-chat-messages"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.length === 0 ? (
            <div className="abs-chat-empty">
              <div className="abs-chat-empty-icon">✉</div>
              <h3>Start the conversation</h3>
              <p>Tell us how we can help you today.</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const previousMessage = messages[index - 1];

              const showDate =
                !previousMessage ||
                getMessageDay(previousMessage.createdAt) !==
                  getMessageDay(message.createdAt);

              const isCustomer = message.senderRole === "customer";

              return (
                <div key={message._id}>
                  {showDate && (
                    <div className="abs-chat-date-divider">
                      {formatMessageDate(message.createdAt)}
                    </div>
                  )}

                  <div
                    className={`abs-chat-message-row ${
                      isCustomer ? "is-customer" : "is-admin"
                    }`}
                  >
                    <div className="abs-chat-message">
                      {!isCustomer && (
                        <span className="abs-chat-sender">
                          {message.sender?.name || "ABS CUT Support"}
                        </span>
                      )}

                      <p>{message.text}</p>

                      <time
                        dateTime={message.createdAt}
                        title={formatMessageDate(message.createdAt)}
                      >
                        {formatTime(message.createdAt)}
                      </time>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        {typingRole === "admin" && (
          <div
            className="abs-chat-typing"
            role="status"
            aria-live="polite"
          >
            <span className="abs-chat-typing-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            ABS CUT support is typing...
          </div>
        )}

        {error && (
          <div className="abs-chat-inline-error" role="alert">
            {error}
          </div>
        )}

        {conversation.status === "open" ? (
          <form className="abs-chat-composer" onSubmit={handleSend}>
            <textarea
              value={messageText}
              onChange={(event) => {
                const value = event.target.value;
                setMessageText(value);
                notifyTyping(Boolean(value.trim()));
              }}
              onBlur={() => notifyTyping(false)}
              placeholder="Write your message..."
              aria-label="Write your message"
              maxLength={2000}
              rows={2}
              disabled={sending}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />

            <button
              type="submit"
              disabled={!messageText.trim() || sending}
            >
              {sending ? "Sending..." : "Send"}
              <span aria-hidden="true">➤</span>
            </button>

            <small>Enter to send · Shift + Enter for a new line</small>
          </form>
        ) : (
          <div className="abs-chat-closed">
            This conversation is {conversation.status}. You cannot send
            new messages here.
          </div>
        )}

        <footer className="abs-chat-footer">
          Crafted with care by ABS CUT
        </footer>
      </div>
    </section>
  );
}

export default CustomerChat;

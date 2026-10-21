
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { apiRequest } from "../services/api";
import { connectChatSocket } from "../services/chatSocket";
import "./AdminChat.css";

const FILTERS = [
  { label: "All conversations", value: "all" },
  { label: "Open", value: "open" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

function formatTime(date) {
  if (!date) return "";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date) {
  if (!date) return "";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

function getCustomerName(conversation) {
  const customer = conversation?.customer;

  if (customer && typeof customer === "object") {
    return customer.name || customer.email || "ABS CUT Customer";
  }

  return "ABS CUT Customer";
}

function getInitials(name) {
  return (
    String(name || "AC")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "AC"
  );
}

function getMessageConversationId(message) {
  return String(
    message?.conversation?._id || message?.conversation || ""
  );
}

function AdminChat() {
  console.log("Rendering AdminChat component");
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [typingRole, setTypingRole] = useState("");

  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [connectionStatus, setConnectionStatus] =
    useState("Connecting");

  const messagesEndRef = useRef(null);
  const activeConversationRef = useRef(null);
  const sendingRef = useRef(false);
  const requestVersionRef = useRef(0);

  const activeId = activeConversation?._id || "";

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Keep inbox entries updated without duplicating conversations.
  const upsertConversation = useCallback((incoming) => {
    if (!incoming?._id) return;

    setConversations((previous) => {
      const exists = previous.some(
        (item) => String(item._id) === String(incoming._id)
      );

      const updated = exists
        ? previous.map((item) =>
            String(item._id) === String(incoming._id)
              ? { ...item, ...incoming }
              : item
          )
        : [incoming, ...previous];

      return updated.sort(
        (a, b) =>
          new Date(b.lastMessageAt || b.updatedAt || 0).getTime() -
          new Date(a.lastMessageAt || a.updatedAt || 0).getTime()
      );
    });

    setActiveConversation((previous) =>
      String(previous?._id) === String(incoming._id)
        ? { ...previous, ...incoming }
        : previous
    );

    setActiveConversation((previous) => {
      if (String(previous?._id) !== String(incoming._id)) {
        return previous;
      }

      const merged = { ...previous, ...incoming };
      activeConversationRef.current = merged;
      return merged;
    });
  }, []);

  // Deduplicate messages arriving through both the socket and ACK.
  const addMessage = useCallback((incoming) => {
    if (!incoming?._id) return;

    setMessages((previous) => {
      if (
        previous.some(
          (item) => String(item._id) === String(incoming._id)
        )
      ) {
        return previous;
      }

      return [...previous, incoming].sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
      );
    });
  }, []);

  // Load the admin inbox.
  // const loadInbox = useCallback(async (showRefresh = false) => {
  //   try {
  //     if (showRefresh) {
  //       setRefreshing(true);
  //     } else {
  //       setLoadingInbox(true);
  //     }

  //     setError("");

  //     const result = await apiRequest("/chat/admin/conversations");
  //     const items = result?.conversations || [];

  //     setConversations(
  //       [...items].sort(
  //         (a, b) =>
  //           new Date(b.lastMessageAt || b.updatedAt || 0).getTime() -
  //           new Date(a.lastMessageAt || a.updatedAt || 0).getTime()
  //       )
  //     );

  //     setNotice("");
  //   } catch (err) {
  //     setError(err.message || "Could not load the chat inbox.");
  //   } finally {
  //     setLoadingInbox(false);
  //     setRefreshing(false);
  //   }
  // }, []);
  
const loadInbox = useCallback(async (showRefresh = false) => {
  try {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoadingInbox(true);
    }

    setError("");

    console.log("[ADMIN CHAT] Requesting conversations...");

    const result = await apiRequest("/chat/admin/conversations");

    console.log("[ADMIN CHAT] API response:", result);

    const items = result?.conversations || [];

    console.log("[ADMIN CHAT] Conversation count:", items.length);

    console.table(
      items.map((conversation) => ({
        id: conversation._id,
        customer:
          conversation.customer?.name ||
          conversation.customer?.email ||
          "Unknown customer",
        lastMessage: conversation.lastMessage || "",
        lastMessageAt: conversation.lastMessageAt || "",
        status: conversation.status,
      }))
    );

    setConversations(
      [...items].sort(
        (a, b) =>
          new Date(b.lastMessageAt || b.updatedAt || 0).getTime() -
          new Date(a.lastMessageAt || a.updatedAt || 0).getTime()
      )
    );

    setNotice("");
  } catch (err) {
    console.error("[ADMIN CHAT] Inbox request failed:", err);
    console.error("[ADMIN CHAT] Error details:", {
      message: err.message,
      status: err.status,
      response: err.response,
    });

    setError(err.message || "Could not load the chat inbox.");
  } finally {
    setLoadingInbox(false);
    setRefreshing(false);
  }
}, []);


  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  // Socket connection and inbox notifications.
  useEffect(() => {
    let active = true;
    let chatSocket;

    const handleConnect = () => {
      if (!active) return;

      setConnectionStatus("Connected");

      const selected = activeConversationRef.current;

      if (selected?._id) {
        chatSocket.emit("chat:join", {
          conversationId: selected._id,
        });
      }
    };

    const handleDisconnect = () => {
      if (!active) return;

      setConnectionStatus("Reconnecting");
      setTypingRole("");
    };

    const handleConnectError = () => {
      if (!active) return;
      setConnectionStatus("Connection issue");
      setTypingRole("");
    };

    const handleConversationUpdated = (payload) => {
      if (!active || !payload?.conversation) return;
      upsertConversation(payload.conversation);
    };

//     const handleNewMessage = (payload) => {
//         console.log("[ADMIN] Received chat:new_message:", payload);
//   if (!active || !payload) return;

//   const message = payload.message || payload;

//   const selected = activeConversationRef.current;

//   const messageConversationId = String(
//     getMessageConversationId(message) ||
//     payload.conversationId ||
//     ""
//   );

//   if (
//     !message?._id ||
//     !selected?._id ||
//     messageConversationId !== String(selected._id)
//   ) {
//     return;
//   }

//   addMessage(message);
// };

const handleNewMessage = (payload) => {
  if (!active || !payload) return;

  const message = payload.message || payload;
  const selected = activeConversationRef.current;

  const messageConversationId = String(
    getMessageConversationId(message) ||
    payload.conversationId ||
    ""
  );

  const selectedConversationId = String(
    selected?._id || ""
  );

  console.log("[ADMIN CHAT DIAGNOSTIC]", {
    authenticatedSocketConnected: chatSocket?.connected,
    selectedConversationId,
    receivedConversationId: messageConversationId,
    senderRole: message?.senderRole,
    messageText: message?.text,
    matchesSelectedConversation:
      Boolean(selectedConversationId) &&
      messageConversationId === selectedConversationId,
  });

  if (
    !message?._id ||
    !selectedConversationId ||
    messageConversationId !== selectedConversationId
  ) {
    console.warn(
      "[ADMIN CHAT] Message ignored: no matching selected conversation."
    );
    return;
  }

  addMessage(message);
};

    const handleTyping = (payload) => {
      const selected = activeConversationRef.current;

      if (
        !active ||
        !selected?._id ||
        String(payload?.conversationId) !== String(selected._id)
      ) {
        return;
      }

      setTypingRole(
        payload.isTyping && payload.senderRole === "customer"
          ? "customer"
          : ""
      );
    };

    try {
      chatSocket = connectChatSocket();

      chatSocket.on("connect", handleConnect);
      chatSocket.on("disconnect", handleDisconnect);
      chatSocket.on("connect_error", handleConnectError);
      chatSocket.on(
        "chat:conversation_updated",
        handleConversationUpdated
      );
      chatSocket.on("chat:new_message", handleNewMessage);
      chatSocket.on("chat:typing", handleTyping);

      setConnectionStatus(
        chatSocket.connected ? "Connected" : "Connecting"
      );
    } catch (err) {
      setConnectionStatus("Connection issue");
      setError(err.message || "Could not connect to chat.");
    }

    return () => {
      active = false;

      if (chatSocket) {
        chatSocket.off("connect", handleConnect);
        chatSocket.off("disconnect", handleDisconnect);
        chatSocket.off("connect_error", handleConnectError);
        chatSocket.off(
          "chat:conversation_updated",
          handleConversationUpdated
        );
        chatSocket.off("chat:new_message", handleNewMessage);
        chatSocket.off("chat:typing", handleTyping);
      }
    };
  }, [addMessage, upsertConversation]);

  // Join the selected conversation when switching or reconnecting.
  useEffect(() => {
    if (!activeId) return;

    let chatSocket;

    try {
      chatSocket = connectChatSocket();
    } catch {
      return;
    }

    const joinSelected = () => {
      chatSocket.emit("chat:join", {
        conversationId: activeId,
      });
    };

    chatSocket.on("connect", joinSelected);

    if (chatSocket.connected) {
      joinSelected();
    }

    return () => {
      chatSocket.off("connect", joinSelected);
    };
  }, [activeId]);

  // Load a conversation and its message history.
  const openConversation = useCallback(async (conversation) => {
    if (!conversation?._id) return;

    const requestVersion = ++requestVersionRef.current;
    const previous = activeConversationRef.current;

    if (
      previous?._id &&
      String(previous._id) !== String(conversation._id)
    ) {
      try {
        const socket = connectChatSocket();
        socket.emit("chat:leave", {
          conversationId: previous._id,
        });
      } catch {
        // HTTP history can still be loaded.
      }
    }

    activeConversationRef.current = conversation;
    setActiveConversation(conversation);
    setMessages([]);
    setMessageText("");
    setTypingRole("");
    setError("");
    setNotice("");
    setLoadingMessages(true);

    try {
      const result = await apiRequest(
        `/chat/conversations/${conversation._id}/messages`
      );

      if (requestVersion !== requestVersionRef.current) return;

      const history = result?.messages || [];
      setMessages(history);

      const latestConversation = result?.conversation || conversation;

      setActiveConversation(latestConversation);
      activeConversationRef.current = latestConversation;
      upsertConversation(latestConversation);

      const socket = connectChatSocket();

      if (socket.connected) {
        socket.emit(
          "chat:join",
          { conversationId: conversation._id },
          (response) => {
            if (
              requestVersion === requestVersionRef.current &&
              !response?.success
            ) {
              setError(
                response?.message ||
                  "Could not join the live conversation."
              );
            }
          }
        );
      } else {
        setNotice(
          "History loaded. Waiting for the live connection."
        );
      }
    } catch (err) {
      if (requestVersion === requestVersionRef.current) {
        setError(err.message || "Could not load this conversation.");
      }
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoadingMessages(false);
      }
    }
  }, [upsertConversation]);

  // Scroll to the latest message.
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({
  //     behavior: "smooth",
  //     block: "end",
  //   });
  // }, [messages, typingRole]);
  useEffect(() => {
  messagesEndRef.current?.scrollIntoView({
    behavior: "auto",
    block: "end",
  });
}, [messages]);

  function notifyTyping(isTyping) {
    if (!activeConversation?._id) return;

    try {
      const socket = connectChatSocket();
      if (!socket.connected) return;

      socket.emit("chat:typing", {
        conversationId: activeConversation._id,
        isTyping,
      });
    } catch {
      // Typing indicators must not block sending messages.
    }
  }

  async function handleSend(event) {
    event.preventDefault();

    const text = messageText.trim();
    const selected = activeConversation;

    if (!text || !selected?._id || sendingRef.current) return;

    if (selected.status !== "open") {
      setError("This conversation is not open.");
      return;
    }

    let socket;

    try {
      socket = connectChatSocket();

      if (!socket.connected) {
        throw new Error("Chat is reconnecting. Please try again shortly.");
      }

      sendingRef.current = true;
      setSending(true);
      setError("");
      setNotice("");
      notifyTyping(false);

      const result = await new Promise((resolve, reject) => {
        socket.timeout(10000).emit(
          "chat:send",
          {
            conversationId: selected._id,
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

      setConversations((previous) =>
        previous.map((item) =>
          String(item._id) === String(selected._id)
            ? {
                ...item,
                lastMessage: result.message.text,
                lastMessageAt: result.message.createdAt,
                unreadByAdmin: 0,
              }
            : item
        )
      );
    } catch (err) {
      setError(err.message || "Could not send your message.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const matchesStatus =
        filter === "all" || conversation.status === filter;

      const customer = conversation.customer || {};

      const searchableText = [
        customer.name,
        customer.email,
        conversation.subject,
        conversation.lastMessage,
        conversation._id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && searchableText.includes(query);
    });
  }, [conversations, search, filter]);

  const openCount = conversations.filter(
    (item) => item.status === "open"
  ).length;

  const unreadCount = conversations.reduce(
    (total, item) => total + (item.unreadByAdmin || 0),
    0
  );

  return (
    <main className="abs-admin-chat">
      <header className="aac-page-header">
        <div>
          <span className="aac-eyebrow">ABS CUT MANAGEMENT</span>
          <h1>Customer Conversations</h1>
          <p>
            Manage customer enquiries and keep every conversation moving.
          </p>
        </div>

        <button
          type="button"
          className="aac-refresh-button"
          onClick={() => loadInbox(true)}
          disabled={refreshing}
        >
          <span className={refreshing ? "aac-spin" : ""}>↻</span>
          {refreshing ? "Refreshing..." : "Refresh inbox"}
        </button>
      </header>

      <section className="aac-stats">
        <article className="aac-stat-card">
          <span className="aac-stat-icon">✉</span>
          <div>
            <span className="aac-stat-label">Total conversations</span>
            <strong>{conversations.length}</strong>
          </div>
        </article>

        <article className="aac-stat-card">
          <span className="aac-stat-icon">◉</span>
          <div>
            <span className="aac-stat-label">Open conversations</span>
            <strong>{openCount}</strong>
          </div>
        </article>

        <article className="aac-stat-card">
          <span className="aac-stat-icon">✦</span>
          <div>
            <span className="aac-stat-label">Unread by admin</span>
            <strong>{unreadCount}</strong>
          </div>
        </article>

        <article className="aac-stat-card">
          <span
            className={`aac-connection-dot ${
              connectionStatus === "Connected" ? "is-connected" : ""
            }`}
          />
          <div>
            <span className="aac-stat-label">Live connection</span>
            <strong className="aac-connection-text">
              {connectionStatus}
            </strong>
          </div>
        </article>
      </section>

      {error && (
        <div className="aac-alert aac-alert-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {notice && (
        <div className="aac-alert aac-alert-notice" role="status">
          {notice}
        </div>
      )}

      <section className="aac-workspace">
        <aside className="aac-inbox">
          <div className="aac-inbox-heading">
            <div>
              <h2>Inbox</h2>
              <span>{filteredConversations.length} conversations</span>
            </div>
            <span className="aac-inbox-symbol">✉</span>
          </div>

          <label className="aac-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search customers..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search conversations"
            />
          </label>

          <div className="aac-filters">
            {FILTERS.map((item) => (
              <button
                type="button"
                key={item.value}
                className={filter === item.value ? "is-active" : ""}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="aac-conversation-list">
            {loadingInbox ? (
              <div className="aac-list-message">
                <span className="aac-loader" />
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="aac-list-empty">
                <span>✉</span>
                <strong>No conversations found</strong>
                <p>Try another search or filter.</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const name = getCustomerName(conversation);
                const isActive =
                  String(activeId) === String(conversation._id);

                return (
                  <button
                    type="button"
                    key={conversation._id}
                    className={`aac-conversation-item ${
                      isActive ? "is-active" : ""
                    }`}
                    onClick={() => openConversation(conversation)}
                  >
                    <span className="aac-avatar">{getInitials(name)}</span>

                    <span className="aac-conversation-details">
                      <span className="aac-conversation-top">
                        <strong>{name}</strong>
                        <time>
                          {formatTime(
                            conversation.lastMessageAt ||
                              conversation.updatedAt
                          )}
                        </time>
                      </span>

                      <span className="aac-subject">
                        {conversation.subject ||
                          "ABS CUT Customer Support"}
                      </span>

                      <span className="aac-last-message">
                        {conversation.lastMessage || "No messages yet"}
                      </span>

                      <span className="aac-conversation-bottom">
                        <span
                          className={`aac-status-pill status-${conversation.status}`}
                        >
                          {conversation.status || "open"}
                        </span>

                        {(conversation.unreadByAdmin || 0) > 0 && (
                          <span className="aac-unread-badge">
                            {conversation.unreadByAdmin}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="aac-chat-panel">
          {!activeConversation ? (
            <div className="aac-welcome">
              <div className="aac-welcome-icon">AC</div>
              <span className="aac-eyebrow">ABS CUT CUSTOMER CARE</span>
              <h2>Every conversation matters.</h2>
              <p>
                Select a customer from the inbox to read messages and
                respond to their enquiry.
              </p>
            </div>
          ) : (
            <>
              <header className="aac-chat-header">
                <div className="aac-chat-customer">
                  <span className="aac-avatar aac-avatar-large">
                    {getInitials(getCustomerName(activeConversation))}
                  </span>

                  <div>
                    <h2>{getCustomerName(activeConversation)}</h2>
                    <p>
                      {typeof activeConversation.customer === "object"
                        ? activeConversation.customer.email || ""
                        : ""}
                    </p>

                    <span
                      className={`aac-status-pill status-${activeConversation.status}`}
                    >
                      {activeConversation.status}
                    </span>
                  </div>
                </div>

                <div className="aac-chat-header-meta">
                  <span className="aac-chat-ref">
                    Ref: {String(activeConversation._id).slice(-8)}
                  </span>
                  <span>
                    Started {formatDate(activeConversation.createdAt)}
                  </span>
                </div>
              </header>

              <div className="aac-chat-topic">
                <span>✦</span>
                <div>
                  <strong>
                    {activeConversation.subject ||
                      "ABS CUT Customer Support"}
                  </strong>
                  <p>Keep replies clear, courteous, and helpful.</p>
                </div>
              </div>

              <div
                className="aac-messages"
                aria-live="polite"
                aria-relevant="additions"
              >
                {loadingMessages ? (
                  <div className="aac-list-message">
                    <span className="aac-loader" />
                    Loading message history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="aac-empty-messages">
                    <span>✉</span>
                    <h3>Start the conversation</h3>
                    <p>Send a friendly message to help this customer.</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const previousMessage = messages[index - 1];

                    const showDate =
                      !previousMessage ||
                      getMessageDay(previousMessage.createdAt) !==
                        getMessageDay(message.createdAt);

                    const isAdmin = message.senderRole === "admin";

                    return (
                      <div key={message._id}>
                        {showDate && (
                          <div className="aac-date-divider">
                            {formatMessageDate(message.createdAt)}
                          </div>
                        )}

                        <article
                          className={`aac-message-row ${
                            isAdmin ? "is-admin" : "is-customer"
                          }`}
                        >
                          <div className="aac-message-bubble">
                            <span className="aac-message-sender">
                              {isAdmin
                                ? message.sender?.name || "ABS CUT Support"
                                : message.sender?.name ||
                                  getCustomerName(activeConversation)}
                            </span>

                            <p>{message.text}</p>

                            <time
                              dateTime={message.createdAt}
                              title={formatMessageDate(message.createdAt)}
                            >
                              {formatTime(message.createdAt)}
                            </time>
                          </div>
                        </article>
                      </div>
                    );
                  })
                )}

                <div ref={messagesEndRef} />
              </div>

              {typingRole === "customer" && (
                <div className="aac-typing" role="status" aria-live="polite">
                  <span className="aac-typing-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  Customer is typing...
                </div>
              )}

              {activeConversation.status === "open" ? (
                <form className="aac-composer" onSubmit={handleSend}>
                  <textarea
                    value={messageText}
                    onChange={(event) => {
                      const value = event.target.value;
                      setMessageText(value);
                      notifyTyping(Boolean(value.trim()));
                    }}
                    onBlur={() => notifyTyping(false)}
                    placeholder="Write a reply to your customer..."
                    aria-label="Write a reply"
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

                  <div className="aac-composer-footer">
                    <span>Enter to send · Shift + Enter for a new line</span>

                    <button
                      type="submit"
                      disabled={!messageText.trim() || sending}
                    >
                      {sending ? "Sending..." : "Send reply"}
                      <span aria-hidden="true">➤</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="aac-closed-notice">
                  This conversation is {activeConversation.status}. New
                  messages are disabled until it is reopened.
                </div>
              )}
            </>
          )}
        </section>
      </section>
    </main>
  );
}

export default AdminChat;
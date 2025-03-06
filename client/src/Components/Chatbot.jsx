import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import Sidebar from "./Sidebar";
import ChatHistory from "./ChatHistory";
import '../styles.css';
import { v4 as uuidv4 } from "uuid";
import { useContext } from "react";
import { ThemeContext } from "./ThemeContext";

export default function Chatbot() {
  const navigate = useNavigate();
  const {isDarkMode} = useContext(ThemeContext);
  const [inputValue, setInputValue] = useState("");
  const name = localStorage.getItem("Name") || "User";
  const [messages, setMessages] = useState([
    { text: "Hi " + name + ", I am MediBot 😊", sender: "bot" }
  ]);

  const [showChatHistory, setShowChatHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState("");
  const [currentSessionTitle, setCurrentSessionTitle] = useState("New Chat");

  useEffect(() => {
    const storedMessages = JSON.parse(localStorage.getItem("chatMessages"));
    if (storedMessages) {
      setMessages(storedMessages);
    } else {
      const name = localStorage.getItem("Name") || "User";
      const initialMessage = [{ text: `Hi ${name}, I am MediBot 😊`, sender: "bot" }];
      setMessages(initialMessage);
      localStorage.setItem("chatMessages", JSON.stringify(initialMessage));
    }
  }, []);  // ✅ Runs only once when component mounts



  // Initialize session ID
  useEffect(() => {
    const storedSessionId = localStorage.getItem("chatSessionId");
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = uuidv4();
      setSessionId(newSessionId);
      localStorage.setItem("chatSessionId", newSessionId);
    }
  }, []);

  // Fetch chat sessions when component mounts
  useEffect(() => {
    fetchChatSessions();
  }, []);

  // Function to fetch chat sessions from backend
  const fetchChatSessions = async () => {
    const userId = localStorage.getItem("Email");
    if (!userId) {
      console.error("User not authenticated");
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/sessions?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      const sessions = await response.json();

      // Format sessions for display
      const formattedSessions = sessions.map(session => ({
        id: session.id || session.sessionId,
        title: session.title || `Chat ${new Date(session.timestamp || session.createdAt).toLocaleDateString()}`,
        date: new Date(session.timestamp || session.createdAt).toLocaleDateString(),
        preview: session.preview || "Click to view chat"
      }));

      setChatHistory(formattedSessions);
    } catch (error) {
      console.error("Failed to fetch sessions", error);
      setError("Failed to load chat history. Please try again.");
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userId = localStorage.getItem("Email");
    if (!userId) {
      setError("User not authenticated. Please log in again.");
      navigate('/login');
      return;
    }

    const userMessage = { text: inputValue, sender: "user" };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    try {
      let currentTitle = currentSessionTitle;
      if (currentSessionTitle === "New Chat" && messages.length === 1) {
        currentTitle = inputValue.length > 30 ? inputValue.substring(0, 30) + "..." : inputValue;
        setCurrentSessionTitle(currentTitle);
        localStorage.setItem("chatSessionTitle", currentTitle); // ✅ Store title
      }

      const response = await fetch("http://127.0.0.1:8000/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          message: inputValue,
          sessionId,
          title: currentTitle
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const botMessage = { text: data.response, sender: "bot" }; // ✅ Defined inside try block

      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, botMessage];
        localStorage.setItem("chatMessages", JSON.stringify(updatedMessages)); // ✅ Store messages
        return updatedMessages;
      });

    } catch (err) {
      setError("Failed to get response. Please try again.");
      console.error("Chat API Error:", err);
    } finally {
      setIsLoading(false);
    }
  };


  // Function to start a new chat
  const handleRefreshChat = () => {
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    localStorage.setItem("chatSessionId", newSessionId);

    const initialMessage = [{ text: "Hi " + name + ", I am MediBot 😊", sender: "bot" }];
    setMessages(initialMessage);
    localStorage.setItem("chatMessages", JSON.stringify(initialMessage));  // ✅ Save messages

    setCurrentSessionTitle("New Chat");
    localStorage.setItem("chatSessionTitle", "New Chat");

    if (showChatHistory) {
      setShowChatHistory(false);
    }
  };


  // Function to toggle chat history panel
  const handleToggleChatHistory = () => {
    setShowChatHistory(!showChatHistory);
    if (!showChatHistory) {
      fetchChatSessions();
    }
  };

  // Function to share chat (placeholder)
  const handleShareChat = () => {
    if (messages.length <= 1) {
      alert("Start a conversation first before sharing!");
      return;
    }

    // Create a formatted text version of the chat
    const chatText = messages.map(msg =>
      `${msg.sender === 'user' ? name : 'MediBot'}: ${msg.text}`
    ).join('\n\n');

    // Use the Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: 'My MediBot Conversation',
        text: chatText
      }).catch(err => {
        console.error('Error sharing:', err);
        alert("Couldn't share the chat. Copy feature coming soon!");
      });
    } else {
      alert("Sharing feature coming soon!");
    }
  };

  const loadChat = async (selectedSessionId) => {
    try {
      setIsLoading(true);
      const userId = localStorage.getItem("Email");

      const response = await fetch(`http://127.0.0.1:8000/api/chat/${selectedSessionId}?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) throw new Error("Failed to fetch chat history");

      const chatData = await response.json();

      // Update the session ID
      setSessionId(selectedSessionId);
      localStorage.setItem("chatSessionId", selectedSessionId);

      // Find the chat in history to get its title
      const selectedChat = chatHistory.find(chat => chat.id === selectedSessionId);
      if (selectedChat) {
        setCurrentSessionTitle(selectedChat.title);
      }

      // Format messages if they're not already in the right format
      const formattedMessages = Array.isArray(chatData.messages)
        ? chatData.messages
        : chatData.map(msg => ({
            text: msg.content || msg.text,
            sender: msg.role === 'user' ? 'user' : 'bot'
          }));

      if (formattedMessages.length === 0) {
        // If no messages, initialize with greeting
        setMessages([{ text: "Hi " + name + ", I am MediBot 😊", sender: "bot" }]);
      } else {
        setMessages(formattedMessages);
      }

      // Close chat history panel
      setShowChatHistory(false);
    } catch (error) {
      console.error("Error loading chat history:", error);
      setError("Failed to load chat. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleVoice = () => {
    navigate("/voice");
  };

  const handleChatbot = () => {
    navigate("/chatbot");
  };

  return (
<div className={`min-h-screen flex ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}>
  <Sidebar
    handleRefreshChat={handleRefreshChat}
    handleToggleChatHistory={handleToggleChatHistory}
    handleShareChat={handleShareChat}
    isDarkMode={isDarkMode}
    handleLogin={handleLogin}
    showChatHistory={showChatHistory}
    handleVoice={handleVoice}
    handleChatbot={handleChatbot}
  />

  {showChatHistory && (
    <ChatHistory
      chatHistory={chatHistory}
      loadChat={loadChat}
      handleToggleChatHistory={handleToggleChatHistory}
      currentSessionId={sessionId}
      isDarkMode={isDarkMode}
      handleRefreshChat={handleRefreshChat}
    />
  )}

<div className={`flex-1 flex flex-col h-screen ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-800"}`}>
  <div className={`border-b p-3 text-center ${isDarkMode ? "border-gray-700 bg-gray-800 text-gray-200" : "border-gray-200 bg-gray-50 text-gray-800"}`}>
    <h2 className="font-medium">{currentSessionTitle || "New Chat"}</h2>
  </div>


    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <ChatMessages messages={messages} isLoading={isLoading} error={error} />
    </div>

    <ChatInput
      handleSendMessage={handleSendMessage}
      inputValue={inputValue}
      setInputValue={setInputValue}
      isLoading={isLoading}
    />
  </div>
</div>
  )
}
import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";
import { FaCopy, FaUsers, FaBars, FaVideo, FaVideoSlash } from "react-icons/fa";
import Whiteboard from "./components/Whiteboard";
import VideoCallSidebar from "./components/VideoCallSidebar";
import VideoCall from "./components/VideoCall";

import { v4 as uuid } from "uuid";
import logo from "./assets/web-logo.png";

const socket = io("http://localhost:5000");

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// start code here");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [pageTheme, setPageTheme] = useState("vs-dark");
  const [output, setOutput] = useState("");
  const [version, setVersion] = useState("18.15.0");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [videoCallRoomId, setVideoCallRoomId] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [userInput, setUserInput] = useState("");

  const currentRoom = useRef("");
  const currentUser = useRef("");

  useEffect(() => {
    socket.on("userJoined", (updatedUsers) => {
      if (Array.isArray(updatedUsers)) {
        setUsers(updatedUsers.filter((u) => typeof u === "string"));
      }
    });

    socket.on("userLeft", ({ userName, reason }) => {
      const message = reason === "left" ? `${userName} left the room` : `${userName} disconnected`;
      const id = Date.now();
      setNotifications(prev => [...prev, { id, message, type: "info" }]);
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 3000);
    });

    socket.on("codeUpdate", (newCode) => {
      if (newCode !== code) setCode(newCode);
    });

    socket.on("userTyping", (user) => {
      setTyping(`${user.slice(0, 8)}... is typing`);
      setTimeout(() => setTyping(""), 2000);
    });

    socket.on("toggledWhiteboard", ({visible}) => {
      setShowWhiteboard(visible);
    });

    socket.on("languageUpdate", (lang) => setLanguage(lang));
    socket.on("codeResponse", (res) => setOutput(res.run.output));
    socket.on("outputUpdate", (out) => setOutput(out));

    // Video call synchronization
    socket.on("toggleVideoCall", ({ visible, roomId: callRoomId }) => {
      setShowVideoCall(visible);
      if (callRoomId) {
        setVideoCallRoomId(callRoomId);
      }
    });

    socket.on("videoCallEnded", ({ roomId: endedRoomId }) => {
      if (endedRoomId === videoCallRoomId) {
        setShowVideoCall(false);
        setVideoCallRoomId("");
      }
    });

    return () => {
      socket.off("userJoined");
      socket.off("userLeft");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("codeResponse");
      socket.off("outputUpdate");
      socket.off("toggledWhiteboard");
      socket.off("toggleVideoCall");
      socket.off("videoCallEnded");
    };
  }, [code, videoCallRoomId]);

  useEffect(() => {
    const leave = () => socket.emit("leaveRoom");
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, []);

  const joinRoom = () => {
    if (roomId && userName) {
      currentRoom.current = roomId;
      currentUser.current = userName;
      socket.emit("join", { roomId, userName });
      socket.emit("getWhiteboardState", { roomId });
      setJoined(true);
    }
  };

  const leaveRoom = () => {
    if (showVideoCall) {
      socket.emit("endVideoCall", { roomId: videoCallRoomId });
    }
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("// start code here");
    setLanguage("javascript");
    setVersion("18.15.0");
    setShowVideoCall(false);
    setVideoCallRoomId("");
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied!");
    setTimeout(() => setCopySuccess(""), 2000);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName });
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    const versions = {
      javascript: "18.15.0",
      python: "3.10.0",
      java: "15.0.2",
      cpp: "10.2.0",
      c: "10.2.0",
    };
    setVersion(versions[newLang] || "*");
    socket.emit("languageChange", { roomId, language: newLang });
  };

  const toggleTheme = () => {
    setPageTheme((prev) => (prev === "vs-dark" ? "light" : "vs-dark"));
  };

  const runCode = () => {
    if (roomId && code && language) {
      socket.emit("compileCode", {
        code,
        roomId,
        language,
        version,
        input: userInput,
      });
    }
  };

  const generateRoomId = () => {
    const newId = uuid();
    setRoomId(newId);
  };

  const toggleWhiteboard = () => {
    if (roomId) {
      const newVisibility = !showWhiteboard;
      setShowWhiteboard(newVisibility);
      socket.emit("toggleWhiteboard", { roomId, visible: newVisibility });
    }
  };

  const toggleVideoCall = () => {
    if (roomId) {
      const newVisibility = !showVideoCall;
      const callRoomId = `video-${roomId}`;
      
      setShowVideoCall(newVisibility);
      setVideoCallRoomId(callRoomId);
      setSidebarOpen(true); // Open sidebar when video call starts

      // Emit toggleVideoCall with correct keys to avoid overwriting roomId
      socket.emit("toggleVideoCall", { 
        roomId: roomId, 
        visible: newVisibility, 
        callRoomId: callRoomId 
      });
    }
  };

  const handleEndVideoCall = () => {
    if (videoCallRoomId) {
      socket.emit("endVideoCall", { roomId: videoCallRoomId });
      setShowVideoCall(false);
      setVideoCallRoomId("");
    }
  };

  if (!joined) {
    return (
      <div className="join-container">
        <img src={logo} alt="Logo" className="website-logo" style={{ position: 'absolute', top: '15px', left: '15px', margin: '0', zIndex: '1000' }} />
        <div className="join-form">
          <h1>Join Code Room</h1>
          <input
            placeholder="Room Id"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={generateRoomId}>Generate ID</button>
          <input
            placeholder="Your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container" style={{ display: 'flex', flexDirection: 'row' }}>
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <FaBars />
      </button>

      {/* Notifications */}
      <div className="notifications-container">
        {notifications.map((notification) => (
          <div key={notification.id} className="notification">
            {notification.message}
          </div>
        ))}
      </div>

      {sidebarOpen && (
        <div className="sidebar" style={{ flex: '0 0 300px', position: 'relative' }}>
          <img src={logo} alt="Logo" className="website-logo fixed" />
          <div className="room-info">
            <h2>
              <FaUsers /> Code Room: {roomId}
              <button onClick={copyRoomId} className="copy-button">
                <FaCopy />
              </button>
              {copySuccess && <span className="copy-success">{copySuccess}</span>}
            </h2>
            <button onClick={toggleTheme} className="theme-toggle-button">
              Toggle Theme
            </button>
            <span className="theme-label">
              Current: {pageTheme === "vs-dark" ? "Dark" : "Light"}
            </span>
          </div>
          <h3>Users in Room:</h3>
          <ul>{users.map((u, i) => <li key={i}>{u.slice(0, 8)}</li>)}</ul>
          <p className="typing-indicator">{typing}</p>
          <button className="leave-button" onClick={leaveRoom}>Leave Room</button>

          {/* Video Call Sidebar */}
          {showVideoCall && (
            <div style={{ 
              position: 'absolute',    
              top: 0,
              right: 0,            
              height: '50vh',  
              width: '50px',        
              zIndex: 1001,
                
              boxShadow: '0 0 10px rgba(0,0,0,0.3)' 
            }}>
              <VideoCallSidebar 
                roomId={videoCallRoomId} 
                userId={userName} 
                isOpen={true} 
                onToggleOpen={setSidebarOpen} 
              />
            </div>
          )}
        </div>
      )}

      <div className="editor-wrapper">
        <div className="top-control-bar">
          <button className="run-btn1" onClick={runCode}>Execute</button>
          <button className="run-btn2" onClick={toggleWhiteboard}>
            {showWhiteboard ? "Hide Whiteboard" : "Show Whiteboard"}
          </button>

          <button className="video-call-btn" onClick={toggleVideoCall}>
            {showVideoCall ? <FaVideoSlash /> : <FaVideo />}
            {showVideoCall ? "End Call" : "Video Call"}
          </button>
          
          {showVideoCall && (
            <button className="run-btn2" onClick={handleEndVideoCall}>
              Close Video
            </button>
          )}
          
          <select className="language-selector" value={language} onChange={handleLanguageChange}>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
          </select>
        </div>

        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme={pageTheme}
          options={{ minimap: { enabled: false }, fontSize: 14 }}
        />

        <textarea
          className="input-console"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter input here..."
        />

        <div className="output-section">
          <textarea
            className="output-console"
            value={output}
            readOnly
            placeholder="Output will appear here"
          />
        </div>
      </div>

      {/* Floating Whiteboard */}
      <Whiteboard visible={showWhiteboard} roomId={roomId} />
    </div>
  );
};

export default App;

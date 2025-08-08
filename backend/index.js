import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const server = http.createServer(app);

const url = `https://render-hosting-se2b.onrender.com`;
const interval = 30000;

function reloadWebsite() {
  axios
    .get(url)
    .then((response) => {
      console.log("website reloded");
    })
    .catch((error) => {
      console.error(`Error : ${error.message}`);
    });
}

setInterval(reloadWebsite, interval);



app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
  credentials: true,
}));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Enhanced room state management
const rooms = new Map();
const roomData = new Map();
const roomWhiteboardState = new Map();
const roomVideoCallState = new Map();
const roomWhiteboardData = new Map();
const roomVideoCallData = new Map();
const roomUsers = new Map();

// User call state
const activeCalls = new Map();
const userCallStatus = new Map();

io.on("connection", (socket) => {
  console.log("✅ User Connected:", socket.id);

  let currentRoom = null;
  let currentUser = null;

  socket.on("join", async ({ roomId, userName }) => {
    if (!roomId || !userName) return;

    // Leave previous room (if any)
    if (currentRoom) {
      socket.leave(currentRoom);
      if (rooms.has(currentRoom)) {
        rooms.get(currentRoom).users.delete(currentUser);
        io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom).users));
        io.to(currentRoom).emit("userLeft", { userName: currentUser, reason: "left" });
      }
    }

    currentRoom = roomId;
    currentUser = userName;
    socket.join(roomId);

    // Initialize room structures
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { 
        users: new Set(), 
        code: "// write code here",
        whiteboard: {
          shapes: [],
          drawings: [],
          users: []
        },
        videoCall: {
          active: false,
          participants: []
        }
      });
    }

    if (!roomData.has(roomId)) {
      roomData.set(roomId, {
        code: "// write code here",
        language: "javascript",
        output: "",
      });
    }

    // Initialize whiteboard state
    if (!roomWhiteboardState.has(roomId)) {
      roomWhiteboardState.set(roomId, false);
      roomWhiteboardData.set(roomId, {
        shapes: [],
        drawings: [],
        users: []
      });
    }

    // Initialize video call state
    if (!roomVideoCallState.has(roomId)) {
      roomVideoCallState.set(roomId, false);
      roomVideoCallData.set(roomId, {
        active: false,
        participants: []
      });
    }

    // Add user to room
    rooms.get(roomId).users.add(userName);
    
    // Sync all states to the newly joined client
    const room = rooms.get(roomId);
    const data = roomData.get(roomId);
    
    // Sync code
    socket.emit("codeUpdate", data.code);
    socket.emit("languageUpdate", data.language);
    socket.emit("outputUpdate", data.output);
    
    // Sync whiteboard state
    socket.emit("toggledWhiteboard", { 
      visible: roomWhiteboardState.get(roomId),
      shapes: roomWhiteboardData.get(roomId).shapes,
      drawings: roomWhiteboardData.get(roomId).drawings
    });
    
    // Sync video call state
    socket.emit("toggleVideoCall", { 
      visible: roomVideoCallState.get(roomId),
      participants: roomVideoCallData.get(roomId).participants
    });

    // Send user list
    socket.emit("userJoined", Array.from(room.users));
    
    // Broadcast to others
    io.to(roomId).emit("userJoined", Array.from(room.users));
    io.to(roomId).emit("userListUpdated", {
      users: Array.from(room.users),
      count: room.users.size
    });
  });

  // Enhanced whiteboard synchronization
  socket.on("whiteboardJoin", (roomId) => {
    if (!roomId) return;
    
    socket.join(roomId);
    
    // Send current whiteboard state to new user
    const whiteboardData = roomWhiteboardData.get(roomId) || { shapes: [], drawings: [], users: [] };
    socket.emit("whiteboardStateSync", whiteboardData);
    
    // Add user to whiteboard users
    if (!whiteboardData.users.find(u => u.id === socket.id)) {
      whiteboardData.users.push({
        id: socket.id,
        name: currentUser || `User ${socket.id.slice(-4)}`,
        cursor: { x: 0, y: 0 }
      });
      roomWhiteboardData.set(roomId, whiteboardData);
    }
    
    socket.to(roomId).emit("userJoinedWhiteboard", {
      id: socket.id,
      name: currentUser || `User ${socket.id.slice(-4)}`
    });
  });

  // Enhanced whiteboard drawing
  socket.on("draw", ({ roomId, x0, y0, x1, y1, color, tool, width }) => {
    if (!roomId || !roomWhiteboardData.has(roomId)) return;
    
    const drawing = {
      id: Date.now() + Math.random(),
      x0, y0, x1, y1, color, tool, width,
      userId: socket.id,
      timestamp: Date.now()
    };
    
    const whiteboardData = roomWhiteboardData.get(roomId);
    whiteboardData.drawings.push(drawing);
    roomWhiteboardData.set(roomId, whiteboardData);
    
    socket.to(roomId).emit("draw", drawing);
  });

  // Enhanced shape drawing
  socket.on("shapeDraw", ({ roomId, ...shapeData }) => {
    if (!roomId || !roomWhiteboardData.has(roomId)) return;
    
    const shape = {
      ...shapeData,
      id: Date.now() + Math.random(),
      userId: socket.id,
      timestamp: Date.now()
    };
    
    const whiteboardData = roomWhiteboardData.get(roomId);
    whiteboardData.shapes.push(shape);
    roomWhiteboardData.set(roomId, whiteboardData);
    
    socket.to(roomId).emit("shapeDraw", shape);
  });

  // Enhanced whiteboard state management
  socket.on("toggleWhiteboard", ({ roomId, visible }) => {
    if (typeof visible === "boolean") {
      roomWhiteboardState.set(roomId, visible);
      roomWhiteboardData.set(roomId, {
        shapes: [],
        drawings: [],
        users: roomWhiteboardData.get(roomId)?.users || []
      });
      
      io.to(roomId).emit("toggledWhiteboard", { 
        visible,
        shapes: roomWhiteboardData.get(roomId).shapes,
        drawings: roomWhiteboardData.get(roomId).drawings
      });
    }
  });

  // Enhanced video call synchronization
  socket.on("toggleVideoCall", ({ roomId, visible }) => {
    if (typeof visible === "boolean") {
      roomVideoCallState.set(roomId, visible);
      roomVideoCallData.set(roomId, {
        active: visible,
        participants: roomVideoCallData.get(roomId)?.participants || []
      });
      
      io.to(roomId).emit("toggleVideoCall", { 
        visible,
        participants: roomVideoCallData.get(roomId).participants
      });
    }
  });

  // Video call participant management
  socket.on("joinVideoCall", ({ roomId, userName }) => {
    if (!roomId || !userName) return;
    
    const videoCallData = roomVideoCallData.get(roomId);
    if (videoCallData && !videoCallData.participants.find(p => p.id === socket.id)) {
      videoCallData.participants.push({
        id: socket.id,
        name: userName,
        joinedAt: Date.now()
      });
      roomVideoCallData.set(roomId, videoCallData);
      
      io.to(roomId).emit("videoCallParticipantsUpdated", {
        participants: videoCallData.participants
      });
    }
  });

  socket.on("leaveVideoCall", ({ roomId }) => {
    if (!roomId) return;
    
    const videoCallData = roomVideoCallData.get(roomId);
    if (videoCallData) {
      videoCallData.participants = videoCallData.participants.filter(p => p.id !== socket.id);
      roomVideoCallData.set(roomId, videoCallData);
      
      io.to(roomId).emit("videoCallParticipantsUpdated", {
        participants: videoCallData.participants
      });
    }
  });

  // Enhanced code synchronization
  socket.on("codeChange", async ({ roomId, code }) => {
    if (!roomId || typeof code !== "string") return;

    if (rooms.has(roomId)) {
      rooms.get(roomId).code = code;
    }
    if (roomData.has(roomId)) {
      roomData.get(roomId).code = code;
    }

    socket.to(roomId).emit("codeUpdate", code);
  });

  // User presence management
  socket.on("leaveRoom", async () => {
    if (currentRoom && currentUser) {
      if (rooms.has(currentRoom)) {
        rooms.get(currentRoom).users.delete(currentUser);
        io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom).users));
        io.to(currentRoom).emit("userLeft", { userName: currentUser, reason: "left" });
        io.to(currentRoom).emit("userListUpdated", {
          users: Array.from(rooms.get(currentRoom).users),
          count: rooms.get(currentRoom).users.size
        });
      }
      socket.leave(currentRoom);
      
      currentRoom = null;
      currentUser = null;
    }
  });

  socket.on("disconnect", async () => {
    if (currentRoom && currentUser) {
      if (rooms.has(currentRoom)) {
        rooms.get(currentRoom).users.delete(currentUser);
        io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom).users));
        io.to(currentRoom).emit("userLeft", { userName: currentUser, reason: "disconnected" });
        io.to(currentRoom).emit("userListUpdated", {
          users: Array.from(rooms.get(currentRoom).users),
          count: rooms.get(currentRoom).users.size
        });
      }
    }
    console.log("🔌 User Disconnected:", socket.id);
  });
});

// Static Frontend Serving
const port = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, "frontend", "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

server.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

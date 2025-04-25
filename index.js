import express from "express";
import bodyParser from "body-parser";
import { Server } from "socket.io";
import http from "http";

const io = new Server({
  cors: {
    origin: "*",
  },
});

const app = express();
app.use(bodyParser.json());

const emailToSocket = new Map();
const SocketToemail = new Map();

io.on("connection", (socket) => {
  console.log("New socket connection:", socket.id);

  socket.on("join-room", (data) => {
    const { roomId, emailId } = data;
    console.log(`User with this email ${emailId} joined room ${roomId}`);
      
    if (!emailId) {
      console.log("Error: emailId is missing!");
      return;
    }
      
    emailToSocket.set(emailId, socket.id);
    SocketToemail.set(socket.id, emailId);
      
    console.log("Updated emailToSocket:", emailToSocket);
    console.log("Updated SocketToemail:", SocketToemail);
      
    socket.join(roomId);
    socket.emit("joined-room", { roomId, emailId });
    socket.broadcast.to(roomId).emit("user-joined", { emailId });
  });
    
  socket.on("call-user", (data) => {
    console.log("call-user event received:", data);
    const { emailId, offer } = data;
    const fromEmail = SocketToemail.get(socket.id);
    const socketId = emailToSocket.get(emailId);
    
    if (socketId) {
      console.log(`Forwarding call from ${fromEmail} to ${emailId}`);
      socket.to(socketId).emit("incoming-call", { from: fromEmail, offer });
    } else {
      console.log("Socket ID not found for email:", emailId);
    }
  });
  
  socket.on("call-accepted", (data) => {
    console.log("call-accepted event received:", data);
    const { emailId, ans } = data;
    const socketId = emailToSocket.get(emailId);
    if (socketId) {
      console.log(`Forwarding call acceptance to ${emailId}`);
      socket.to(socketId).emit("call-accepted", { ans });
    }
  });
  
  socket.on("ice-candidate", (data) => {
    console.log("ice-candidate event received");
    const { candidate, emailId } = data;
    const socketId = emailToSocket.get(emailId);
    
    if (socketId) {
      console.log(`Forwarding ICE candidate to ${emailId}`);
      socket.to(socketId).emit("ice-candidate", {
        candidate,
        from: SocketToemail.get(socket.id)
      });
    }
  });

  socket.on("disconnect", () => {
    const email = SocketToemail.get(socket.id);
    if (email) {
      console.log(`User ${email} disconnected`);
      emailToSocket.delete(email);
      SocketToemail.delete(socket.id);
    }
  });
});

app.listen(8000, () => {
  console.log("HTTP Server is running on port 8000");
});

io.listen(8001, () => {
  console.log("Socket.IO server is running on port 8001");
});

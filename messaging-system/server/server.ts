import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { messages } from './schema'; 
import { and, eq, desc, or } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

const onlineUsers: { [key: string]: string } = {}; 

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
    if (req.file) {
        res.json({ fileUrl: `/uploads/${req.file.filename}` });
    } else {
        res.status(400).send('No file uploaded.');
    }
});

// Get messages with pagination
app.get('/messages/:senderId/:receiverId', async (req: Request, res: Response) => {
  const { senderId, receiverId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  try {
      const messageList = await db.select()
          .from(messages)
          .where(
              or(
                  and(eq(messages.senderId, parseInt(senderId)), eq(messages.receiverId, parseInt(receiverId))),
                  and(eq(messages.senderId, parseInt(receiverId)), eq(messages.receiverId, parseInt(senderId)))
              )
          )
          .orderBy(desc(messages.createdAt))
          .limit(limit)
          .offset(offset);

      res.json({ messages: messageList.reverse() }); // Ensure it's sent as an array
  } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Error fetching messages' });
  }
});


// Socket.IO connection
io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // Register user and notify others
    socket.on('registerUser', (userId: string) => {
        onlineUsers[userId] = socket.id;
        io.emit('userStatus', { userId, status: 'online' });
    });

    // Join a room when a user selects a chat
    socket.on('joinChat', (chatId: string) => {
        socket.join(chatId);
        console.log(`User ${socket.id} joined chat room: ${chatId}`);
    });

    // Handle incoming messages
    socket.on('sendMessage', async (data: { content: string; senderId: number; receiverId: number; type: string }) => {
        const { content, senderId, receiverId, type } = data;

        try {
            // Save the message to the database
            const [newMessage] = await db.insert(messages).values({
                content,
                senderId,
                receiverId,
                createdAt: new Date(),
                read: false,
                //type
            }).returning();

            // Emit the message to the sender
            socket.emit('message', { ...newMessage, isSent: true });

            // Emit the message to the receiver's room
            socket.to(receiverId.toString()).emit('message', { ...newMessage, isSent: false });
        } catch (error) {
            console.error('Error saving message to the database:', error);
        }
    });

    // Mark messages as read
    socket.on('readMessages', async (receiverId: number, senderId: number) => {
        try {
            await db.update(messages)
                .set({ read: true })
                .where(and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId)));
            
            // Notify the sender that their messages have been read
            io.to(senderId.toString()).emit('messagesRead', receiverId);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    });

    // Handle typing indicator
    socket.on('typing', (data: { isTyping: boolean; receiverId: string; senderId: string }) => {
        socket.to(data.receiverId).emit('typing', { isTyping: data.isTyping, senderId: data.senderId });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        // Remove user from online users
        for (const userId in onlineUsers) {
            if (onlineUsers[userId] === socket.id) {
                delete onlineUsers[userId];
                io.emit('userStatus', { userId, status: 'offline' });
                break;
            }
        }
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
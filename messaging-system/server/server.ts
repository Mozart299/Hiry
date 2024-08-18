import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { messages } from './schema'; // Import your messages schema
import { and, eq } from 'drizzle-orm';

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

const onlineUsers: { [key: string]: string } = {}; // Store user IDs and their socket IDs

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
    socket.on('sendMessage', async (data: { text: string; senderId: number; receiverId: number }) => {
        const { text, senderId, receiverId } = data;

        try {
            // Save the message to the database
            await db.insert(messages).values({
                content: text,
                senderId,
                receiverId,
                createdAt: new Date(),
                read: false, // Set to false initially
            });

            // Emit the message to the sender
            socket.emit('message', { content: text, isSent: true });

            // Emit the message to the receiver's room
            socket.to(receiverId.toString()).emit('message', { content: text, isSent: false, senderId });
        } catch (error) {
            console.error('Error saving message to the database:', error);
        }
    });

    // Mark messages as read
    socket.on('readMessages', async (receiverId: number, senderId: number) => {
        await db.update(messages)
            .set({ read: true })
            .where(and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId)));
    });

    // Handle typing indicator
    socket.on('typing', (data: { isTyping: boolean; receiverId: string }) => {
        socket.to(data.receiverId).emit('typing', { isTyping: data.isTyping });
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
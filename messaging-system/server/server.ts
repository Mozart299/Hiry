import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import { Pool } from 'pg';
import morgan from 'morgan';
import routes from './router';
import { messages, users } from './schema';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173', 
        methods: ['GET', 'POST'],
    },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // HTTP request logging
app.use('/api', routes);

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

pool.connect()
  .then(() => {
    console.log('Connected to the PostgreSQL database successfully');
  })
  .catch((error) => {
    console.error('Error connecting to the PostgreSQL database:', error);
  });

// Test database connection
app.get('/test-db', async (req, res) => {
    try {
        const result = await db.select().from(users).limit(1);
        if (result.length > 0) {
            res.status(200).send('Database connected and users table is accessible');
        } else {
            res.status(200).send('Database connected but no users found');
        }
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).send('Database connection failed');
    }
});

// Fetch messages between two users
app.get('/api/messages/:senderId/:receiverId', async (req: Request, res: Response) => {
    const { senderId, receiverId } = req.params;

    try {
        const messageList = await db.select().from(messages)
            .where(
                and(
                    eq(messages.senderId, parseInt(senderId)),
                    eq(messages.receiverId, parseInt(receiverId))
                )
            )
            .orderBy(messages.createdAt);
        
        res.json(messageList);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Error fetching messages' });
    }
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // Handle incoming messages
socket.on('sendMessage', async (data: { text: string }) => {
  const { text } = data;

  try {
      // Save the message to the database
      await db.insert(messages).values({
          content: text,
          createdAt: new Date(),
      });

      // Emit the message to the sender
      socket.emit('message', { content: text, isSent: true });

      // Emit the message to the receiver
      // You'll need to determine the receiverId based on the selected chat
      // socket.to(receiverId.toString()).emit('message', { content: text, isSent: false });
  } catch (error) {
      console.error('Error saving message to the database:', error);
  }
});
    // Handle typing indicator
    socket.on('typing', (data: { isTyping: boolean, receiverId: string }) => {
        const { isTyping, receiverId } = data;

        // Broadcast typing status to the receiver
        if (receiverId) {
            socket.to(receiverId).emit('typing', { isTyping });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
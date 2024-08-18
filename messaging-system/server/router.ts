import express from 'express';
import { db } from './server';
import { users, messages } from './schema';
import { eq, and, inArray } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { body, param, validationResult } from 'express-validator';
import { Server } from 'socket.io';

interface MessageRequestParams {
    senderId: string; 
    receiverId: string;
}

const router = express.Router();

// User registration
router.post(
  '/register',
  body('username').isString().notEmpty(),
  body('password').isString().isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await db.insert(users).values({ username, password: hashedPassword }).returning();
      res.status(201).json(newUser[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Error creating user' });
    }
  }
);

// Get all users
router.get('/users', async (req, res) => {
    try {
      const userList = await db.select().from(users).orderBy(users.createdAt);
      res.json(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Error fetching users' });
    }
});

// Get messages between two users
router.get(
    '/messages/:senderId/:receiverId',
    param('senderId').isInt(),
    param('receiverId').isInt(),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      const { senderId, receiverId } = req.params as MessageRequestParams;
  
      try {
        const messageList = await db
          .select()
          .from(messages)
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
    }
);

// Mark messages as read
router.put(
    '/messages/read',
    body('messageIds').isArray().notEmpty(),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      const { messageIds } = req.body;
      try {
        await db.update(messages)
            .set({ read: true })
            .where(inArray(messages.id, messageIds));
        res.sendStatus(200);
      } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Error marking messages as read' });
      }
    }
);

// Handle real-time user status and messages (Socket.IO)
const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle joining a chat room
    socket.on('joinChat', (chatId) => {
      socket.join(chatId);
      console.log(`User joined chat: ${chatId}`);
    });

    // Handle sending messages
    socket.on('sendMessage', async (data) => {
      const { senderId, receiverId, text } = data;
      try {
        const newMessage = await db.insert(messages).values({
          content: text,
          senderId: parseInt(senderId),
          receiverId: parseInt(receiverId),
          read: false,
        }).returning();

        // Emit the message to both sender and receiver
        io.to(receiverId).emit('message', newMessage[0]);
        socket.emit('message', newMessage[0]); // Emit to sender's own chat window
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });

    // Handle typing status
    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      io.to(receiverId).emit('typing', { isTyping });
    });

    // Handle user status changes (online/offline)
    socket.on('userStatus', (data) => {
      const { userId, status } = data;
      io.emit('userStatus', { userId, status });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

export { router, setupSocketHandlers };

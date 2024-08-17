import express from 'express';
import { db } from './server';
import { users, messages } from './schema';
import { eq, and, inArray } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { body, param, validationResult } from 'express-validator';

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
      const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
      const newUser = await db.insert(users).values({ username, password: hashedPassword }).returning();
      res.status(201).json(newUser[0]);
    } catch (error) {
      console.error(error); // Log the error for debugging
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
      console.error(error);
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
  
      // Destructure with type assertion
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
        console.error(error); // Log the error for debugging
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
        // Use the in method to mark multiple messages as read
        await db.update(messages)
            .set({ read: true })
            .where(inArray(messages.id, messageIds));
        res.sendStatus(200);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error marking messages as read' });
      }
    }
);

export default router;
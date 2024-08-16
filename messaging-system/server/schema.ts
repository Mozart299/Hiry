import { pgTable, serial, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id').references(() => users.id), // Use integer for foreign keys
  receiverId: integer('receiver_id').references(() => users.id), // Use integer for foreign keys
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  read: boolean('read').default(false),
});

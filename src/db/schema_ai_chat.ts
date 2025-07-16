import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const ai_chats = sqliteTable("ai_chats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const ai_messages = sqliteTable("ai_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: integer("chat_id")
    .notNull()
    .references(() => ai_chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  files: text("files", { mode: "json" }), // Array of file IDs or metadata
});

export const ai_files = sqliteTable("ai_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  messageId: integer("message_id")
    .notNull()
    .references(() => ai_messages.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  path: text("path").notNull(),
  size: integer("size").notNull(),
  extractedText: text("extracted_text"), // Truncated to 2000 chars
});

// Relations
export const aiChatsRelations = relations(ai_chats, ({ many }) => ({
  messages: many(ai_messages),
}));

export const aiMessagesRelations = relations(ai_messages, ({ many, one }) => ({
  files: many(ai_files),
  chat: one(ai_chats, {
    fields: [ai_messages.chatId],
    references: [ai_chats.id],
  }),
}));

export const aiFilesRelations = relations(ai_files, ({ one }) => ({
  message: one(ai_messages, {
    fields: [ai_files.messageId],
    references: [ai_messages.id],
  }),
}));

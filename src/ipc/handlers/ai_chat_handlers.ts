import { ipcMain } from "electron";
import { db } from "../../db";
import { ai_chats, ai_messages, ai_files } from "../../db/schema_ai_chat";
import { eq, desc } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import pdfParse from "pdf-parse";
import Tesseract from "tesseract.js";
import { togetherai } from "@ai-sdk/togetherai";
import { streamText } from "ai";
import { app } from "electron";

// Type definitions for ai_messages and ai_files
interface AiMessage {
  id: number;
  chatId: number;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  files?: string | null;
}
interface AiFile {
  id: number;
  messageId: number;
  name: string;
  type: string;
  path: string;
  size: number;
  extractedText?: string | null;
}

// Streaming state for each chat
const activeAiStreams = new Map<number, AbortController>();

// Supported code/text file extensions
const codeFileRegex =
  /\.(ts|tsx|js|jsx|html|php|vue|json|csv|txt|py|rb|java|dart|kt|kts)$/i;

// Helper: Convert file to data URL
async function fileToDataUrl(
  filePath: string,
  mimeType: string,
): Promise<string> {
  const data = await fs.promises.readFile(filePath);
  const base64 = data.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

// Helper: Build Together AI message array from DB
async function buildTogetherAiMessages(
  chatId: number,
  db: any,
): Promise<any[]> {
  // Get last 15 messages for context
  const messages: AiMessage[] = await db.query.ai_messages.findMany({
    where: eq(ai_messages.chatId, chatId),
    orderBy: [ai_messages.createdAt],
    limit: 15,
  });
  const togetherMessages = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      let files: { id: number }[] = [];
      if (msg.files) {
        try {
          files = JSON.parse(msg.files);
        } catch {
          files = [];
        }
      }
      let extractedText = "";
      const imageParts: Array<{
        type: "image_url";
        image_url: { url: string };
      }> = [];
      if (Array.isArray(files) && files.length > 0) {
        for (const file of files) {
          const dbFile: AiFile | undefined = await db.query.ai_files.findFirst({
            where: eq(ai_files.id, file.id),
          });
          if (!dbFile) continue;
          if (dbFile.type.startsWith("image/")) {
            const url = await fileToDataUrl(dbFile.path, dbFile.type);
            imageParts.push({ type: "image_url", image_url: { url } });
          } else if (
            dbFile.type === "application/pdf" ||
            dbFile.name.match(/\.pdf$/i) ||
            dbFile.type.startsWith("text") ||
            dbFile.name.match(/\.(md|txt|csv|js|ts|json|html|css)$/i)
          ) {
            if (dbFile.extractedText) {
              extractedText +=
                (extractedText ? "\n\n" : "") + dbFile.extractedText;
            }
          }
        }
      }
      // Concatenate extracted text and user prompt
      let combinedText = msg.content;
      if (extractedText) {
        combinedText = `Here is a document:\n\n${extractedText}\n\n${msg.content}`;
      }
      const contentArr: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      > = [{ type: "text", text: combinedText }, ...imageParts];
      togetherMessages.push({
        role: "user",
        content: contentArr,
      });
    } else if (msg.role === "assistant") {
      togetherMessages.push({
        role: "assistant",
        content: msg.content,
      });
    }
  }
  return togetherMessages;
}

export function registerAiChatHandlers() {
  process.env.TOGETHERAI_API_KEY =
    "db212cc1337465a60ea3f1c9dc8a7087285de36eefdee8c792c7942a13588f91";
  ipcMain.handle("ai-chat:create", async (_event, { title }) => {
    const [chat] = await db.insert(ai_chats).values({ title }).returning();
    return chat;
  });

  ipcMain.handle("ai-chat:list", async () => {
    return db.query.ai_chats.findMany({ orderBy: [desc(ai_chats.createdAt)] });
  });

  ipcMain.handle("ai-chat:get-messages", async (_event, { chatId }) => {
    return db.query.ai_messages.findMany({
      where: eq(ai_messages.chatId, chatId),
      orderBy: [ai_messages.createdAt],
    });
  });

  ipcMain.handle(
    "ai-chat:send-message",
    async (_event, { chatId, role, content, files }) => {
      const [msg] = await db
        .insert(ai_messages)
        .values({
          chatId,
          role,
          content,
          files: files ? JSON.stringify(files) : null,
        })
        .returning();
      return msg;
    },
  );

  ipcMain.handle(
    "ai-chat:upload-file",
    async (_event, { messageId, name, type, data }) => {
      // Save file to disk in Electron userData/ai_uploads
      const userDataPath = app.getPath("userData");
      const uploadDir = path.join(userDataPath, "ai_uploads");
      if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, `${Date.now()}_${name}`);
      fs.writeFileSync(filePath, Buffer.from(data, "base64"));
      // Truncate extracted text to 2000 chars if text file, PDF, or image
      let extractedText = null;
      if (type === "application/pdf" || name.match(/\.pdf$/i)) {
        try {
          const pdfBuffer = fs.readFileSync(filePath);
          const pdfData = await pdfParse(pdfBuffer);
          extractedText = pdfData.text.slice(0, 2000);
        } catch {
          extractedText = null;
        }
      } else if (type.startsWith("image/")) {
        try {
          const {
            data: { text },
          } = await Tesseract.recognize(filePath, "eng");
          extractedText = text.slice(0, 2000);
        } catch {
          extractedText = null;
        }
      } else if (type.startsWith("text") || codeFileRegex.test(name)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        extractedText = raw.slice(0, 2000);
      }
      const [file] = await db
        .insert(ai_files)
        .values({
          messageId,
          name,
          type,
          path: filePath,
          size: fs.statSync(filePath).size,
          extractedText,
        })
        .returning();
      return file;
    },
  );

  ipcMain.handle("ai-chat:get-files", async (_event, { messageId }) => {
    return db.query.ai_files.findMany({
      where: eq(ai_files.messageId, messageId),
    });
  });

  ipcMain.handle("ai-chat:stream", async (event, { chatId, prompt }) => {
    try {
      const abortController = new AbortController();
      activeAiStreams.set(chatId, abortController);
      // Add user message to DB
      await db
        .insert(ai_messages)
        .values({ chatId, role: "user", content: prompt });
      // Add placeholder assistant message
      const [assistantMsg] = await db
        .insert(ai_messages)
        .values({ chatId, role: "assistant", content: "" })
        .returning();

      // Build Together AI message array
      const togetherMessages = await buildTogetherAiMessages(chatId, db);

      // Use Together AI vision model
      const model = togetherai("meta-llama/Llama-Vision-Free");

      let fullResponse = "";
      try {
        const stream = await streamText({
          model,
          messages: togetherMessages,
          abortSignal: abortController.signal,
        });
        for await (const token of stream.textStream) {
          fullResponse += typeof token === "string" ? token : String(token);
          event.sender.send("ai-chat:response:chunk", {
            chatId,
            content: fullResponse,
          });
        }
      } catch (_err) {
        const errMsg =
          _err && typeof _err === "object" && "message" in _err
            ? (_err as any).message
            : String(_err);
        event.sender.send("ai-chat:response:error", { chatId, error: errMsg });
        activeAiStreams.delete(chatId);
        throw _err;
      }
      // Update assistant message with full content
      await db
        .update(ai_messages)
        .set({ content: fullResponse })
        .where(eq(ai_messages.id, assistantMsg.id));
      activeAiStreams.delete(chatId);
      return { chatId };
    } catch (_err) {
      activeAiStreams.delete(chatId);
      throw _err;
    }
  });

  ipcMain.handle("ai-chat:cancel", async (_event, chatId: number) => {
    const abortController = activeAiStreams.get(chatId);
    if (abortController) {
      abortController.abort();
      activeAiStreams.delete(chatId);
    }
    return true;
  });
}

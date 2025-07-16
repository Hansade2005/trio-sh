import React, { useRef, useState } from "react";
import ChatSidebarAi from "@/components/chat/ChatSidebarAi";
import MessagesListAi from "@/components/chat/MessagesListAi";
import ChatInputAi from "@/components/chat/ChatInputAi";
import { Card, CardContent } from "@/components/ui/card";
import { useAiChats } from "@/hooks/useAiChats";
import { useAiMessages } from "@/hooks/useAiMessages";
import { useAiSendMessage } from "@/hooks/useAiSendMessage";
import { useAiStreamMessage } from "@/hooks/useAiSendMessage";
import { PanelLeft } from "lucide-react";

export default function TrioAIChatPage() {
  const { chats, loading: chatsLoading } = useAiChats();
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const { messages, loading: messagesLoading } = useAiMessages(selectedChatId);
  const sendMessage = useAiSendMessage();
  const streamMessage = useAiStreamMessage();

  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // File upload state for preview
  const [pendingFiles, setPendingFiles] = useState<any[]>([]);

  // Keep cleanup ref for streaming
  const streamingCleanupRef = useRef<null | (() => void)>(null);

  const handleSendMessage = async (msg: { role: string; content: string }) => {
    if (!selectedChatId) return;
    if (msg.role === "user") {
      setStreaming(false);
      await sendMessage({
        chatId: selectedChatId,
        role: msg.role,
        content: msg.content,
        files: undefined,
      });
      return;
    }
    setStreaming(true);
    setStreamingContent("");
    if (streamingCleanupRef.current) streamingCleanupRef.current();
    streamingCleanupRef.current = streamMessage({
      chatId: selectedChatId,
      prompt: msg.content,
      onChunk: (content) => setStreamingContent(content),
      onDone: () => {
        setStreaming(false);
        setStreamingContent(null);
        streamingCleanupRef.current = null;
      },
      onError: () => {
        setStreaming(false);
        setStreamingContent(null);
        streamingCleanupRef.current = null;
      },
    });
  };

  React.useEffect(() => {
    return () => {
      if (streamingCleanupRef.current) streamingCleanupRef.current();
    };
  }, []);

  const displayedMessages =
    streaming && streamingContent && messages.length > 0
      ? [
          ...messages.slice(0, -1),
          {
            ...(messages[
              messages.length - 1
            ] as import("@/ipc/ipc_types").Message),
            content: streamingContent,
          },
        ]
      : messages;

  // --- DeepSeek-style welcome page when no chat is selected ---
  if (!selectedChatId) {
    return (
      <div className="flex min-h-screen w-full bg-background items-center justify-center relative">
        {/* Sidebar toggler icon (PanelLeft) */}
        <button
          className="absolute top-6 left-6 z-10 p-2 rounded-full bg-white/80 dark:bg-gray-900/80 shadow hover:bg-blue-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Open sidebar"
          type="button"
        >
          <PanelLeft className="w-7 h-7 text-blue-700 dark:text-blue-300" />
        </button>
        <div className="flex flex-col items-center justify-center w-full h-full">
          <div className="mb-8 flex flex-col items-center">
            <div className="text-4xl md:text-5xl font-extrabold text-blue-700 mb-2">
              Hi, I'm Trio.
            </div>
            <div className="text-lg md:text-2xl text-gray-600 mb-8">
              How can I help you today?
            </div>
          </div>
          <div className="w-full max-w-xl flex flex-col items-center">
            <div className="w-full">
              <div className="bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-lg px-8 py-6 flex flex-col items-center border border-gray-200 dark:border-gray-800">
                <ChatInputAi
                  onSendMessage={handleSendMessage}
                  streaming={streaming}
                  pendingFiles={pendingFiles}
                  setPendingFiles={setPendingFiles}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Normal chat layout when a chat is selected ---
  return (
    <div className="flex min-h-screen bg-background">
      <ChatSidebarAi
        chats={chats}
        loading={chatsLoading}
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
      />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardContent className="flex flex-col h-[70vh]">
            <div className="flex-1 overflow-y-auto mb-4">
              {messagesLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  Loading messages...
                </div>
              ) : (
                <MessagesListAi
                  messages={displayedMessages}
                  streaming={streaming}
                  bottomRef={bottomRef}
                />
              )}
              <div ref={bottomRef} />
            </div>
            <ChatInputAi
              onSendMessage={handleSendMessage}
              streaming={streaming}
              pendingFiles={pendingFiles}
              setPendingFiles={setPendingFiles}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

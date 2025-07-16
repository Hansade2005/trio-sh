import { useCallback, useRef } from "react";

export function useAiSendMessage() {
  return async function sendMessage({
    chatId,
    role,
    content,
    files,
  }: {
    chatId: number;
    role: string;
    content: string;
    files?: any[];
  }) {
    return window.electron.ipcRenderer.invoke("ai-chat:send-message", {
      chatId,
      role,
      content,
      files,
    });
  };
}

// Streaming hook for AI chat
export function useAiStreamMessage() {
  // Keep a ref to the current chatId for cleanup
  const currentChatIdRef = useRef<number | null>(null);

  // Returns a function to start streaming
  const streamMessage = useCallback(
    ({
      chatId,
      prompt,
      onChunk,
      onDone,
      onError,
    }: {
      chatId: number;
      prompt: string;
      onChunk: (content: string) => void;
      onDone?: () => void;
      onError?: (err: any) => void;
    }) => {
      currentChatIdRef.current = chatId;
      // Listen for streaming chunks
      function handleChunk(
        _event: any,
        data: { chatId: number; content: string },
      ) {
        if (data.chatId === chatId) {
          onChunk(data.content);
        }
      }
      window.electron.ipcRenderer.on("ai-chat:response:chunk", handleChunk);
      // Start streaming
      window.electron.ipcRenderer
        .invoke("ai-chat:stream", { chatId, prompt })
        .then(() => {
          if (onDone) onDone();
        })
        .catch((err) => {
          if (onError) onError(err);
        });
      // Cleanup function
      return () => {
        window.electron.ipcRenderer.removeListener(
          "ai-chat:response:chunk",
          handleChunk,
        );
        window.electron.ipcRenderer.invoke("ai-chat:cancel", chatId);
      };
    },
    [],
  );

  return streamMessage;
}

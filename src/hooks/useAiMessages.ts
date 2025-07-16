import { useEffect, useState } from "react";

export function useAiMessages(chatId: number | null) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;
    setLoading(true);
    window.electron.ipcRenderer
      .invoke("ai-chat:get-messages", { chatId })
      .then((data) => {
        setMessages(data);
        setLoading(false);
      });
  }, [chatId]);

  return { messages, loading };
}

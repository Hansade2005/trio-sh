import { useEffect, useState } from "react";

export function useAiChats() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electron.ipcRenderer.invoke("ai-chat:list").then((data) => {
      setChats(data);
      setLoading(false);
    });
  }, []);

  return { chats, loading };
}

import React from "react";

interface ChatSidebarAiProps {
  chats: any[];
  loading: boolean;
  selectedChatId: number | null;
  onSelectChat: (id: number) => void;
}

export default function ChatSidebarAi({
  chats,
  loading,
  selectedChatId,
  onSelectChat,
}: ChatSidebarAiProps) {
  return (
    <aside className="flex flex-col w-64 bg-background border-r shadow-xl h-screen">
      <div className="flex items-center justify-between p-4 border-b">
        <span className="font-bold text-lg">AI Chats</span>
        <button
          className="px-3 py-1 rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition"
          onClick={() => onSelectChat(-1)}
        >
          + New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-muted-foreground text-center mt-8">
            Loading...
          </div>
        ) : chats.length === 0 ? (
          <div className="text-muted-foreground text-center mt-8">
            No chats yet
          </div>
        ) : (
          <ul>
            {chats.map((chat) => (
              <li key={chat.id}>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-all ${selectedChatId === chat.id ? "bg-pink-100 text-pink-900 shadow" : "hover:bg-muted"}`}
                  onClick={() => onSelectChat(chat.id)}
                >
                  {chat.title || "New Chat"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="p-4 border-t flex items-center gap-2 mt-auto">
        <div className="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center font-bold text-pink-700">
          U
        </div>
        <span className="font-semibold">My Profile</span>
      </div>
    </aside>
  );
}

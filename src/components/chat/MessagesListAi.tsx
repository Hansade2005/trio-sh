import React from "react";
import { Message } from "@/ipc/ipc_types";
import ChatMessageAi from "@/components/chat/ChatMessageAi";

interface MessagesListAiProps {
  messages: Message[];
  streaming: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}

export default function MessagesListAi({
  messages,
  streaming,
  bottomRef,
}: MessagesListAiProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          No messages yet
        </div>
      ) : (
        messages.map((msg, idx) => (
          <ChatMessageAi
            key={msg.id}
            message={msg}
            isLastMessage={idx === messages.length - 1}
            streaming={streaming}
          />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}

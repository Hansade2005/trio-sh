import React from "react";
import { Message } from "@/ipc/ipc_types";
import {
  DyadMarkdownParser,
  VanillaMarkdownParser,
} from "./DyadMarkdownParser";
// Import logo as ES6 module for renderer process compatibility
import logo from "@/assets/icon/logo.png";

interface ChatMessageAiProps {
  message: Message;
  isLastMessage: boolean;
  streaming: boolean;
}

const ChatMessageAi: React.FC<ChatMessageAiProps> = ({
  message,
  isLastMessage,
  streaming,
}) => {
  const isAssistant = message.role === "assistant";
  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div className="mt-2 w-full max-w-2xl mx-auto flex items-end">
        {isAssistant && (
          <img src={logo} alt="AI" className="w-8 h-8 rounded-full mr-2" />
        )}
        <div
          className={`rounded-xl p-3 mb-2 max-w-[80%] shadow-md ${
            isAssistant
              ? "bg-gray-100 dark:bg-gray-800 text-left"
              : "bg-pink-100 text-right ml-auto"
          }`}
        >
          {isAssistant && !message.content && streaming && isLastMessage ? (
            <div className="flex h-6 items-center space-x-2 p-2">
              <span className="animate-pulse">Thinking...</span>
            </div>
          ) : isAssistant ? (
            <DyadMarkdownParser content={message.content} />
          ) : (
            <VanillaMarkdownParser content={message.content} />
          )}
        </div>
        {!isAssistant && (
          <div className="w-8 h-8 rounded-full ml-2 bg-pink-200 flex items-center justify-center font-bold text-pink-700">
            U
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageAi;

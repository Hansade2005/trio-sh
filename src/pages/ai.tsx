import React from "react";
import { Bot } from "lucide-react";

export default function AIPage() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8">
      <div className="flex items-center gap-2 mb-6">
        <Bot className="h-8 w-8 text-pink-500" />
        <h1 className="text-2xl font-bold">AI Chat (DuckDuckGo)</h1>
      </div>
      <div className="w-full max-w-3xl h-[700px] rounded-xl overflow-hidden shadow-lg border bg-white dark:bg-gray-900">
        <iframe
          src="https://duckduckgo.com/?q=DuckDuckGo+AI+Chat&ia=chat&duckai=1"
          width="100%"
          height="100%"
          style={{ minHeight: 700, border: 0 }}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          title="DuckDuckGo AI Chat"
        />
      </div>
    </div>
  );
}

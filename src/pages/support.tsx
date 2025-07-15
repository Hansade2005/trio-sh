import React from "react";

export default function SupportPage() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8">
      <h1 className="text-2xl font-bold mb-6">Support</h1>
      <div className="w-full max-w-2xl h-[600px] rounded-xl overflow-hidden shadow-lg border bg-white dark:bg-gray-900">
        <iframe
          src="https://tawk.to/chat/686f71548ef240190cec47c5/1ivpl5dk2"
          width="100%"
          height="100%"
          style={{ minHeight: 600, border: 0 }}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          title="Support Chat"
        />
      </div>
    </div>
  );
}

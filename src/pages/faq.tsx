import React, { useState } from "react";
import { BookOpen } from "lucide-react";

const FAQS = [
  {
    category: "Getting Started",
    qas: [
      {
        question: "How do I create my first app?",
        answer:
          "Click 'Apps' in the sidebar, then 'New App'. Follow the prompts to set up your project.",
      },
      {
        question: "How do I connect an AI provider?",
        answer:
          "Go to Settings > AI Providers and enter your API key for your preferred provider.",
      },
    ],
  },
  {
    category: "Troubleshooting",
    qas: [
      {
        question: "Why can't I run my app?",
        answer:
          "Make sure Node.js is installed and your dependencies are up to date. See the Support page for more help.",
      },
      {
        question: "How do I report a bug?",
        answer:
          "Use the Help button or visit the Feedback page to submit an issue on GitHub.",
      },
    ],
  },
  {
    category: "Features",
    qas: [
      {
        question: "Can I use my own models?",
        answer: "Yes! You can connect any supported provider in Settings.",
      },
      {
        question: "How do I update the app?",
        answer:
          "Check the Settings page for the current version and update instructions.",
      },
    ],
  },
];

export default function FAQPage() {
  const [search, setSearch] = useState("");
  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="h-8 w-8 text-pink-500" />
        <h1 className="text-2xl font-bold">FAQ & Knowledge Base</h1>
      </div>
      <input
        type="text"
        placeholder="Search FAQs..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-xl mb-6 p-3 rounded-lg border shadow focus:outline-none focus:ring-2 focus:ring-pink-400"
      />
      <div className="w-full max-w-2xl space-y-8">
        {FAQS.map((cat) => (
          <div key={cat.category}>
            <h2 className="text-lg font-semibold mb-2 text-pink-700">
              {cat.category}
            </h2>
            <div className="space-y-4">
              {cat.qas
                .filter(
                  (qa) =>
                    qa.question.toLowerCase().includes(search.toLowerCase()) ||
                    qa.answer.toLowerCase().includes(search.toLowerCase()),
                )
                .map((qa) => (
                  <div
                    key={qa.question}
                    className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow border"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Q: {qa.question}
                    </div>
                    <div className="mt-1 text-gray-700 dark:text-gray-300">
                      A: {qa.answer}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-10 flex gap-4">
        <a
          href="/support"
          className="text-pink-600 hover:underline font-medium"
        >
          Support
        </a>
        <a
          href="https://www.optimaai.cc/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-pink-600 hover:underline font-medium"
        >
          Docs
        </a>
      </div>
    </div>
  );
}

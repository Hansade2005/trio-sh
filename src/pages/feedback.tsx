import React, { useState } from "react";
import { MessageCircle } from "lucide-react";

const GITHUB_ISSUE_URL = "https://github.com/Hansade2005/trio-sh/issues/new";

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState("");
  const [feature, setFeature] = useState("");

  const openGitHub = (type: "feedback" | "feature") => {
    const title =
      type === "feedback"
        ? encodeURIComponent("[feedback] ")
        : encodeURIComponent("[feature request] ");
    const body = encodeURIComponent(type === "feedback" ? feedback : feature);
    const labels = type === "feedback" ? "feedback" : "feature request";
    window.open(
      `${GITHUB_ISSUE_URL}?title=${title}&labels=${labels}&body=${body}`,
      "_blank",
    );
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="h-8 w-8 text-pink-500" />
        <h1 className="text-2xl font-bold">Feedback & Feature Requests</h1>
      </div>
      <div className="w-full max-w-xl space-y-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border">
          <h2 className="text-lg font-semibold mb-2 text-pink-700">
            Submit Feedback
          </h2>
          <textarea
            className="w-full p-3 rounded-lg border shadow focus:outline-none focus:ring-2 focus:ring-pink-400 mb-2"
            rows={4}
            placeholder="Share your thoughts, suggestions, or report a bug..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <button
            className="bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2 rounded-lg shadow transition-all"
            onClick={() => openGitHub("feedback")}
            disabled={!feedback.trim()}
          >
            Submit Feedback
          </button>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border">
          <h2 className="text-lg font-semibold mb-2 text-pink-700">
            Request a Feature
          </h2>
          <textarea
            className="w-full p-3 rounded-lg border shadow focus:outline-none focus:ring-2 focus:ring-pink-400 mb-2"
            rows={4}
            placeholder="Describe the feature you'd like to see..."
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
          />
          <button
            className="bg-pink-500 hover:bg-pink-600 text-white font-medium px-4 py-2 rounded-lg shadow transition-all"
            onClick={() => openGitHub("feature")}
            disabled={!feature.trim()}
          >
            Request Feature
          </button>
        </div>
      </div>
      <div className="mt-10">
        <a href="#" className="text-pink-600 hover:underline font-medium">
          View Roadmap (coming soon)
        </a>
      </div>
    </div>
  );
}

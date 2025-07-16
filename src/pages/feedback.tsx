import React, { useState } from "react";
import {
  Mail,
  Linkedin,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  MessageCircle,
  Github,
} from "lucide-react";

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
        <a
          href="/roadmap"
          className="text-pink-600 hover:underline font-medium"
        >
          View Roadmap
        </a>
      </div>
      <div className="mt-10 w-full max-w-xl bg-white dark:bg-gray-900 rounded-xl p-6 shadow border">
        <div className="flex items-center gap-4 mb-6">
          <img
            src="/assets/me.png"
            alt="Hans Ade"
            className="w-20 h-20 rounded-full border-4 border-pink-200 shadow"
          />
          <div>
            <div className="text-xl font-bold text-pink-700">Hans Ade</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Founder & AI Engineer
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Building AI solutions for the future. Passionate about innovation,
              open source, and helping others succeed with AI.
            </div>
          </div>
        </div>
        <h2 className="text-lg font-semibold mb-4 text-pink-700">Contact Us</h2>
        <ul className="space-y-3">
          <li className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-pink-500" />
            <a
              href="mailto:hanscadx8@gmail.com"
              className="hover:underline text-blue-700"
            >
              hanscadx8@gmail.com
            </a>
          </li>
          <li className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-pink-500" />
            <a
              href="https://www.linkedin.com/in/hans-ade-a27387264/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-blue-700"
            >
              LinkedIn
            </a>
          </li>
          <li className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-pink-500" />
            <a
              href="http://www.optimaai.cc"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-blue-700"
            >
              www.optimaai.cc
            </a>
          </li>
          <li className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-pink-500" />
            <a
              href="https://facebook.com/optimaai.cc/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-blue-700"
            >
              Facebook
            </a>
          </li>
          <li className="flex items-center gap-2">
            <Twitter className="h-5 w-5 text-pink-500" />
            <a
              href="https://x.com/HansCadx"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-blue-700"
            >
              X (Twitter)
            </a>
          </li>
          <li className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            <a
              href="https://Instagram.com/anyehappyness"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-blue-700"
            >
              Instagram
            </a>
          </li>
          <li className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-pink-500" />
            <a
              href="https://tweetchat.me/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-blue-700"
            >
              TweetChat
            </a>
          </li>
          <li className="flex items-center gap-2">
            <Github className="h-5 w-5 text-pink-500" />
            <a
              href="https://github.com/Hansade2005"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-blue-700"
            >
              GitHub
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

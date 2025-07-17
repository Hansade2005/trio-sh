import React, { useState, useEffect } from "react";
import {
  BookOpen,
  MessageCircle,
  Milestone,
  Mail,
  Linkedin,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  Github,
} from "lucide-react";

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
          "Make sure Node.js is installed and your dependencies are up to date.",
      },
      {
        question: "How do I report a bug?",
        answer: "Use the Help page to submit an issue on GitHub.",
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

const GITHUB_ISSUE_URL = "https://github.com/Hansade2005/trio-sh/issues/new";

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feature, setFeature] = useState("");
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/Hansade2005/trio-sh/releases")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch releases");
        return res.json();
      })
      .then((data) => {
        setReleases(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const openGitHub = (type) => {
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
    <div
      className="flex flex-col items-center w-full h-full p-8 overflow-y-auto"
      style={{ maxHeight: "100vh" }}
    >
      <div className="flex flex-col md:flex-row w-full max-w-6xl gap-8">
        {/* Left: FAQ & Feedback */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="h-8 w-8 text-pink-500" />
            <h1 className="text-2xl font-bold">Help & Roadmap</h1>
          </div>
          {/* FAQ Search */}
          <input
            type="text"
            placeholder="Search FAQs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full mb-6 p-3 rounded-lg border shadow focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
          {/* FAQ List */}
          <div className="w-full space-y-8">
            {FAQS.map((cat) => (
              <div key={cat.category}>
                <h2 className="text-lg font-semibold mb-2 text-pink-700">
                  {cat.category}
                </h2>
                <div className="space-y-4">
                  {cat.qas
                    .filter(
                      (qa) =>
                        qa.question
                          .toLowerCase()
                          .includes(search.toLowerCase()) ||
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
          {/* Feedback & Feature Submission */}
          <div className="mt-10 w-full space-y-8">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border">
              <h2 className="text-lg font-semibold mb-2 text-pink-700 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-pink-500" /> Submit
                Feedback
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
              <h2 className="text-lg font-semibold mb-2 text-pink-700 flex items-center gap-2">
                <Milestone className="h-5 w-5 text-pink-500" /> Request a
                Feature
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
        </div>
        {/* Right: Roadmap & Contact */}
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Milestone className="h-6 w-6 text-pink-500" />
              <h2 className="text-lg font-semibold text-pink-700">
                Roadmap & Changelog
              </h2>
            </div>
            {loading && (
              <div className="text-gray-500">Loading releases...</div>
            )}
            {error && <div className="text-red-500">{error}</div>}
            <div className="w-full space-y-8">
              {releases.map((release) => (
                <div
                  key={release.id}
                  className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow border"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-pink-700 font-semibold text-lg">
                      {release.name || release.tag_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(release.published_at).toLocaleDateString()}
                    </span>
                    <a
                      href={release.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-pink-500 hover:underline text-xs"
                    >
                      View on GitHub
                    </a>
                  </div>
                  <div
                    className="prose prose-p:my-1 max-w-none text-gray-800 dark:text-gray-200"
                    dangerouslySetInnerHTML={{
                      __html: release.body
                        ? release.body.replace(/\n/g, "<br/>")
                        : "",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          {/* Contact & Social Links */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border">
            <div className="flex items-center gap-4 mb-6">
              <img
                src="https://openapi.aiu.edu/submissions/PhotoGalleryThumbnail/UB82014SY91231/679686_downloadresizehood.com.png"
                alt="User profile picture"
                className="w-20 h-20 rounded-full border-4 border-pink-200 shadow"
              />
              <div>
                <div className="text-xl font-bold text-pink-700">Hans Ade</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Founder & AI Engineer
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Building AI solutions for the future. Passionate about
                  innovation, open source, and helping others succeed with AI.
                </div>
              </div>
            </div>
            <h2 className="text-lg font-semibold mb-4 text-pink-700">
              Contact & Social
            </h2>
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
      </div>
    </div>
  );
}

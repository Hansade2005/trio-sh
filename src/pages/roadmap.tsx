import React, { useEffect, useState } from "react";
import { Milestone } from "lucide-react";

interface Release {
  id: number;
  name: string;
  tag_name: string;
  published_at: string;
  body: string;
  html_url: string;
}

export default function RoadmapPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8">
      <div className="flex items-center gap-2 mb-6">
        <Milestone className="h-8 w-8 text-pink-500" />
        <h1 className="text-2xl font-bold">Roadmap & Changelog</h1>
      </div>
      {loading && <div className="text-gray-500">Loading releases...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="w-full max-w-2xl space-y-8">
        {releases.map((release) => (
          <div
            key={release.id}
            className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow border"
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
  );
}

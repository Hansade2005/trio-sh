import React, { useMemo, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

import { DyadWrite } from "./DyadWrite";
import { DyadRename } from "./DyadRename";
import { DyadDelete } from "./DyadDelete";
import { DyadAddDependency } from "./DyadAddDependency";
import { DyadExecuteSql } from "./DyadExecuteSql";
import { DyadAddIntegration } from "./DyadAddIntegration";
import { DyadEdit } from "./DyadEdit";
import { DyadCodebaseContext } from "./DyadCodebaseContext";
import { DyadThink } from "./DyadThink";
import { CodeHighlight } from "./CodeHighlight";
import { useAtomValue } from "jotai";
import { isStreamingAtom } from "@/atoms/chatAtoms";
import { CustomTagState } from "./stateTypes";
import { DyadOutput } from "./DyadOutput";
import { DyadProblemSummary } from "./DyadProblemSummary";
import { IpcClient } from "@/ipc/ipc_client";

interface DyadMarkdownParserProps {
  content: string;
}

type CustomTagInfo = {
  tag: string;
  attributes: Record<string, string>;
  content: string;
  fullMatch: string;
  inProgress?: boolean;
};

type ContentPiece =
  | { type: "markdown"; content: string }
  | { type: "custom-tag"; tagInfo: CustomTagInfo };

const customLink = ({
  node: _node,
  ...props
}: {
  node?: any;
  [key: string]: any;
}) => (
  <a
    {...props}
    onClick={(e) => {
      const url = props.href;
      if (url) {
        e.preventDefault();
        IpcClient.getInstance().openExternalUrl(url);
      }
    }}
  />
);

export const VanillaMarkdownParser = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      components={{
        code: CodeHighlight,
        a: customLink,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

/**
 * Custom component to parse markdown content with Trio-specific tags
 */
export const DyadMarkdownParser: React.FC<DyadMarkdownParserProps> = ({
  content,
}) => {
  const isStreaming = useAtomValue(isStreamingAtom);
  // Extract content pieces (markdown and custom tags)
  const contentPieces = useMemo(() => {
    return parseCustomTags(content);
  }, [content]);

  return (
    <>
      {contentPieces.map((piece, index) => (
        <React.Fragment key={index}>
          {piece.type === "markdown"
            ? piece.content && (
                <ReactMarkdown
                  components={{
                    code: CodeHighlight,
                    a: customLink,
                  }}
                >
                  {piece.content}
                </ReactMarkdown>
              )
            : renderCustomTag(piece.tagInfo, { isStreaming })}
        </React.Fragment>
      ))}
    </>
  );
};

/**
 * Pre-process content to handle unclosed custom tags
 * Adds closing tags at the end of the content for any unclosed custom tags
 * Assumes the opening tags are complete and valid
 * Returns the processed content and a map of in-progress tags
 */
function preprocessUnclosedTags(content: string): {
  processedContent: string;
  inProgressTags: Map<string, Set<number>>;
} {
  const customTagNames = [
    "triobuilder-write",
    "triobuilder-rename",
    "triobuilder-move",
    "triobuilder-copy",
    "triobuilder-mkdir",
    "triobuilder-search",
    "triobuilder-replace",
    "triobuilder-run-script",
    "triobuilder-format",
    "triobuilder-lint",
    "triobuilder-test",
    "triobuilder-git",
    "triobuilder-download",
    "triobuilder-delete",
    "triobuilder-add-dependency",
    "triobuilder-read-file",
    "triobuilder-read-files",
    "triobuilder-execute-sql",
    "triobuilder-add-integration",
    "triobuilder-output",
    "triobuilder-problem-report",
    "triobuilder-chat-summary",
    "triobuilder-edit",
    "triobuilder-codebase-context",
    "think",
  ];

  let processedContent = content;
  // Map to track which tags are in progress and their positions
  const inProgressTags = new Map<string, Set<number>>();

  // For each tag type, check if there are unclosed tags
  for (const tagName of customTagNames) {
    // Count opening and closing tags
    const openTagPattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, "g");
    const closeTagPattern = new RegExp(`</${tagName}>`, "g");

    // Track the positions of opening tags
    const openingMatches: RegExpExecArray[] = [];
    let match;

    // Reset regex lastIndex to start from the beginning
    openTagPattern.lastIndex = 0;

    while ((match = openTagPattern.exec(processedContent)) !== null) {
      openingMatches.push({ ...match });
    }

    const openCount = openingMatches.length;
    const closeCount = (processedContent.match(closeTagPattern) || []).length;

    // If we have more opening than closing tags
    const missingCloseTags = openCount - closeCount;
    if (missingCloseTags > 0) {
      // Add the required number of closing tags at the end
      processedContent += Array(missingCloseTags)
        .fill(`</${tagName}>`)
        .join("");

      // Mark the last N tags as in progress where N is the number of missing closing tags
      const inProgressIndexes = new Set<number>();
      const startIndex = openCount - missingCloseTags;
      for (let i = startIndex; i < openCount; i++) {
        inProgressIndexes.add(openingMatches[i].index);
      }
      inProgressTags.set(tagName, inProgressIndexes);
    }
  }

  return { processedContent, inProgressTags };
}

/**
 * Parse the content to extract custom tags and markdown sections into a unified array
 */
function parseCustomTags(content: string): ContentPiece[] {
  const { processedContent, inProgressTags } = preprocessUnclosedTags(content);

  const customTagNames = [
    "triobuilder-write",
    "triobuilder-rename",
    "triobuilder-move",
    "triobuilder-copy",
    "triobuilder-mkdir",
    "triobuilder-search",
    "triobuilder-replace",
    "triobuilder-run-script",
    "triobuilder-format",
    "triobuilder-lint",
    "triobuilder-test",
    "triobuilder-git",
    "triobuilder-download",
    "triobuilder-delete",
    "triobuilder-add-dependency",
    "triobuilder-read-file",
    "triobuilder-read-files",
    "triobuilder-execute-sql",
    "triobuilder-add-integration",
    "triobuilder-output",
    "triobuilder-problem-report",
    "triobuilder-chat-summary",
    "triobuilder-edit",
    "triobuilder-codebase-context",
    "think",
  ];

  const tagPattern = new RegExp(
    `<(${customTagNames.join("|")})\\s*([^>]*)>(.*?)<\\/\\1>`,
    "gs",
  );

  const contentPieces: ContentPiece[] = [];
  let lastIndex = 0;
  let match;

  // Find all custom tags
  while ((match = tagPattern.exec(processedContent)) !== null) {
    const [fullMatch, tag, attributesStr, tagContent] = match;
    const startIndex = match.index;

    // Add the markdown content before this tag
    if (startIndex > lastIndex) {
      contentPieces.push({
        type: "markdown",
        content: processedContent.substring(lastIndex, startIndex),
      });
    }

    // Parse attributes
    const attributes: Record<string, string> = {};
    const attrPattern = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrPattern.exec(attributesStr)) !== null) {
      attributes[attrMatch[1]] = attrMatch[2];
    }

    // Check if this tag was marked as in progress
    const tagInProgressSet = inProgressTags.get(tag);
    const isInProgress = tagInProgressSet?.has(startIndex);

    // Add the tag info
    contentPieces.push({
      type: "custom-tag",
      tagInfo: {
        tag,
        attributes,
        content: tagContent,
        fullMatch,
        inProgress: isInProgress || false,
      },
    });

    lastIndex = startIndex + fullMatch.length;
  }

  // Add the remaining markdown content
  if (lastIndex < processedContent.length) {
    contentPieces.push({
      type: "markdown",
      content: processedContent.substring(lastIndex),
    });
  }

  return contentPieces;
}

function getState({
  isStreaming,
  inProgress,
}: {
  isStreaming?: boolean;
  inProgress?: boolean;
}): CustomTagState {
  if (!inProgress) {
    return "finished";
  }
  return isStreaming ? "pending" : "aborted";
}

/**
 * Render a custom tag based on its type
 */
function renderCustomTag(
  tagInfo: CustomTagInfo,
  { isStreaming }: { isStreaming: boolean },
): React.ReactNode {
  const { tag, attributes, content, inProgress } = tagInfo;

  switch (tag) {
    case "think":
      return (
        <DyadThink
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </DyadThink>
      );
    case "triobuilder-write":
      return (
        <DyadWrite
          node={{
            properties: {
              path: attributes.path || "",
              description: attributes.description || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </DyadWrite>
      );

    case "triobuilder-rename":
      return (
        <DyadRename
          node={{
            properties: {
              from: attributes.from || "",
              to: attributes.to || "",
            },
          }}
        >
          {content}
        </DyadRename>
      );

    case "triobuilder-delete":
      return (
        <DyadDelete
          node={{
            properties: {
              path: attributes.path || "",
            },
          }}
        >
          {content}
        </DyadDelete>
      );

    case "triobuilder-add-dependency":
      return (
        <DyadAddDependency
          node={{
            properties: {
              packages: attributes.packages || "",
            },
          }}
        >
          {content}
        </DyadAddDependency>
      );

    case "triobuilder-execute-sql":
      return (
        <DyadExecuteSql
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
              description: attributes.description || "",
            },
          }}
        >
          {content}
        </DyadExecuteSql>
      );

    case "triobuilder-add-integration":
      return (
        <DyadAddIntegration
          node={{
            properties: {
              provider: attributes.provider || "",
            },
          }}
        >
          {content}
        </DyadAddIntegration>
      );

    case "triobuilder-edit":
      return (
        <DyadEdit
          node={{
            properties: {
              path: attributes.path || "",
              description: attributes.description || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </DyadEdit>
      );

    case "triobuilder-codebase-context":
      return (
        <DyadCodebaseContext
          node={{
            properties: {
              files: attributes.files || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </DyadCodebaseContext>
      );

    case "triobuilder-output":
      return (
        <DyadOutput
          type={attributes.type as "warning" | "error"}
          message={attributes.message}
        >
          {content}
        </DyadOutput>
      );

    case "triobuilder-problem-report":
      return (
        <DyadProblemSummary summary={attributes.summary}>
          {content}
        </DyadProblemSummary>
      );

    case "triobuilder-chat-summary":
      // Don't render anything for triobuilder-chat-summary
      return null;

    case "triobuilder-read-file":
      return <ReadFileTag path={attributes.path} />;
    case "triobuilder-read-files":
      return <ReadFilesTag paths={attributes.paths} />;

    case "triobuilder-move":
      return (
        <div style={{ color: "#b8860b", fontStyle: "italic" }}>
          Move file from <b>{attributes.from}</b> to <b>{attributes.to}</b>
        </div>
      );

    case "triobuilder-copy":
      return (
        <div style={{ color: "#4682b4", fontStyle: "italic" }}>
          Copy file or directory from <b>{attributes.from}</b> to{" "}
          <b>{attributes.to}</b>
        </div>
      );
    case "triobuilder-mkdir":
      return (
        <div style={{ color: "#228b22", fontStyle: "italic" }}>
          Create directory <b>{attributes.path}</b>
        </div>
      );
    case "triobuilder-search":
      return (
        <div style={{ color: "#8b008b", fontStyle: "italic" }}>
          Search for <b>{attributes.query}</b> in the codebase
        </div>
      );
    case "triobuilder-replace":
      return (
        <div style={{ color: "#b22222", fontStyle: "italic" }}>
          Replace <b>{attributes.query}</b> with <b>{attributes.replace}</b> in{" "}
          <b>{attributes.files}</b>
        </div>
      );
    case "triobuilder-run-script":
      return (
        <div style={{ color: "#ff8c00", fontStyle: "italic" }}>
          Run script <b>{attributes.script}</b>
        </div>
      );
    case "triobuilder-format":
      return (
        <div style={{ color: "#20b2aa", fontStyle: "italic" }}>
          Format code at <b>{attributes.path}</b>
        </div>
      );
    case "triobuilder-lint":
      return (
        <div style={{ color: "#a0522d", fontStyle: "italic" }}>
          Lint code at <b>{attributes.path}</b>
        </div>
      );
    case "triobuilder-test":
      return (
        <div style={{ color: "#6a5acd", fontStyle: "italic" }}>
          Run tests{" "}
          {attributes.path ? `at <b>${attributes.path}</b>` : "in the codebase"}
        </div>
      );
    case "triobuilder-git":
      return (
        <div style={{ color: "#708090", fontStyle: "italic" }}>
          Run git command <b>{attributes.command}</b>
        </div>
      );
    case "triobuilder-download":
      return (
        <div style={{ color: "#2e8b57", fontStyle: "italic" }}>
          Download file from <b>{attributes.url}</b> to <b>{attributes.to}</b>
        </div>
      );

    default:
      return null;
  }
}

function ReadFileTag({ path }: { path: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    IpcClient.getInstance()
      .invoke("read-file", { path })
      .then((res: any) => setContent(res.content))
      .catch((err: any) => setError(err.message || String(err)));
  }, [path]);
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (content === null) return <div>Loading file...</div>;
  return (
    <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
      {content}
    </pre>
  );
}

function ReadFilesTag({ paths }: { paths: string }) {
  const [contents, setContents] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!paths) return;
    const pathArr = paths
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (pathArr.length === 0 || pathArr.length > 3) {
      setError("You must provide 1-3 file paths");
      return;
    }
    IpcClient.getInstance()
      .invoke("read-files", { paths: pathArr })
      .then((res: any) => setContents(res))
      .catch((err: any) => setError(err.message || String(err)));
  }, [paths]);
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!contents) return <div>Loading files...</div>;
  return (
    <div className="space-y-4">
      {Object.entries(contents).map(([path, content]) => (
        <div key={path}>
          <div className="font-mono text-xs text-gray-500 mb-1">{path}</div>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
            {content}
          </pre>
        </div>
      ))}
    </div>
  );
}

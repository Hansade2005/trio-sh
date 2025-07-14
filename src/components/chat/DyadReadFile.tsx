import React from "react";
import { CodeHighlight } from "./CodeHighlight";
import { useReadFile } from "@/hooks/useReadFile";

interface DyadReadFileProps {
  node?: any;
  path?: string;
  children?: React.ReactNode;
}

export const DyadReadFile: React.FC<DyadReadFileProps> = ({ node, path: pathProp }) => {
  const path = pathProp || node?.properties?.path || "";
  const { content, loading, error } = useReadFile(path);

  return (
    <div className="bg-(--background-lightest) rounded-lg px-4 py-2 border my-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Read File:</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{path}</span>
      </div>
      {loading && <div className="text-xs text-amber-600">Loading...</div>}
      {error && <div className="text-xs text-red-600">Error: {error.message}</div>}
      {content && (
        <div className="text-xs mt-2">
          <CodeHighlight className="language-typescript">{content}</CodeHighlight>
        </div>
      )}
    </div>
  );
}; 
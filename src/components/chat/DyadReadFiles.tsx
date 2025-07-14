import React from "react";
import { CodeHighlight } from "./CodeHighlight";
import { useReadFiles } from "@/hooks/useReadFiles";

interface DyadReadFilesProps {
  node?: any;
  paths?: string;
  children?: React.ReactNode;
}

export const DyadReadFiles: React.FC<DyadReadFilesProps> = ({ node, paths: pathsProp }) => {
  const paths = (pathsProp || node?.properties?.paths || "").split(",").map(p => p.trim()).filter(Boolean).slice(0, 3);
  const { contents, loading, error } = useReadFiles(paths);

  return (
    <div className="bg-(--background-lightest) rounded-lg px-4 py-2 border my-2">
      <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">Read Files:</div>
      {paths.map((path, idx) => (
        <div key={path} className="mb-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">{path}</div>
          {loading && <div className="text-xs text-amber-600">Loading...</div>}
          {error && error[path] && <div className="text-xs text-red-600">Error: {error[path]}</div>}
          {contents && contents[path] && (
            <div className="text-xs mt-1">
              <CodeHighlight className="language-typescript">{contents[path]}</CodeHighlight>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}; 
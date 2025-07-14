import React from "react";
import { useSearchFileContent } from "@/hooks/useSearchFileContent";

interface DyadSearchFileContentProps {
  node?: any;
  path?: string;
  query?: string;
  children?: React.ReactNode;
}

export const DyadSearchFileContent: React.FC<DyadSearchFileContentProps> = ({ node, path: pathProp, query: queryProp }) => {
  const path = pathProp || node?.properties?.path || "";
  const query = queryProp || node?.properties?.query || "";
  const { results, loading, error } = useSearchFileContent(path, query);

  return (
    <div className="bg-(--background-lightest) rounded-lg px-4 py-2 border my-2">
      <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">Search in File: <span className="text-xs text-gray-500">{path}</span></div>
      <div className="text-xs text-gray-500 mb-1">Query: {query}</div>
      {loading && <div className="text-xs text-amber-600">Searching...</div>}
      {error && <div className="text-xs text-red-600">Error: {error.message}</div>}
      {results && results.length > 0 && (
        <ul className="text-xs mt-2">
          {results.map((line, idx) => (
            <li key={idx}>{line}</li>
          ))}
        </ul>
      )}
      {results && results.length === 0 && !loading && <div className="text-xs text-gray-500">No matches found.</div>}
    </div>
  );
}; 
import React from "react";
import { useSearchFiles } from "@/hooks/useSearchFiles";

interface DyadSearchFilesProps {
  node?: any;
  pattern?: string;
  children?: React.ReactNode;
}

export const DyadSearchFiles: React.FC<DyadSearchFilesProps> = ({ node, pattern: patternProp }) => {
  const pattern = patternProp || node?.properties?.pattern || "";
  const { files, loading, error } = useSearchFiles(pattern);

  return (
    <div className="bg-(--background-lightest) rounded-lg px-4 py-2 border my-2">
      <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">Search Files: <span className="text-xs text-gray-500">{pattern}</span></div>
      {loading && <div className="text-xs text-amber-600">Searching...</div>}
      {error && <div className="text-xs text-red-600">Error: {error.message}</div>}
      {files && files.length > 0 && (
        <ul className="text-xs mt-2">
          {files.map((file) => (
            <li key={file}>{file}</li>
          ))}
        </ul>
      )}
      {files && files.length === 0 && !loading && <div className="text-xs text-gray-500">No files found.</div>}
    </div>
  );
}; 
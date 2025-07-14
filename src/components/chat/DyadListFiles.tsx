import React from "react";
import { useListFiles } from "@/hooks/useListFiles";

interface DyadListFilesProps {
  node?: any;
  dir?: string;
  children?: React.ReactNode;
}

export const DyadListFiles: React.FC<DyadListFilesProps> = ({ node, dir: dirProp }) => {
  const dir = dirProp || node?.properties?.dir || "";
  const { files, loading, error } = useListFiles(dir);

  return (
    <div className="bg-(--background-lightest) rounded-lg px-4 py-2 border my-2">
      <div className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-1">List Files: <span className="text-xs text-gray-500">{dir}</span></div>
      {loading && <div className="text-xs text-amber-600">Loading...</div>}
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
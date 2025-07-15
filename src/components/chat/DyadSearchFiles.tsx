import React from "react";
import { useSearchFiles } from "@/hooks/useSearchFiles";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Search } from "lucide-react";
import { useState } from "react";

interface DyadSearchFilesProps {
  node?: any;
  pattern?: string;
  children?: React.ReactNode;
}

export const DyadSearchFiles: React.FC<DyadSearchFilesProps> = ({ node, pattern: patternProp }) => {
  const pattern = patternProp || node?.properties?.pattern || "";
  const { files, loading, error } = useSearchFiles(pattern);
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <Search className="text-blue-500" size={18} />
        <CardTitle className="text-base">Search Files</CardTitle>
        <span className="ml-2 text-xs text-gray-500">{pattern}</span>
        {files && <span className="ml-2 text-xs text-gray-500">{files.length} found</span>}
        <span className="ml-auto text-xs text-gray-400">{expanded ? "▼" : "►"}</span>
      </CardHeader>
      {expanded && (
        <CardContent className="p-4 pt-0">
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
        </CardContent>
      )}
    </Card>
  );
}; 
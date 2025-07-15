import React from "react";
import { useListFiles } from "@/hooks/useListFiles";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Folder } from "lucide-react";
import { useState } from "react";

interface DyadListFilesProps {
  node?: any;
  dir?: string;
  children?: React.ReactNode;
}

export const DyadListFiles: React.FC<DyadListFilesProps> = ({ node, dir: dirProp }) => {
  const dir = dirProp || node?.properties?.dir || "";
  const { files, loading, error } = useListFiles(dir);
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <Folder className="text-blue-500" size={18} />
        <CardTitle className="text-base">List Files</CardTitle>
        <span className="ml-2 text-xs text-gray-500">{dir}</span>
        {files && <span className="ml-2 text-xs text-gray-500">{files.length} found</span>}
        <span className="ml-auto text-xs text-gray-400">{expanded ? "▼" : "►"}</span>
      </CardHeader>
      {expanded && (
        <CardContent className="p-4 pt-0">
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
        </CardContent>
      )}
    </Card>
  );
}; 
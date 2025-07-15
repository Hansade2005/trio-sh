import React from "react";
import { CodeHighlight } from "./CodeHighlight";
import { useReadFile } from "@/hooks/useReadFile";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { FileText } from "lucide-react";

interface DyadReadFileProps {
  node?: any;
  path?: string;
  children?: React.ReactNode;
}

export const DyadReadFile: React.FC<DyadReadFileProps> = ({ node, path: pathProp }) => {
  const path = pathProp || node?.properties?.path || "";
  const { content, loading, error } = useReadFile(path);

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
        <FileText className="text-blue-500" size={18} />
        <CardTitle className="text-base">Read File</CardTitle>
        <span className="ml-2 text-xs text-gray-500">{path}</span>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading && <div className="text-xs text-amber-600">Loading...</div>}
        {error && <div className="text-xs text-red-600">Error: {error.message}</div>}
        {content && (
          <div className="text-xs mt-2">
            <span className="text-green-600 font-medium">File read successfully.</span>
            <CodeHighlight className="language-typescript">{content}</CodeHighlight>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 
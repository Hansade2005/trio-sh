import React from "react";
import { CodeHighlight } from "./CodeHighlight";
import { useReadFiles } from "@/hooks/useReadFiles";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Files } from "lucide-react";

interface DyadReadFilesProps {
  node?: any;
  paths?: string;
  children?: React.ReactNode;
}

export const DyadReadFiles: React.FC<DyadReadFilesProps> = ({ node, paths: pathsProp }) => {
  const paths = (pathsProp || node?.properties?.paths || "").split(",").map(p => p.trim()).filter(Boolean).slice(0, 3);
  const { contents, loading, error } = useReadFiles(paths);

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
        <Files className="text-blue-500" size={18} />
        <CardTitle className="text-base">Read Files</CardTitle>
        <span className="ml-2 text-xs text-gray-500">{paths.join(", ")}</span>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {paths.map((path, idx) => (
          <div key={path} className="mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">{path}</div>
            {loading && <div className="text-xs text-amber-600">Loading...</div>}
            {error && error[path] && <div className="text-xs text-red-600">Error: {error[path]}</div>}
            {contents && contents[path] && (
              <div className="text-xs mt-1">
                <span className="text-green-600 font-medium">File read successfully.</span>
                <CodeHighlight className="language-typescript">{contents[path]}</CodeHighlight>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}; 
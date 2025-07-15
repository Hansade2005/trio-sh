import React from "react";
import { useSearchFileContent } from "@/hooks/useSearchFileContent";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Search } from "lucide-react";
import { useState } from "react";

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
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <Search className="text-blue-500" size={18} />
        <CardTitle className="text-base">Search in File</CardTitle>
        <span className="ml-2 text-xs text-gray-500">{path}</span>
        <span className="ml-2 text-xs text-gray-500">Query: {query}</span>
        {results && <span className="ml-2 text-xs text-gray-500">{results.length} found</span>}
        <span className="ml-auto text-xs text-gray-400">{expanded ? "▼" : "►"}</span>
      </CardHeader>
      {expanded && (
        <CardContent className="p-4 pt-0">
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
        </CardContent>
      )}
    </Card>
  );
}; 
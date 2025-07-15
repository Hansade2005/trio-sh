import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { GitCompare } from "lucide-react";
import { useGitDiff } from "@/hooks/useGitDiff";

export const DyadGitDiff: React.FC<{ node?: any }> = ({ node }) => {
  const path = node?.properties?.path || "";
  const { data, isLoading, isError, error } = useGitDiff({ path });

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
        <GitCompare className="text-blue-500" size={18} />
        <CardTitle className="text-base">Git Diff</CardTitle>
        {path && <span className="ml-2 text-xs text-gray-500">{path}</span>}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading && <span className="text-amber-600 font-medium">Getting git diff...</span>}
        {isError && <span className="text-red-600 font-medium">Error: {(error as any)?.message || data?.error}</span>}
        {data?.success && (
          <pre className="whitespace-pre-wrap text-xs bg-gray-100 rounded p-2 mt-2">{data.diff}</pre>
        )}
        {data && !data.success && data.error && <span className="text-red-600 font-medium">Error: {data.error}</span>}
      </CardContent>
    </Card>
  );
}; 
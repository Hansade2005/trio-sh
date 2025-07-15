import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { History } from "lucide-react";
import { useGitLog } from "@/hooks/useGitLog";

export const DyadGitLog: React.FC<{ node?: any }> = ({ node }) => {
  const count = parseInt(node?.properties?.count || "5", 10);
  const { data, isLoading, isError, error } = useGitLog({ count });

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
        <History className="text-blue-500" size={18} />
        <CardTitle className="text-base">Git Log</CardTitle>
        <span className="ml-2 text-xs text-gray-500">Last {count} commits</span>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading && <span className="text-amber-600 font-medium">Getting git log...</span>}
        {isError && <span className="text-red-600 font-medium">Error: {(error as any)?.message || data?.error}</span>}
        {data?.success && (
          <pre className="whitespace-pre-wrap text-xs bg-gray-100 rounded p-2 mt-2">{data.log}</pre>
        )}
        {data && !data.success && data.error && <span className="text-red-600 font-medium">Error: {data.error}</span>}
      </CardContent>
    </Card>
  );
}; 
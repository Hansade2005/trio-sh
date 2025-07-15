import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { GitBranch } from "lucide-react";
import { useGitStatus } from "@/hooks/useGitStatus";

export const DyadGitStatus: React.FC<{ node?: any }> = ({ node }) => {
  const { data, isLoading, isError, error } = useGitStatus();

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
        <GitBranch className="text-blue-500" size={18} />
        <CardTitle className="text-base">Git Status</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading && <span className="text-amber-600 font-medium">Checking git status...</span>}
        {isError && <span className="text-red-600 font-medium">Error: {(error as any)?.message || data?.error}</span>}
        {data?.success && (
          <pre className="whitespace-pre-wrap text-xs bg-gray-100 rounded p-2 mt-2">{data.status}</pre>
        )}
        {data && !data.success && data.error && <span className="text-red-600 font-medium">Error: {data.error}</span>}
      </CardContent>
    </Card>
  );
}; 
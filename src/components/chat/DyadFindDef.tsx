import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Locate } from "lucide-react";
import { useFindDef } from "@/hooks/useFindDef";

export const DyadFindDef: React.FC<{ node?: any }> = ({ node }) => {
  const symbol = node?.properties?.symbol || "";
  const { data, isLoading, isError, error } = useFindDef({ symbol });

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
        <Locate className="text-blue-500" size={18} />
        <CardTitle className="text-base">Find Definition</CardTitle>
        <span className="ml-2 text-xs text-gray-500">{symbol}</span>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading && <span className="text-amber-600 font-medium">Searching for definition...</span>}
        {isError && <span className="text-red-600 font-medium">Error: {(error as any)?.message || data?.error}</span>}
        {data?.success && (
          <pre className="whitespace-pre-wrap text-xs bg-gray-100 rounded p-2 mt-2">{data.def}</pre>
        )}
        {data && !data.success && data.error && <span className="text-red-600 font-medium">Error: {data.error}</span>}
      </CardContent>
    </Card>
  );
}; 
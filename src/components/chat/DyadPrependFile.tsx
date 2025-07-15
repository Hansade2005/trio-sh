import React, { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { FilePlus } from "lucide-react";
import { usePrependFile } from "@/hooks/usePrependFile";

interface DyadPrependFileProps {
  node?: any;
  path?: string;
  children?: React.ReactNode;
}

export const DyadPrependFile: React.FC<DyadPrependFileProps> = ({ node, path: pathProp, children }) => {
  const path = pathProp || node?.properties?.path || "";
  const content = typeof children === "string" ? children : "";
  const { mutate, data, isLoading, isError, error } = usePrependFile();

  useEffect(() => {
    if (path && content) {
      mutate({ path, content });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, content]);

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
        <FilePlus className="text-blue-500" size={18} />
        <CardTitle className="text-base">Prepend to File</CardTitle>
        <span className="ml-2 text-xs text-gray-500">{path}</span>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading && <span className="text-amber-600 font-medium">Prepending...</span>}
        {isError && <span className="text-red-600 font-medium">Error: {(error as any)?.message || data?.error}</span>}
        {data?.success && <span className="text-green-600 font-medium">Content prepended successfully.</span>}
        {data && !data.success && data.error && <span className="text-red-600 font-medium">Error: {data.error}</span>}
      </CardContent>
    </Card>
  );
}; 
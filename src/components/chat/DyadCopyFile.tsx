import React, { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { FileCopy } from "lucide-react";
import { useCopyFile } from "@/hooks/useCopyFile";

interface DyadCopyFileProps {
  node?: any;
  from?: string;
  to?: string;
  children?: React.ReactNode;
}

export const DyadCopyFile: React.FC<DyadCopyFileProps> = ({ node, from: fromProp, to: toProp }) => {
  const from = fromProp || node?.properties?.from || "";
  const to = toProp || node?.properties?.to || "";
  const { mutate, data, isLoading, isError, error } = useCopyFile();

  useEffect(() => {
    if (from && to) {
      mutate({ from, to });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
        <FileCopy className="text-blue-500" size={18} />
        <CardTitle className="text-base">Copy File</CardTitle>
        <span className="ml-2 text-xs text-gray-500">{from} → {to}</span>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading && <span className="text-amber-600 font-medium">Copying...</span>}
        {isError && <span className="text-red-600 font-medium">Error: {(error as any)?.message || data?.error}</span>}
        {data?.success && <span className="text-green-600 font-medium">File copied successfully.</span>}
        {data && !data.success && data.error && <span className="text-red-600 font-medium">Error: {data.error}</span>}
      </CardContent>
    </Card>
  );
}; 
import React, { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { FolderMinus } from "lucide-react";
import { useDeleteDir } from "@/hooks/useDeleteDir";

interface DyadDeleteDirProps {
  node?: any;
  path?: string;
  children?: React.ReactNode;
}

export const DyadDeleteDir: React.FC<DyadDeleteDirProps> = ({ node, path: pathProp }) => {
  const path = pathProp || node?.properties?.path || "";
  const { mutate, data, isLoading, isError, error } = useDeleteDir();

  useEffect(() => {
    if (path) {
      mutate({ path });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
        <FolderMinus className="text-red-500" size={18} />
        <CardTitle className="text-base">Delete Directory</CardTitle>
        <span className="ml-2 text-xs text-gray-500">{path}</span>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading && <span className="text-amber-600 font-medium">Deleting...</span>}
        {isError && <span className="text-red-600 font-medium">Error: {(error as any)?.message || data?.error}</span>}
        {data?.success && <span className="text-green-600 font-medium">Directory deleted successfully.</span>}
        {data && !data.success && data.error && <span className="text-red-600 font-medium">Error: {data.error}</span>}
      </CardContent>
    </Card>
  );
}; 
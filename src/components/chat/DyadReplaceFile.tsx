import React, { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { FilePlus } from "lucide-react";
import { useReplaceFile } from "@/hooks/useReplaceFile";

interface DyadReplaceFileProps {
  node?: any;
  path?: string;
  search?: string;
  replace?: string;
  children?: React.ReactNode;
}

export const DyadReplaceFile: React.FC<DyadReplaceFileProps> = ({ node, path: pathProp, search: searchProp, replace: replaceProp }) => {
  const path = pathProp || node?.properties?.path || "";
  const search = searchProp || node?.properties?.search || "";
  const replace = replaceProp || node?.properties?.replace || "";
  const { mutate, data, isLoading, isError, error } = useReplaceFile();

  useEffect(() => {
    if (path && search) {
      mutate({ path, search, replace });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, search, replace]);

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
        <FilePlus className="text-blue-500" size={18} />
        <CardTitle className="text-base">Replace in File</CardTitle>
        <span className="ml-2 text-xs text-gray-500">{path}</span>
        <span className="ml-2 text-xs text-gray-500">{`'${search}' → '${replace}'`}</span>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading && <span className="text-amber-600 font-medium">Replacing...</span>}
        {isError && <span className="text-red-600 font-medium">Error: {(error as any)?.message || data?.error}</span>}
        {data?.success && <span className="text-green-600 font-medium">Content replaced successfully.</span>}
        {data && !data.success && data.error && <span className="text-red-600 font-medium">Error: {data.error}</span>}
      </CardContent>
    </Card>
  );
}; 
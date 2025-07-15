import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { RefreshCw } from "lucide-react";
import { useUpdateDep } from "@/hooks/useUpdateDep";

export const DyadUpdateDep: React.FC<{ node?: any }> = ({ node }) => {
  const pkg = node?.properties?.package || "";
  const { mutate, data, isLoading, isError, error } = useUpdateDep();

  React.useEffect(() => {
    if (pkg) {
      mutate({ package: pkg });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg]);

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
        <RefreshCw className="text-blue-500" size={18} />
        <CardTitle className="text-base">Update Dependency</CardTitle>
        <span className="ml-2 text-xs text-gray-500">{pkg}</span>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading && <span className="text-amber-600 font-medium">Updating dependency...</span>}
        {isError && <span className="text-red-600 font-medium">Error: {(error as any)?.message || data?.error}</span>}
        {data?.success && <span className="text-green-600 font-medium">Dependency updated successfully.</span>}
        {data && !data.success && data.error && <span className="text-red-600 font-medium">Error: {data.error}</span>}
      </CardContent>
    </Card>
  );
}; 
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Package } from "lucide-react";
import { useListDeps } from "@/hooks/useListDeps";

export const DyadListDeps: React.FC<{ node?: any }> = ({ node }) => {
  const { data, isLoading, isError, error } = useListDeps();

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
        <Package className="text-blue-500" size={18} />
        <CardTitle className="text-base">Project Dependencies</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading && <span className="text-amber-600 font-medium">Loading dependencies...</span>}
        {isError && <span className="text-red-600 font-medium">Error: {(error as any)?.message || data?.error}</span>}
        {data?.success && (
          <ul className="text-xs bg-gray-100 rounded p-2 mt-2">
            {data.deps.map((dep: string) => (
              <li key={dep}>{dep}</li>
            ))}
          </ul>
        )}
        {data && !data.success && data.error && <span className="text-red-600 font-medium">Error: {data.error}</span>}
      </CardContent>
    </Card>
  );
}; 
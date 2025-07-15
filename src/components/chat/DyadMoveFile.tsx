import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { ArrowRight } from "lucide-react";

interface DyadMoveFileProps {
  node?: any;
  from?: string;
  to?: string;
  children?: React.ReactNode;
}

export const DyadMoveFile: React.FC<DyadMoveFileProps> = ({ node, from: fromProp, to: toProp }) => {
  const from = fromProp || node?.properties?.from || "";
  const to = toProp || node?.properties?.to || "";

  return (
    <Card className="my-2">
      <CardHeader className="flex flex-row items-center gap-2 p-4 pb-2">
        <ArrowRight className="text-amber-500" size={18} />
        <CardTitle className="text-base">Move File</CardTitle>
        <span className="ml-2 text-xs text-gray-500">{from} → {to}</span>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <span className="text-green-600 font-medium">File moved successfully.</span>
      </CardContent>
    </Card>
  );
}; 
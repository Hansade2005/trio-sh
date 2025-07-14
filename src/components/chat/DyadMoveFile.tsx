import React from "react";

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
    <div className="bg-(--background-lightest) rounded-lg px-4 py-2 border my-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Move File:</span>
        <span className="text-xs text-gray-500">{from} → {to}</span>
      </div>
    </div>
  );
}; 
import { Console } from "./Console";
import { useAtomValue } from "jotai";
import { appOutputAtom } from "@/atoms/appAtoms";
import { ConsoleHeader } from "./PreviewPanel";

export function ConsoleTab() {
  const appOutput = useAtomValue(appOutputAtom);
  const messageCount = appOutput.length;
  const latestMessage = messageCount > 0 ? appOutput[messageCount - 1]?.message : undefined;
  return (
    <div className="flex flex-col h-full">
      <ConsoleHeader isOpen={true} onToggle={() => {}} latestMessage={latestMessage} />
      <Console />
    </div>
  );
} 
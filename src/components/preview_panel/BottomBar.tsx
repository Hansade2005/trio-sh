import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ConsoleTab } from "./ConsoleTab";
import { ShellTab } from "./ShellTab";
import { useState } from "react";

export function BottomBar() {
  const [tab, setTab] = useState("console");
  return (
    <div className="w-full h-full flex flex-col bg-[var(--background-darkest)] border-t border-border">
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="flex-none flex border-b border-border bg-[var(--background-darkest)]">
          <TabsTrigger value="console">Console</TabsTrigger>
          <TabsTrigger value="shell">Shell</TabsTrigger>
        </TabsList>
        <TabsContent value="console" className="flex-1 overflow-auto">
          <ConsoleTab />
        </TabsContent>
        <TabsContent value="shell" className="flex-1 overflow-auto">
          <ShellTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

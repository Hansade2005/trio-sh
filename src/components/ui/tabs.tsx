import * as React from "react";

// Context for Tabs
const TabsContext = React.createContext<{
  value: string;
  setValue: (val: string) => void;
} | null>(null);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  ...props
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue || "",
  );
  const value =
    controlledValue !== undefined ? controlledValue : uncontrolledValue;
  const setValue = (val: string) => {
    setUncontrolledValue(val);
    onValueChange?.(val);
  };
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div {...props}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function TabsList({ children, ...props }: TabsListProps) {
  return (
    <div role="tablist" {...props}>
      {children}
    </div>
  );
}

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

export function TabsTrigger({
  value: triggerValue,
  children,
  ...props
}: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");
  const selected = ctx.value === triggerValue;
  return (
    <button
      role="tab"
      aria-selected={selected}
      aria-controls={`tab-panel-${triggerValue}`}
      id={`tab-trigger-${triggerValue}`}
      tabIndex={selected ? 0 : -1}
      type="button"
      onClick={() => ctx.setValue(triggerValue)}
      {...props}
      style={{
        ...(props.style || {}),
        borderBottom: selected ? "2px solid #0078d4" : "2px solid transparent",
        fontWeight: selected ? "bold" : undefined,
        outline: selected ? "auto" : undefined,
      }}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
}

export function TabsContent({
  value: contentValue,
  children,
  ...props
}: TabsContentProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");
  if (ctx.value !== contentValue) return null;
  return (
    <div
      role="tabpanel"
      id={`tab-panel-${contentValue}`}
      aria-labelledby={`tab-trigger-${contentValue}`}
      tabIndex={0}
      {...props}
    >
      {children}
    </div>
  );
}

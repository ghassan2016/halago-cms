"use client";

import { cn } from "@/lib/utils";

interface TabsProps {
  tabs: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}

/** أزرار تبويب بسيطة */
export function Tabs({ tabs, value, onChange }: TabsProps) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            value === tab.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/layout/sidebar";
import { NavLinks } from "@/components/layout/nav-links";

/** قائمة جانبية منزلقة للموبايل (hamburger) */
export function MobileNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Menu">
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 flex w-64 flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between border-b pe-2">
              <div className="flex-1">
                <Brand />
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="absolute end-3 top-5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

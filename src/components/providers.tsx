"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm";

export function Providers({ children, dir = "rtl" }: { children: React.ReactNode; dir?: "rtl" | "ltr" }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="top-center" richColors dir={dir} />
      <ConfirmDialog />
    </QueryClientProvider>
  );
}

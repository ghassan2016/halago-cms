"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { LifeBuoy, Flame, Eye } from "lucide-react";

import { getSupportTickets } from "@/services";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, Pagination, useDebounced } from "@/components/list-toolbar";
import { formatDateTime } from "@/lib/utils";

type Variant = "default" | "warning" | "destructive" | "secondary" | "success";

const PRIORITY_VARIANT: Record<string, Variant> = {
  low: "secondary",
  normal: "default",
  high: "warning",
  urgent: "destructive",
};

const STATUS_VARIANT: Record<string, Variant> = {
  open: "destructive",
  in_progress: "warning",
  waiting_user: "default",
  resolved: "success",
  closed: "secondary",
};

export default function SupportPage() {
  const t = useTranslations("support");
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "open" | "urgent" | "mine">("open");
  const debounced = useDebounced(search);

  const status = filter === "open" ? "open" : "";
  const priority = filter === "urgent" ? "urgent" : "";
  const mine = filter === "mine";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["support", page, debounced, filter],
    queryFn: () => getSupportTickets({ page, search: debounced, status, priority, mine }),
    refetchInterval: 15000,
  });

  const tickets = data?.tickets ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-primary" />
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label={t("openCount")} value={data?.openCount ?? 0} icon={LifeBuoy} tone="primary" />
        <StatCard label={t("urgentCount")} value={data?.urgentCount ?? 0} icon={Flame} tone="destructive" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "open", "urgent", "mine"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
          >
            {t(`filter${f.charAt(0).toUpperCase() + f.slice(1)}` as any)}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <TableSkeleton cols={8} />
          ) : isError ? (
            <ErrorState />
          ) : tickets.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("number")}</TableHead>
                    <TableHead>{t("subject")}</TableHead>
                    <TableHead>{t("reporter")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{t("priority")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("assignee")}</TableHead>
                    <TableHead>{t("lastReply")}</TableHead>
                    <TableHead className="text-end">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((tk) => (
                    <TableRow key={tk.id}>
                      <TableCell className="font-mono text-xs">
                        <Link href={`/support/${tk.id}`} className="text-primary hover:underline">
                          {tk.number}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate" title={tk.subject}>
                        <Link href={`/support/${tk.id}`} className="font-medium hover:text-primary hover:underline">
                          {tk.subject}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{tk.reporterName || "—"}</div>
                          <div className="text-xs text-muted-foreground">{t(`reporter_${tk.reporterType}` as any)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t(`category_${tk.category}` as any)}</TableCell>
                      <TableCell>
                        <Badge variant={PRIORITY_VARIANT[tk.priority] || "secondary"}>
                          {t(`priority_${tk.priority}` as any)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[tk.status] || "secondary"}>
                          {t(`st_${tk.status}` as any)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tk.assigneeName || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tk.lastReplyAt ? formatDateTime(tk.lastReplyAt) : formatDateTime(tk.createdAt)}
                      </TableCell>
                      <TableCell className="text-end">
                        <Link href={`/support/${tk.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                            {t("view")}
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination meta={data?.meta ?? null} page={page} onPage={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

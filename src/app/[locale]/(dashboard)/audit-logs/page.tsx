"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";

import { getAuditLogs } from "@/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, Pagination, useDebounced } from "@/components/list-toolbar";
import { formatDateTime } from "@/lib/utils";

const ENTITIES = ["driver", "trip", "withdrawal", "document", "review", "product"];

// ألوان الإجراءات حسب طبيعتها
function actionTone(action: string): "success" | "destructive" | "warning" | "default" {
  if (action.startsWith("approve") || action === "unhide_review" || action === "create_product") return "success";
  if (action.startsWith("reject") || action.startsWith("suspend") || action.startsWith("cancel") || action.startsWith("delete") || action === "hide_review") return "destructive";
  if (action.startsWith("refund") || action.startsWith("reassign")) return "warning";
  return "default";
}

export default function AuditLogsPage() {
  const t = useTranslations("audit");
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [entity, setEntity] = React.useState("");
  const debounced = useDebounced(search);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-logs", page, debounced, entity],
    queryFn: () => getAuditLogs({ page, search: debounced, entity: entity || undefined }),
  });

  const logs = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={entity}
            onChange={(e) => { setEntity(e.target.value); setPage(1); }}
          >
            <option value="">{t("allEntities")}</option>
            {ENTITIES.map((e) => (
              <option key={e} value={e}>{t(`entity_${e}` as any)}</option>
            ))}
          </select>
          <SearchBar value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <TableSkeleton cols={5} />
          ) : isError ? (
            <ErrorState />
          ) : logs.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("actor")}</TableHead>
                    <TableHead>{t("action")}</TableHead>
                    <TableHead>{t("entity")}</TableHead>
                    <TableHead>{t("ref")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className="font-medium">{log.actorName || "—"}</span>
                        {log.actorRole && (
                          <span className="ms-1 text-xs text-muted-foreground">({log.actorRole})</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionTone(log.action)}>{t(`action_${log.action}` as any)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t(`entity_${log.entity}` as any)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.entityId ? `#${log.entityId}` : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
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

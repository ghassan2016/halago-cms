"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Eye, EyeOff } from "lucide-react";

import { getReviews, setReviewHidden } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, Pagination, useDebounced } from "@/components/list-toolbar";
import { formatDate } from "@/lib/utils";

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= value ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const t = useTranslations("reviews");
  const qc = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [stars, setStars] = React.useState<string>("");
  const [hidden, setHidden] = React.useState<string>("");
  const debounced = useDebounced(search);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reviews", page, debounced, stars, hidden],
    queryFn: () =>
      getReviews({
        page,
        search: debounced,
        stars: stars ? Number(stars) : undefined,
        hidden: (hidden || undefined) as "true" | "false" | undefined,
      }),
  });

  const hideMut = useMutation({
    mutationFn: ({ id, hide }: { id: number; hide: boolean }) => setReviewHidden(id, hide),
    onSuccess: (_r, v) => {
      toast.success(v.hide ? t("hiddenMsg") : t("shownMsg"));
      qc.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const reviews = data?.reviews ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label={t("avgStars")} value={Number(data?.avgStars ?? 0).toFixed(2)} icon={Star} tone="warning" />
        <StatCard label={t("totalReviews")} value={String(data?.totalReviews ?? 0)} icon={Star} tone="primary" />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={stars}
          onChange={(e) => { setStars(e.target.value); setPage(1); }}
        >
          <option value="">{t("allStars")}</option>
          {[5, 4, 3, 2, 1].map((s) => (
            <option key={s} value={s}>{t("starsN", { n: s })}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={hidden}
          onChange={(e) => { setHidden(e.target.value); setPage(1); }}
        >
          <option value="">{t("allVisibility")}</option>
          <option value="false">{t("visible")}</option>
          <option value="true">{t("hidden")}</option>
        </select>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          {isLoading ? (
            <TableSkeleton cols={6} />
          ) : isError ? (
            <ErrorState />
          ) : reviews.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("rating")}</TableHead>
                    <TableHead>{t("comment")}</TableHead>
                    <TableHead>{t("about")}</TableHead>
                    <TableHead>{t("by")}</TableHead>
                    <TableHead>{t("trip")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead className="text-end">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((r) => (
                    <TableRow key={r.id} className={r.hidden ? "opacity-50" : ""}>
                      <TableCell><Stars value={r.stars} /></TableCell>
                      <TableCell className="max-w-xs">
                        <span className="line-clamp-2 text-sm">{r.comment || "—"}</span>
                        {r.hidden && <Badge variant="secondary" className="mt-1">{t("hidden")}</Badge>}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{r.toName || "—"}</span>
                        <span className="ms-1 text-xs text-muted-foreground">({t(`role_${r.toType}` as any)})</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.fromName || "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.tripNo || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant={r.hidden ? "outline" : "ghost"}
                            disabled={hideMut.isPending}
                            onClick={() => hideMut.mutate({ id: r.id, hide: !r.hidden })}
                          >
                            {r.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            {r.hidden ? t("show") : t("hide")}
                          </Button>
                        </div>
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

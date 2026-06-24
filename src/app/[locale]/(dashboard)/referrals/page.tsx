"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gift, Coins, CheckCircle, Power } from "lucide-react";

import {
  getReferrals,
  getReferralCodes,
  rewardReferral,
  cancelReferral,
  toggleReferralCode,
} from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { confirm } from "@/components/ui/confirm";
import { StatCard } from "@/components/stat-card";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, Pagination, useDebounced } from "@/components/list-toolbar";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";

type Variant = "default" | "warning" | "destructive" | "secondary" | "success";
const STATUS_VARIANT: Record<string, Variant> = {
  pending: "warning",
  completed: "default",
  rewarded: "success",
  cancelled: "secondary",
};

export default function ReferralsPage() {
  const t = useTranslations("referrals");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<"referrals" | "codes">("referrals");
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "pending" | "completed" | "rewarded">("all");
  const debounced = useDebounced(search);

  React.useEffect(() => setPage(1), [tab, filter]);

  const status = filter === "all" ? "" : filter;

  const refsQuery = useQuery({
    queryKey: ["referrals", page, debounced, status],
    queryFn: () => getReferrals({ page, search: debounced, status }),
    enabled: tab === "referrals",
  });

  const codesQuery = useQuery({
    queryKey: ["referral-codes", page, debounced],
    queryFn: () => getReferralCodes({ page, search: debounced }),
    enabled: tab === "codes",
  });

  const rewardMut = useMutation({
    mutationFn: (id: number) => rewardReferral(id),
    onSuccess: () => {
      toast.success(t("rewarded"));
      qc.invalidateQueries({ queryKey: ["referrals"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const cancelMut = useMutation({
    mutationFn: (id: number) => cancelReferral(id),
    onSuccess: () => {
      toast.success(t("cancelled"));
      qc.invalidateQueries({ queryKey: ["referrals"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => toggleReferralCode(id, active),
    onSuccess: () => {
      toast.success(t("toggled"));
      qc.invalidateQueries({ queryKey: ["referral-codes"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const referrals = refsQuery.data?.referrals ?? [];
  const codes = codesQuery.data?.codes ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("totalReferrals")}
          value={formatNumber(refsQuery.data?.totalReferrals ?? 0)}
          icon={Gift}
          tone="primary"
        />
        <StatCard
          label={t("completedReferrals")}
          value={formatNumber(refsQuery.data?.completedReferrals ?? 0)}
          icon={CheckCircle}
          tone="success"
        />
        <StatCard
          label={t("totalRewards")}
          value={formatCurrency(refsQuery.data?.totalRewards ?? 0)}
          icon={Coins}
          tone="warning"
        />
      </div>

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as "referrals" | "codes")}
        tabs={[
          { value: "referrals", label: t("tabReferrals") },
          { value: "codes", label: t("tabCodes") },
        ]}
      />

      {tab === "referrals" ? (
        <>
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "completed", "rewarded"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
              >
                {t(`filter${f.charAt(0).toUpperCase() + f.slice(1)}` as any)}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">{t("tabReferrals")}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pt-4">
              {refsQuery.isLoading ? (
                <TableSkeleton cols={7} />
              ) : refsQuery.isError ? (
                <ErrorState />
              ) : referrals.length === 0 ? (
                <EmptyState message={t("empty_referrals")} />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("code")}</TableHead>
                        <TableHead>{t("referrer")}</TableHead>
                        <TableHead>{t("referee")}</TableHead>
                        <TableHead>{t("reward")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead>{t("createdAt")}</TableHead>
                        <TableHead className="text-end">{t("actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.code}</TableCell>
                          <TableCell>
                            <div>
                              <div className="text-sm">{r.referrerName || `#${r.referrerId}`}</div>
                              <div className="text-xs text-muted-foreground">{t(`ownerType_${r.referrerType}` as any)}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="text-sm">{r.refereeName || `#${r.refereeId}`}</div>
                              <div className="text-xs text-muted-foreground">{t(`ownerType_${r.refereeType}` as any)}</div>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(r.reward)}</TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[r.status] || "secondary"}>
                              {t(`st_${r.status}` as any)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                          <TableCell className="text-end">
                            <div className="flex justify-end gap-1">
                              {(r.status === "completed" || r.status === "pending") && (
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() =>
                                    confirm({ message: t("reward_action") + "?", variant: "default" })
                                      .then((ok) => ok && rewardMut.mutate(r.id))
                                  }
                                >
                                  <Coins className="h-4 w-4" />
                                  {t("reward_action")}
                                </Button>
                              )}
                              {r.status !== "rewarded" && r.status !== "cancelled" && (
                                <Button size="sm" variant="ghost" onClick={() => cancelMut.mutate(r.id)}>
                                  {tc("cancel")}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Pagination meta={refsQuery.data?.meta ?? null} page={page} onPage={setPage} />
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">{t("tabCodes")}</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pt-4">
            {codesQuery.isLoading ? (
              <TableSkeleton cols={6} />
            ) : codesQuery.isError ? (
              <ErrorState />
            ) : codes.length === 0 ? (
              <EmptyState message={t("empty_codes")} />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("code")}</TableHead>
                      <TableHead>{t("owner")}</TableHead>
                      <TableHead>{t("usageCount")}</TableHead>
                      <TableHead>{t("rewardPerUse")}</TableHead>
                      <TableHead>{t("active")}</TableHead>
                      <TableHead className="text-end">{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs font-medium">{c.code}</TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">{c.ownerName || `#${c.ownerId}`}</div>
                            <div className="text-xs text-muted-foreground">{t(`ownerType_${c.ownerType}` as any)}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatNumber(c.usageCount)}</TableCell>
                        <TableCell>{formatCurrency(c.rewardPerUse)}</TableCell>
                        <TableCell>
                          {c.active ? (
                            <Badge variant="success">{tc("active")}</Badge>
                          ) : (
                            <Badge variant="secondary">{tc("inactive")}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleMut.mutate({ id: c.id, active: !c.active })}
                          >
                            <Power className="h-4 w-4" />
                            {c.active ? tc("inactive") : tc("active")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination meta={codesQuery.data?.meta ?? null} page={page} onPage={setPage} />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

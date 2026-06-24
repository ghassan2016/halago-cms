"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";

import { getVendors } from "@/services";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/data-state";
import { SearchBar, Pagination, useDebounced } from "@/components/list-toolbar";
import { formatNumber } from "@/lib/utils";

export default function VendorsPage() {
  const t = useTranslations("vendors");
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const debounced = useDebounced(search);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendors", page, debounced],
    queryFn: () => getVendors({ page, search: debounced }),
  });

  const vendors = data?.data ?? [];
  const catLabel = (c: string) => {
    const keys: Record<string, string> = { restaurant: "restaurant", grocery: "grocery", pharmacy: "pharmacy", store: "store" };
    return keys[c] ? t(keys[c] as any) : c;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
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
          ) : vendors.length === 0 ? (
            <EmptyState message={t("empty")} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{t("commission")}</TableHead>
                    <TableHead>{t("products")}</TableHead>
                    <TableHead>{t("rating")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={v.name} src={v.logo} className="h-9 w-9 rounded-lg" />
                          <div>
                            <Link href={`/vendors/${v.id}`} className="font-medium hover:text-primary hover:underline">
                              {v.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">{v.address || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{catLabel(v.category)}</TableCell>
                      <TableCell>{v.commission}%</TableCell>
                      <TableCell>{formatNumber(v._count?.products ?? 0)}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                          {Number(v.rating).toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell><StatusBadge status={v.status} /></TableCell>
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

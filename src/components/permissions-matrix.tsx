"use client";

import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MODULES, ROLES, canAccess } from "@/lib/permissions";

/** عرض للقراءة فقط لمصفوفة صلاحيات (الوحدات × الأدوار) */
export function PermissionsMatrix() {
  const t = useTranslations("admins");
  const tn = useTranslations("nav");

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-base">{t("permissionsTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("permissionsSubtitle")}</p>
      </CardHeader>
      <CardContent className="px-0 pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("module")}</TableHead>
              {ROLES.map((r) => (
                <TableHead key={r} className="text-center">{t(`role_${r}` as any)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MODULES.map((mod) => (
              <TableRow key={mod}>
                <TableCell className="font-medium">{tn(mod as any)}</TableCell>
                {ROLES.map((r) => (
                  <TableCell key={r} className="text-center">
                    {canAccess(r, mod) ? (
                      <Check className="mx-auto h-4 w-4 text-success" />
                    ) : (
                      <X className="mx-auto h-4 w-4 text-muted-foreground/30" />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

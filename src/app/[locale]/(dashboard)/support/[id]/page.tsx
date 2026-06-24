"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Send, UserCheck, Lock, RotateCcw, AlertCircle } from "lucide-react";

import { getSupportTicket, replySupportTicket, updateSupportTicket } from "@/services";
import { getErrorMessage } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { confirm } from "@/components/ui/confirm";
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

export default function SupportDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const t = useTranslations("support");
  const td = useTranslations("details");
  const qc = useQueryClient();
  const [reply, setReply] = React.useState("");

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ["support", id],
    queryFn: () => getSupportTicket(id),
    enabled: Number.isFinite(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["support", id] });
    qc.invalidateQueries({ queryKey: ["support"] });
  };

  const replyMut = useMutation({
    mutationFn: (body: string) => replySupportTicket(id, body),
    onSuccess: () => {
      toast.success(t("replySent"));
      setReply("");
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => updateSupportTicket(id, body),
    onSuccess: (_, vars) => {
      const action = String((vars as any)?.action || "");
      if (action === "close") toast.success(t("closed"));
      else if (action === "reopen") toast.success(t("reopened"));
      else if (action === "assign") toast.success(t("assignedToMe"));
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (isError || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <AlertCircle className="h-10 w-10" />
        <p>{td("notFound")}</p>
        <Link href="/support">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {td("back")}
          </Button>
        </Link>
      </div>
    );
  }

  const isClosed = ticket.status === "closed";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/support">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </Link>
          <div>
            <h2 className="text-xl font-bold">{ticket.subject}</h2>
            <p className="text-sm text-muted-foreground font-mono">{ticket.number}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isClosed && (
            <Button size="sm" variant="outline" onClick={() => updateMut.mutate({ action: "assign" })}>
              <UserCheck className="h-4 w-4" />
              {t("assignToMe")}
            </Button>
          )}
          {!isClosed ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                confirm({ message: t("closeConfirm"), variant: "danger" }).then(
                  (ok) => ok && updateMut.mutate({ action: "close" })
                )
              }
            >
              <Lock className="h-4 w-4" />
              {t("close")}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => updateMut.mutate({ action: "reopen" })}>
              <RotateCcw className="h-4 w-4" />
              {t("reopen")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* العمود الأيسر — الميتاداتا */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base">{t("details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label={t("status")} value={<Badge variant={STATUS_VARIANT[ticket.status] || "secondary"}>{t(`st_${ticket.status}` as any)}</Badge>} />
            <Row label={t("priority")} value={<Badge variant={PRIORITY_VARIANT[ticket.priority] || "secondary"}>{t(`priority_${ticket.priority}` as any)}</Badge>} />
            <Row label={t("category")} value={t(`category_${ticket.category}` as any)} />
            <Row label={t("reporter")} value={
              <div className="text-end">
                <div>{ticket.reporterName || "—"}</div>
                <div className="text-xs text-muted-foreground">{t(`reporter_${ticket.reporterType}` as any)}</div>
              </div>
            } />
            {ticket.reporterPhone && <Row label={td("phone")} value={<span dir="ltr">{ticket.reporterPhone}</span>} />}
            {ticket.reporterEmail && <Row label={td("email")} value={<span dir="ltr">{ticket.reporterEmail}</span>} />}
            {ticket.tripNumber && (
              <Row label={t("trip")} value={
                <Link href={`/trips/${ticket.tripId}`} className="text-primary hover:underline" dir="ltr">{ticket.tripNumber}</Link>
              } />
            )}
            <Row label={t("assignee")} value={ticket.assigneeName || "—"} />
            <Row label={t("createdAt")} value={formatDateTime(ticket.createdAt)} />
            {ticket.closedAt && <Row label={t("st_closed")} value={formatDateTime(ticket.closedAt)} />}
          </CardContent>
        </Card>

        {/* العمود الأيمن — المحادثة */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("thread")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* الرسالة الأولى من المبلِّغ */}
            <Bubble side="user" senderName={ticket.reporterName || t(`reporter_${ticket.reporterType}` as any)} createdAt={ticket.createdAt}>
              <div className="text-sm whitespace-pre-wrap">{ticket.body}</div>
            </Bubble>
            {/* بقية الرسائل */}
            {(ticket.messages ?? []).map((m) => (
              <Bubble
                key={m.id}
                side={m.senderType === "admin" ? "admin" : "user"}
                senderName={m.senderName || (m.senderType === "admin" ? t("sender_admin") : t("sender_user"))}
                createdAt={m.createdAt}
              >
                <div className="text-sm whitespace-pre-wrap">{m.body}</div>
              </Bubble>
            ))}

            {/* صندوق الرد */}
            {!isClosed && (
              <div className="border-t pt-4">
                <textarea
                  className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t("replyPlaceholder")}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    disabled={!reply.trim() || replyMut.isPending}
                    onClick={() => replyMut.mutate(reply.trim())}
                  >
                    <Send className="h-4 w-4" />
                    {t("reply")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end">{value}</span>
    </div>
  );
}

function Bubble({
  side,
  senderName,
  createdAt,
  children,
}: {
  side: "admin" | "user";
  senderName: string;
  createdAt: string;
  children: React.ReactNode;
}) {
  const isAdmin = side === "admin";
  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 ${
          isAdmin ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        <div className={`mb-1 flex items-center justify-between gap-3 text-xs ${isAdmin ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          <span className="font-medium">{senderName}</span>
          <span>{formatDateTime(createdAt)}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

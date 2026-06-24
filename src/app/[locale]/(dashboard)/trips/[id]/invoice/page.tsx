"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowLeft, Car, Package } from "lucide-react";

import { getTrip } from "@/services";
import { api, unwrap } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const t = useTranslations("invoice");
  const tApp = useTranslations("app");

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => getTrip(id),
    enabled: Number.isFinite(id),
  });

  // ZATCA QR من الخادم — TLV encoded base64 PNG
  const { data: qr } = useQuery({
    queryKey: ["trip-qr", id],
    queryFn: async () => unwrap<{ dataUrl: string }>((await api.get(`/trips/${id}/qr`)).data),
    enabled: Number.isFinite(id) && !!trip,
  });

  if (isLoading || !trip) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // فاتورة بنمط ZATCA المبسّط — نحسب الضريبة 15% من الإجمالي
  const total = Number(trip.fare || 0);
  const subtotal = Number((total / 1.15).toFixed(2));
  const tax = Number((total - subtotal).toFixed(2));
  const invoiceNo = `HG-INV-${String(trip.id).padStart(6, "0")}`;
  const paymentLabel = trip.paymentMethod === "cash" ? t("cash") : trip.paymentMethod === "card" ? t("card") : t("wallet");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* شريط طباعة لا يظهر في النسخة المطبوعة */}
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/trips/${trip.id}`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          {t("print")}
        </Button>
      </div>

      {/* الفاتورة */}
      <div id="invoice" className="rounded-xl border bg-white p-8 text-black shadow-sm print:shadow-none print:border-0 print:rounded-none print:p-0">
        {/* الهيدر */}
        <div className="mb-6 flex items-start justify-between border-b border-gray-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-white">
                <Car className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-green-700">{tApp("name")}</h1>
                <p className="text-xs text-gray-500">{tApp("tagline")}</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600">
              {t("vatNumber")}: <span dir="ltr" className="font-mono">300000000000003</span>
            </div>
          </div>
          <div className="text-end">
            <h2 className="text-xl font-bold">{t("title")}</h2>
            <div className="mt-1 text-xs text-gray-600">
              <div>{t("invoiceNo")}: <span className="font-mono">{invoiceNo}</span></div>
              <div>{t("date")}: {formatDateTime(trip.createdAt)}</div>
              <div>{t("tripNo")}: <span className="font-mono">{trip.number}</span></div>
            </div>
            {/* ZATCA QR Code (TLV base64) */}
            <div className="mt-2 flex items-end justify-end">
              {qr?.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr.dataUrl} alt="ZATCA QR" className="h-24 w-24 rounded border bg-white" />
              ) : (
                <div className="h-24 w-24 animate-pulse rounded border border-dashed border-gray-300 bg-gray-50" />
              )}
            </div>
          </div>
        </div>

        {/* بيانات العميل والسائق */}
        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{t("billTo")}</div>
            <div className="font-medium">{trip.customer?.name || "—"}</div>
            {trip.customer?.phone && <div className="text-xs text-gray-600" dir="ltr">{trip.customer.phone}</div>}
          </div>
          <div className="text-end">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{t("driver")}</div>
            <div className="font-medium">{trip.driver?.name || "—"}</div>
            {trip.driver?.phone && <div className="text-xs text-gray-600" dir="ltr">{trip.driver.phone}</div>}
          </div>
        </div>

        {/* المسار */}
        <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">{t("from")}</div>
            <div>{trip.pickupAddress || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">{t("to")}</div>
            <div>{trip.dropAddress || "—"}</div>
          </div>
        </div>

        {/* بنود الفاتورة */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-500">
              <th className="py-2 text-start font-medium">{t("service")}</th>
              <th className="py-2 text-end font-medium">{t("distance")}</th>
              <th className="py-2 text-end font-medium">{t("duration")}</th>
              <th className="py-2 text-end font-medium">{t("subtotal")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3">
                <div className="flex items-center gap-2">
                  {trip.type === "ride" ? <Car className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                  <span>{trip.type === "ride" ? t("ride") : t("delivery")}</span>
                </div>
              </td>
              <td className="py-3 text-end tabular-nums">{Number(trip.distance).toFixed(1)} {t("km")}</td>
              <td className="py-3 text-end tabular-nums">{trip.duration} {t("min")}</td>
              <td className="py-3 text-end tabular-nums">{formatCurrency(subtotal)}</td>
            </tr>
          </tbody>
        </table>

        {/* الإجماليات */}
        <div className="mt-4 ms-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between border-b border-gray-100 py-1">
            <span className="text-gray-600">{t("subtotal")}</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-100 py-1">
            <span className="text-gray-600">{t("tax")}</span>
            <span className="tabular-nums">{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between py-2 text-base font-bold">
            <span>{t("total")}</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{t("paymentMethod")}</span>
            <span>{paymentLabel}</span>
          </div>
        </div>

        {/* الفوتر */}
        <div className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
          <p>{t("thanks")}</p>
          <p className="mt-1">{t("support")}</p>
        </div>
      </div>

      {/* CSS للطباعة */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          aside, header, nav, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
          #invoice { box-shadow: none !important; border: 0 !important; }
        }
      `}</style>
    </div>
  );
}

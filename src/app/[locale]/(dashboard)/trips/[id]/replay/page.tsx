"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Play, Pause, RotateCcw, ArrowLeft, MapPin, Route as RouteIcon, Clock } from "lucide-react";

import { api, unwrap } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/data-state";

const ReplayMap = dynamic(() => import("@/components/replay-map"), { ssr: false });

interface ReplayPoint {
  lat: number;
  lng: number;
  speed: number;
  recordedAt: string;
}

interface ReplayData {
  trip: {
    id: number;
    number: string;
    pickupAddress?: string | null;
    dropAddress?: string | null;
    distance: number;
    duration: number;
    status: string;
    createdAt: string;
  };
  points: ReplayPoint[];
  hasPath: boolean;
}

const SPEED_OPTIONS = [1, 2, 4, 8];

export default function ReplayPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const t = useTranslations("replay");

  const { data, isLoading } = useQuery({
    queryKey: ["trip-replay", id],
    queryFn: async () => unwrap<ReplayData>((await api.get(`/trips/${id}/replay`)).data),
    enabled: Number.isFinite(id),
  });

  const [idx, setIdx] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(2);
  const points = data?.points ?? [];

  // animation loop
  React.useEffect(() => {
    if (!playing || points.length < 2) return;
    const t = setInterval(() => {
      setIdx((i) => {
        if (i >= points.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, Math.max(50, 500 / speed));
    return () => clearInterval(t);
  }, [playing, speed, points.length]);

  function reset() {
    setIdx(0);
    setPlaying(false);
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-[60vh] w-full" />
      </div>
    );
  }

  if (!data.hasPath) {
    return (
      <div className="space-y-4">
        <Link href={`/trips/${id}`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {t("back")}
          </Button>
        </Link>
        <EmptyState message={t("noPath")} />
      </div>
    );
  }

  const cur = points[Math.min(idx, points.length - 1)];
  const progress = points.length > 0 ? (idx / (points.length - 1)) * 100 : 0;
  const elapsed = points.length > 0
    ? Math.round((new Date(cur.recordedAt).getTime() - new Date(points[0].recordedAt).getTime()) / 60000)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/trips/${id}`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </Link>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              {t("title")}
              <Badge variant="secondary" className="font-mono">{data.trip.number}</Badge>
            </h2>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="h-[520px] w-full overflow-hidden rounded-xl">
              <ReplayMap points={points} currentIndex={idx} />
            </div>
            {/* شريط التحكّم */}
            <div className="border-t p-3 space-y-3">
              <div className="flex items-center gap-3">
                <Button onClick={() => setPlaying((p) => !p)} variant={playing ? "outline" : "default"}>
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playing ? t("pause") : t("play")}
                </Button>
                <Button variant="ghost" onClick={reset}>
                  <RotateCcw className="h-4 w-4" />
                  {t("reset")}
                </Button>
                <div className="flex items-center gap-1 ms-auto">
                  <span className="text-xs text-muted-foreground">{t("speed")}:</span>
                  {SPEED_OPTIONS.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={speed === s ? "default" : "ghost"}
                      onClick={() => setSpeed(s)}
                      className="h-7 px-2 text-xs"
                    >
                      {s}×
                    </Button>
                  ))}
                </div>
              </div>
              {/* شريط التقدّم */}
              <input
                type="range"
                min={0}
                max={points.length - 1}
                value={idx}
                onChange={(e) => setIdx(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>{idx + 1} / {points.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">{t("title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">{t("from")}</div>
                <div>{data.trip.pickupAddress || "—"}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">{t("to")}</div>
                <div>{data.trip.dropAddress || "—"}</div>
              </div>
            </div>
            <div className="border-t pt-3 space-y-2">
              <Row icon={<RouteIcon className="h-4 w-4" />} label={t("distance")} value={`${Number(data.trip.distance).toFixed(1)} km`} />
              <Row icon={<Clock className="h-4 w-4" />} label={t("elapsed")} value={`${elapsed} min`} />
              <Row icon={<RouteIcon className="h-4 w-4" />} label={t("points")} value={`${points.length}`} />
              <Row label={t("speed")} value={`${Number(cur.speed).toFixed(0)} km/h`} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

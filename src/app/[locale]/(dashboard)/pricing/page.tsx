"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Tabs } from "@/components/ui/tabs";
import { PricingRules } from "@/components/pricing/pricing-rules";
import { PricingClasses } from "@/components/pricing/pricing-classes";
import { PricingZones } from "@/components/pricing/pricing-zones";
import { PricingFees } from "@/components/pricing/pricing-fees";
import { PricingSurge } from "@/components/pricing/pricing-surge";
import { FareCalculator } from "@/components/pricing/fare-calculator";

export default function PricingPage() {
  const t = useTranslations("pricing");
  const [tab, setTab] = React.useState("rules");

  const tabs = [
    { value: "rules", label: t("rulesTab") },
    { value: "classes", label: t("classesTab") },
    { value: "zones", label: t("zonesTab") },
    { value: "fees", label: t("feesTab") },
    { value: "surge", label: t("surgeTab") },
    { value: "calc", label: t("calcTab") },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === "rules" && <PricingRules />}
      {tab === "classes" && <PricingClasses />}
      {tab === "zones" && <PricingZones />}
      {tab === "fees" && <PricingFees />}
      {tab === "surge" && <PricingSurge />}
      {tab === "calc" && <FareCalculator />}
    </div>
  );
}

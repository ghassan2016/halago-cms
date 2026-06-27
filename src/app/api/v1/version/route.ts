import { okV1 } from "@/lib/v1/api";

// GET /api/v1/version — للتحقّق من تحديث التطبيق
export async function GET() {
  return okV1({
    minVersion: { android: "0.1.0", ios: "0.1.0" },
    latestVersion: { android: "0.1.0", ios: "0.1.0" },
    forceUpdate: false,
    storeUrl: {
      android: "https://play.google.com/store/apps/details?id=com.halago.customer",
      ios: "https://apps.apple.com/sa/app/halago/id000000000",
    },
  });
}

// In-memory event bus لإرسال أحداث live للموبايل عبر Server-Sent Events.
// ⚠️ Vercel serverless: لا يتشارك بين instances. للإنتاج: Redis Pub/Sub أو Pusher.
//    لكن في dev + Vercel single-region يكفي للاختبار.

type Listener = (event: BusEvent) => void;

export interface BusEvent {
  channel: string; // مثل: trip:123 أو driver:7
  type: string; // trip.status_changed | trip.location | driver.new_trip
  payload: unknown;
  id?: string;
  ts: number;
}

const listeners = new Map<string, Set<Listener>>();

export function subscribe(channels: string[], cb: Listener): () => void {
  for (const ch of channels) {
    if (!listeners.has(ch)) listeners.set(ch, new Set());
    listeners.get(ch)!.add(cb);
  }
  return () => {
    for (const ch of channels) {
      listeners.get(ch)?.delete(cb);
      if (listeners.get(ch)?.size === 0) listeners.delete(ch);
    }
  };
}

export function publish(event: Omit<BusEvent, "ts"> & { ts?: number }): void {
  const full: BusEvent = { ...event, ts: event.ts ?? Date.now() };
  const set = listeners.get(full.channel);
  if (!set) return;
  // Array.from لأن downlevelIteration غير مفعّل في tsconfig الأصلي
  for (const cb of Array.from(set)) {
    try {
      cb(full);
    } catch (e) {
      console.error("[events] listener failed", e);
    }
  }
}

// ===== Helpers للأحداث الشائعة =====

export function emitTripStatusChange(tripId: number, status: string, payload?: unknown) {
  publish({
    channel: `trip:${tripId}`,
    type: "trip.status_changed",
    payload: { status, ...((payload ?? {}) as object) },
  });
}

export function emitTripLocation(
  tripId: number,
  driverLat: number,
  driverLng: number,
) {
  publish({
    channel: `trip:${tripId}`,
    type: "trip.location",
    payload: { lat: driverLat, lng: driverLng },
  });
}

export function emitNewTripForNearbyDrivers(tripId: number, city?: string | null) {
  publish({
    channel: city ? `city:${city}` : "drivers:all",
    type: "driver.new_trip",
    payload: { tripId: String(tripId) },
  });
}

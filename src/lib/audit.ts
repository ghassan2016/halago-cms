import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";

/**
 * تسجيل إجراء إداري حسّاس في سجل التدقيق.
 * لا يرمي خطأ أبداً حتى لا يُفشل العملية الأصلية إن تعذّر التسجيل.
 */
export async function logAudit(
  session: SessionPayload | undefined,
  action: string,
  entity: string,
  entityId?: number | null,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: session?.sub ? Number(session.sub) : null,
        actorName: session?.name ?? null,
        actorRole: session?.role ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });
  } catch {
    /* تجاهل أخطاء التسجيل */
  }
}

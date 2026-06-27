// أدوات أرقام الجوّال (السعودية افتراضياً، قابل للتوسّع للخليج).
const SA_REGEX = /^\+9665\d{8}$/;
const SA_LOCAL_REGEX = /^(?:0?5\d{8})$/;

export function normalizeSaudiPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim().replace(/[\s-]/g, "");
  if (SA_REGEX.test(trimmed)) return trimmed;
  // 0512345678 أو 512345678
  if (SA_LOCAL_REGEX.test(trimmed)) {
    const body = trimmed.startsWith("0") ? trimmed.slice(1) : trimmed;
    return `+966${body}`;
  }
  // 00966512345678
  if (trimmed.startsWith("00")) {
    const candidate = `+${trimmed.slice(2)}`;
    if (SA_REGEX.test(candidate)) return candidate;
  }
  return null;
}

export function isValidSaudiPhone(phone: string): boolean {
  return SA_REGEX.test(phone);
}

export function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  const last4 = phone.slice(-4);
  return `${phone.slice(0, 4)}***${last4}`;
}

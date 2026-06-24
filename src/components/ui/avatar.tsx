import * as React from "react";
import { cn, initials } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
}

/** Avatar بسيط: يعرض الصورة أو الأحرف الأولى من الاسم */
export function Avatar({ src, name, className }: AvatarProps) {
  const [error, setError] = React.useState(false);
  const showImage = src && !error;
  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-medium text-primary",
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src!} alt={name ?? ""} className="h-full w-full object-cover" onError={() => setError(true)} />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}

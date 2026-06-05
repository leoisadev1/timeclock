import { cn } from "@timeclock/ui/lib/utils";
import { useState } from "react";

export function employeeAvatarUrl(id: string, _name: string, url?: string | null) {
  return url ?? `https://i.pravatar.cc/150?u=${encodeURIComponent(id)}`;
}

const SIZE_CLASSES = {
  xs: "size-6 text-[9px]",
  sm: "size-7 text-[10px]",
  md: "size-8 text-[10px]",
  lg: "size-10 text-xs",
  xl: "size-14 text-sm",
} as const;

export type EmployeeAvatarSize = keyof typeof SIZE_CLASSES;

export function EmployeeAvatar({
  name,
  initials,
  avatarColor,
  avatarUrl,
  employeeId,
  size = "md",
  className,
}: {
  name: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string | null;
  employeeId?: string;
  size?: EmployeeAvatarSize;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const photoSrc = avatarUrl
    ? employeeAvatarUrl(employeeId ?? name, name, avatarUrl)
    : `https://i.pravatar.cc/128?u=${encodeURIComponent(name)}`;

  if (imgFailed) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
          SIZE_CLASSES[size],
          avatarColor,
          className,
        )}
        aria-hidden
      >
        {initials}
      </span>
    );
  }

  return (
    <img
      src={photoSrc}
      alt={name}
      className={cn(
        "shrink-0 rounded-full object-cover ring-1 ring-border",
        SIZE_CLASSES[size],
        className,
      )}
      onError={() => setImgFailed(true)}
    />
  );
}

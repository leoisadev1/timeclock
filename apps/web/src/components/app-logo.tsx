interface AppLogoProps {
  className?: string;
}

export function AppLogo({ className = "size-10" }: AppLogoProps) {
  return (
    <img
      src="/logo.png"
      alt=""
      aria-hidden
      className={`shrink-0 rounded-xl object-cover ${className}`}
    />
  );
}

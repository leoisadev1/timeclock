import { AppLogo } from "@/components/app-logo";

interface ManagerSidebarBrandProps {
  collapsed?: boolean;
}

export function ManagerSidebarBrand({ collapsed = false }: ManagerSidebarBrandProps) {
  return (
    <div
      className={`flex items-center px-4 pt-5 pb-4 ${collapsed ? "justify-center px-2" : "gap-3"}`}
    >
      <AppLogo
        className={`shrink-0 motion-product transition-[width,height] duration-200 ${
          collapsed ? "size-9" : "size-11"
        }`}
      />
      {!collapsed ? (
        <p className="truncate text-xl font-bold tracking-tight text-sidebar-foreground">
          Timeclock
        </p>
      ) : null}
    </div>
  );
}

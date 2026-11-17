import { PackageOpen } from "lucide-react";

export default function AdminEmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={40} className="mb-3 text-slate-300" />
      <p className="text-sm text-slate-500">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

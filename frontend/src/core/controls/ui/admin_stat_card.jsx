export default function AdminStatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  valueClass = "text-xl font-black text-slate-900",
  sub,
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
      <div className={["mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl", iconBg].join(" ")}>
        <Icon size={20} className={iconColor} />
      </div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={["mt-1", valueClass].join(" ")}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

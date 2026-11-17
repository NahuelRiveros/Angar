export default function AdminSpinner({ fullPage = false }) {
  const dot = <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />;
  return (
    <div className={fullPage
      ? "flex min-h-[60vh] items-center justify-center"
      : "flex justify-center py-20"}>
      {dot}
    </div>
  );
}

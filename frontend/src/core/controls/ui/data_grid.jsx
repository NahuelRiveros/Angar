/**
 * DataGrid — tabla reutilizable con búsqueda, ordenamiento y paginación.
 *
 * ── USO BÁSICO ──────────────────────────────────────────────────────────────
 *
 *   <DataGrid
 *     rows={items}
 *     keyField="id"
 *     columns={[
 *       { key: "nombre",  label: "Nombre", sortable: true },
 *       { key: "estado",  label: "Estado", render: (row) => <Badge>{row.estado}</Badge> },
 *     ]}
 *   />
 *
 * ── PAGINACIÓN INTERNA (todos los datos en memoria) ─────────────────────────
 *
 *   <DataGrid rows={todos} pageSize={20} />
 *
 * ── PAGINACIÓN EXTERNA (server-side) ────────────────────────────────────────
 *
 *   <DataGrid
 *     rows={items}              // solo la página actual
 *     page={page}               // número de página actual (1-based)
 *     totalPages={pag.totalPages}
 *     totalRows={pag.total}     // opcional, para mostrar el total
 *     onPageChange={setPage}    // activa modo externo
 *     onPageSizeChange={setLimit}
 *     pageSize={limit}
 *   />
 *
 * ── ACCIONES POR FILA ────────────────────────────────────────────────────────
 *
 *   actions={[
 *     { key: "ver",     label: "Ver",     icon: <Eye size={13}/>,    variant: "primary", onClick: (row) => nav(`/.../${row.id}`) },
 *     { key: "borrar",  label: "Borrar",  icon: <Trash2 size={13}/>, variant: "danger",  onClick: (row) => borrar(row),
 *       show: (row) => row.activo },
 *   ]}
 *
 * ── COLUMNAS ────────────────────────────────────────────────────────────────
 *
 *   {
 *     key:             "campo.anidado",  // dot-notation para acceso anidado
 *     label:           "Encabezado",
 *     sortable:        true,             // habilita sort A-Z / Z-A
 *     searchable:      true,             // incluido en búsqueda global
 *     hidden:          false,            // ocultar columna (ej: por responsive)
 *     align:           "left",           // "left" | "center" | "right"
 *     render:          (row, val) => <JSX />,
 *     className:       "font-bold",      // clases para <td>
 *     headerClassName: "w-40",           // clases para <th>
 *   }
 */

import { useMemo, useState } from "react";
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Inbox,
} from "lucide-react";
import InputField from "./input_field.jsx";

/* ── helpers ─────────────────────────────────────────────────────────────── */

function getValue(row, key) {
  if (!key) return "";
  return String(
    key.split(".").reduce((acc, part) => acc?.[part], row) ?? ""
  );
}

const VARIANT_CLASS = {
  primary: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  danger:  "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  warning: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  default: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
};

function ActionButton({ action, row }) {
  const visible = typeof action.show === "function" ? action.show(row) : action.show !== false;
  if (!visible) return null;
  const disabled = typeof action.disabled === "function" ? action.disabled(row) : !!action.disabled;
  const cls = VARIANT_CLASS[action.variant ?? "default"] ?? VARIANT_CLASS.default;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); action.onClick?.(row); }}
      disabled={disabled}
      title={action.label}
      aria-label={action.label}
      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${cls} ${action.className ?? ""}`}
    >
      {action.icon && <span className="shrink-0">{action.icon}</span>}
      {!action.iconOnly && <span>{action.label}</span>}
    </button>
  );
}

const SKELETON_W = ["72%","48%","60%","42%","55%","36%","44%","30%"];

function SkeletonRow({ colCount }) {
  return (
    <tr className="border-t border-slate-100">
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 rounded bg-slate-100 animate-pulse"
            style={{ width: SKELETON_W[i % SKELETON_W.length] }}
          />
        </td>
      ))}
    </tr>
  );
}

/* ── componente principal ─────────────────────────────────────────────────── */

export default function DataGrid({
  /* contenido */
  rows = [],
  columns = [],
  keyField = "id",
  loading = false,
  emptyMessage = "No hay registros disponibles.",
  /* búsqueda */
  searchable = true,
  searchPlaceholder = "Buscar…",
  searchColumns = [],
  /* header opcional */
  title,
  subtitle,
  /* acciones */
  actions = [],
  actionsLabel = "Acciones",
  actionsPosition = "end",
  /* paginación interna */
  pageSize: defaultPageSize = 20,
  pageSizeOptions = [10, 20, 30, 50],
  /* paginación externa (server-side) — activar pasando onPageChange */
  page: externalPage,
  totalPages: externalTotalPages,
  totalRows: externalTotalRows,
  onPageChange,
  onPageSizeChange,
  pageSize: externalPageSize,
  onSearch,
  /* misc */
  className = "",
  onRowClick,
}) {
  const [query, setQuery]           = useState("");
  const [sortKey, setSortKey]       = useState(null);
  const [sortDir, setSortDir]       = useState(null);
  const [internalPage, setInternalPage]         = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize);

  const isExternal = typeof onPageChange === "function";
  const pageSize   = isExternal ? (externalPageSize ?? defaultPageSize) : internalPageSize;
  const page       = isExternal ? Math.max(1, Number(externalPage) || 1) : internalPage;

  /* columnas visibles */
  const visCols = useMemo(() => columns.filter((c) => !c.hidden), [columns]);

  /* columnas en las que buscar */
  const searchCols = useMemo(() => {
    if (searchColumns.length > 0) return searchColumns;
    return visCols.filter((c) => c.searchable !== false).map((c) => c.key);
  }, [visCols, searchColumns]);

  /* filtro + sort (solo modo interno) */
  const processed = useMemo(() => {
    if (isExternal) return rows;

    let result = rows;
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter((row) =>
        searchCols.some((key) => getValue(row, key).toLowerCase().includes(q))
      );
    }
    if (sortKey && sortDir) {
      result = [...result].sort((a, b) => {
        const cmp = getValue(a, sortKey).localeCompare(
          getValue(b, sortKey), undefined, { numeric: true, sensitivity: "base" }
        );
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, isExternal, query, searchCols, sortKey, sortDir]);

  /* paginación */
  const totalRows  = isExternal ? (externalTotalRows ?? rows.length) : processed.length;
  const totalP     = isExternal
    ? Math.max(1, Number(externalTotalPages) || 1)
    : Math.max(1, Math.ceil(processed.length / pageSize));
  const safePage   = Math.min(Math.max(1, page), totalP);

  const pageRows = useMemo(() => {
    if (isExternal) return rows;
    return processed.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [processed, rows, isExternal, safePage, pageSize]);

  const rangeStart = totalRows === 0 ? 0 : isExternal ? (safePage - 1) * pageSize + 1 : (safePage - 1) * pageSize + 1;
  const rangeEnd   = totalRows === 0 ? 0 : isExternal ? (safePage - 1) * pageSize + rows.length : Math.min(safePage * pageSize, processed.length);

  /* handlers */
  function handleSort(key) {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortKey(null); setSortDir(null); }
  }

  function goPage(next) {
    const v = Math.min(Math.max(1, next), totalP);
    if (isExternal) { onPageChange(v); return; }
    setInternalPage(v);
  }

  function changePageSize(size) {
    const v = Number(size);
    setInternalPageSize(v);
    onPageSizeChange?.(v);
    goPage(1);
  }

  function handleSearch(val) {
    setQuery(val);
    if (isExternal && typeof onSearch === "function") {
      onSearch(val);
    }
    if (!isExternal) setInternalPage(1);
  }

  const hasActions = actions.length > 0;
  const colCount   = visCols.length + (hasActions ? 1 : 0);
  const showPag    = !loading && totalRows > 0;

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>

      {/* ── header: title + búsqueda ── */}
      {(title || subtitle || searchable) && (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {(title || subtitle) && (
            <div>
              {title    && <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          )}
          {searchable && (
            <InputField
              hideLabel
              hideMessage
              fullWidth={false}
              wrapperClassName="sm:w-64"
              type="text"
              icon={Search}
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="text-xs"
            />
          )}
        </div>
      )}

      {/* ── tabla ── */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">

          {/* encabezados */}
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {hasActions && actionsPosition === "start" && (
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {actionsLabel}
                </th>
              )}
              {visCols.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  className={[
                    "px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition select-none",
                    col.sortable     ? "cursor-pointer group"  : "",
                    sortKey === col.key ? "text-blue-600"      : "text-slate-500",
                    col.align === "right"  ? "text-right"      : col.align === "center" ? "text-center" : "text-left",
                    col.headerClassName ?? "",
                  ].filter(Boolean).join(" ")}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      sortKey === col.key
                        ? sortDir === "asc"
                          ? <ChevronUp size={11} className="text-blue-500" />
                          : <ChevronDown size={11} className="text-blue-500" />
                        : <ChevronsUpDown size={11} className="text-slate-300 group-hover:text-slate-500 transition" />
                    )}
                  </span>
                </th>
              ))}
              {hasActions && actionsPosition === "end" && (
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {actionsLabel}
                </th>
              )}
            </tr>
          </thead>

          {/* filas */}
          <tbody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                <SkeletonRow key={i} colCount={colCount} />
              ))
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox size={24} className="text-slate-300" />
                    <p className="text-sm text-slate-400">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => {
                const rowKey = String(row[keyField] ?? idx);
                return (
                  <tr
                    key={rowKey}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={[
                      "border-t border-slate-100 transition",
                      onRowClick ? "cursor-pointer hover:bg-blue-50/40" : "hover:bg-slate-50/60",
                    ].join(" ")}
                  >
                    {hasActions && actionsPosition === "start" && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {actions.map((a) => <ActionButton key={a.key ?? a.label} action={a} row={row} />)}
                        </div>
                      </td>
                    )}

                    {visCols.map((col) => {
                      const val = getValue(row, col.key);
                      return (
                        <td
                          key={col.key}
                          className={[
                            "px-4 py-3 text-sm",
                            col.align === "right"  ? "text-right"  : col.align === "center" ? "text-center" : "",
                            col.className ?? "",
                          ].filter(Boolean).join(" ")}
                        >
                          {col.render
                            ? col.render(row, val)
                            : val || <span className="text-slate-300">—</span>}
                        </td>
                      );
                    })}

                    {hasActions && actionsPosition === "end" && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {actions.map((a) => <ActionButton key={a.key ?? a.label} action={a} row={row} />)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── footer: paginación ── */}
      {showPag && (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

          {/* info + filas por página */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              <b className="text-slate-700">{rangeStart}</b>–<b className="text-slate-700">{rangeEnd}</b>
              {" "}de{" "}
              <b className="text-slate-700">{totalRows}</b>
            </span>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500">Filas</label>
              <select
                value={pageSize}
                onChange={(e) => changePageSize(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              >
                {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* botones de página */}
          <div className="flex items-center gap-1">
            <NavBtn onClick={() => goPage(1)}          disabled={safePage <= 1} title="Primera página">
              <ChevronsLeft size={12} />
            </NavBtn>
            <NavBtn onClick={() => goPage(safePage-1)} disabled={safePage <= 1} title="Página anterior">
              <ChevronLeft size={12} />
            </NavBtn>
            <span className="min-w-[3rem] text-center text-xs font-semibold text-slate-700">
              {safePage} / {totalP}
            </span>
            <NavBtn onClick={() => goPage(safePage+1)} disabled={safePage >= totalP} title="Página siguiente">
              <ChevronRight size={12} />
            </NavBtn>
            <NavBtn onClick={() => goPage(totalP)}     disabled={safePage >= totalP} title="Última página">
              <ChevronsRight size={12} />
            </NavBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function NavBtn({ onClick, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
    >
      {children}
    </button>
  );
}

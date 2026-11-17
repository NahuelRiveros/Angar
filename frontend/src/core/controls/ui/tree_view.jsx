/**
 * TreeView — árbol jerárquico reusable (categorías, cualquier dato con
 * padre_id). Mismo lenguaje visual y forma de `actions` que DataGrid
 * (data_grid.jsx) — si ya sabés usar uno, sabés usar el otro.
 *
 * ── USO BÁSICO ──────────────────────────────────────────────────────────────
 *
 *   <TreeView
 *     items={categorias}          // array PLANO — el árbol se arma solo
 *     keyField="id"
 *     parentField="padre_id"      // null/undefined = nodo raíz
 *     renderLabel={(item) => item.nombre}
 *     actions={[
 *       { key: "editar", label: "Editar", icon: <Edit2 size={12}/>, variant: "primary", onClick: abrirEditar },
 *       { key: "eliminar", label: "Eliminar", icon: <Trash2 size={12}/>, variant: "danger", onClick: eliminar },
 *     ]}
 *   />
 *
 * `actions` acepta lo mismo que DataGrid: `show(item)` para condicionales,
 * `disabled(item)`, `variant` ("primary"|"danger"|"success"|"warning").
 *
 * ── CARGA PEREZOSA (catálogos grandes) ──────────────────────────────────────
 *
 * Si un nodo puede tener hijos que todavía no llegaron en `items` (ej. un
 * árbol de miles de productos donde solo cargás los de la categoría que se
 * abre), marcalo con `siempreExpandible: true` en el item, y pasá `onExpandir`
 * — se llama (una vez por expansión, con `await`) cuando el usuario abre ese
 * nodo por primera vez; ahí es el momento de pedir sus hijos al servidor y
 * agregarlos a `items`. Mientras se resuelve, el nodo muestra un spinner en
 * vez del chevron. Es responsabilidad de quien use TreeView cachear el
 * resultado (no volver a pedirlo si ya se cargó) — TreeView no lo cachea.
 */

import { useMemo, useState } from "react";
import { Search, ChevronRight, ChevronDown, FolderTree, Folder, Loader2 } from "lucide-react";
import InputField from "./input_field.jsx";

const VARIANT_CLASS = {
  primary: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  danger:  "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  warning: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  default: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
};

// Ícono + tooltip (título), sin texto visible — con 3-5 acciones por fila
// (fila de producto: variedades/ajustar/editar/activar-desactivar/eliminar)
// texto no entra cómodo en una fila angosta de celular. El label sigue
// disponible como `title`/`aria-label`, no se pierde accesibilidad.
function ActionButton({ action, item }) {
  const visible = typeof action.show === "function" ? action.show(item) : action.show !== false;
  if (!visible) return null;
  const disabled = typeof action.disabled === "function" ? action.disabled(item) : !!action.disabled;
  const cls = VARIANT_CLASS[action.variant ?? "default"] ?? VARIANT_CLASS.default;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); action.onClick?.(item); }}
      disabled={disabled}
      title={action.label}
      aria-label={action.label}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border p-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
    >
      {action.icon}
    </button>
  );
}

/** item plano → { ...item, children: [...] }, recursivo */
function construirArbol(items, keyField, parentField) {
  const porId = new Map(items.map((it) => [it[keyField], { ...it, children: [] }]));
  const raices = [];
  for (const item of items) {
    const nodo = porId.get(item[keyField]);
    const padreId = item[parentField];
    const padre = padreId != null ? porId.get(padreId) : null;
    if (padre) padre.children.push(nodo);
    else raices.push(nodo);
  }
  return raices;
}

/** true si el nodo o algún descendiente matchea la búsqueda */
function nodoOHijoMatchea(nodo, query, buscarEn) {
  const propio = buscarEn(nodo).toLowerCase().includes(query);
  return propio || nodo.children.some((h) => nodoOHijoMatchea(h, query, buscarEn));
}

function TreeNode({ nodo, expandidos, cargandoIds, toggle, actions, keyField, renderLabel, query, buscarEn }) {
  const id = nodo[keyField];
  const tieneHijos = nodo.children.length > 0 || !!nodo.siempreExpandible;
  const abierto = query ? true : expandidos.has(id); // con búsqueda activa, todo expandido
  const cargando = cargandoIds.has(id);
  const visible = !query || nodoOHijoMatchea(nodo, query, buscarEn);

  if (!visible) return null;

  return (
    <div>
      <div
        // Fondo apenas teñido en los nodos "contenedor" (tienen hijos) — el
        // ojo distingue de entrada una fila de organización de una fila de
        // ítem final, sin depender solo del color del ícono.
        className={`group flex flex-wrap items-center gap-1.5 rounded-lg py-2.5 pr-2 pl-1 hover:bg-slate-100 ${tieneHijos ? "bg-slate-50/70" : ""}`}
      >
        <button
          type="button"
          onClick={() => tieneHijos && !cargando && toggle(id, nodo)}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tieneHijos ? "text-slate-400 hover:bg-slate-200" : "invisible"}`}
        >
          {cargando
            ? <Loader2 size={13} className="animate-spin" />
            : tieneHijos && (abierto ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </button>

        {tieneHijos
          ? <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500"><FolderTree size={13} /></span>
          : <span className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-300"><Folder size={13} /></span>}

        <span className="flex min-w-0 flex-1 items-center text-sm font-medium text-slate-700">
          {renderLabel(nodo)}
        </span>

        {actions.length > 0 && (
          // En pantallas angostas las acciones pasan a su propia línea (a la
          // derecha) en vez de competir por espacio con el nombre — si no,
          // con 3+ acciones el nombre queda ilegible/cortado en celular.
          <div className="flex shrink-0 items-center gap-1 max-sm:w-full max-sm:justify-end">
            {actions.map((a) => <ActionButton key={a.key ?? a.label} action={a} item={nodo} />)}
          </div>
        )}
      </div>

      {tieneHijos && abierto && (
        // Línea guía a la izquierda de los hijos — refuerza la jerarquía a
        // simple vista en vez de depender solo de la sangría.
        <div className="ml-3.75 border-l border-slate-200 pl-2.5">
          {nodo.children.length === 0 ? (
            <p className="py-1.5 pl-2 text-xs italic text-slate-300">Sin elementos.</p>
          ) : (
            nodo.children.map((hijo) => (
              <TreeNode
                key={hijo[keyField]} nodo={hijo}
                expandidos={expandidos} cargandoIds={cargandoIds} toggle={toggle} actions={actions}
                keyField={keyField} renderLabel={renderLabel} query={query} buscarEn={buscarEn}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function TreeView({
  items = [],
  keyField = "id",
  parentField = "padre_id",
  renderLabel = (item) => item.nombre,
  actions = [],
  searchable = true,
  searchPlaceholder = "Buscar…",
  searchIn = renderLabel,
  onQueryChange,
  onExpandir,
  emptyMessage = "No hay elementos cargados.",
  loading = false,
  className = "",
}) {
  const [query, setQuery] = useState("");
  const [expandidos, setExpandidos] = useState(() => new Set());
  const [cargandoIds, setCargandoIds] = useState(() => new Set());

  const arbol = useMemo(() => construirArbol(items, keyField, parentField), [items, keyField, parentField]);
  const queryNorm = query.trim().toLowerCase();

  function onSearchChange(valor) {
    setQuery(valor);
    onQueryChange?.(valor);
  }

  async function toggle(id, nodo) {
    if (expandidos.has(id)) {
      setExpandidos((prev) => { const next = new Set(prev); next.delete(id); return next; });
      return;
    }
    if (onExpandir) {
      setCargandoIds((prev) => new Set(prev).add(id));
      try {
        await onExpandir(nodo);
      } finally {
        setCargandoIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      }
    }
    setExpandidos((prev) => new Set(prev).add(id));
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {searchable && (
        <div className="border-b border-slate-100 px-4 py-3">
          <InputField
            hideLabel hideMessage fullWidth={false} wrapperClassName="sm:w-64"
            type="text" icon={Search} value={query}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="text-xs"
          />
        </div>
      )}

      <div className="max-h-[70vh] overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-slate-100" style={{ width: `${60 - i * 10}%` }} />
            ))}
          </div>
        ) : arbol.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">{emptyMessage}</p>
        ) : (
          arbol.map((nodo) => (
            <TreeNode
              key={nodo[keyField]} nodo={nodo}
              expandidos={expandidos} cargandoIds={cargandoIds} toggle={toggle} actions={actions}
              keyField={keyField} renderLabel={renderLabel} query={queryNorm} buscarEn={searchIn}
            />
          ))
        )}
      </div>
    </div>
  );
}

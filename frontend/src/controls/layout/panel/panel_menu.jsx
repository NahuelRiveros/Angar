import PanelItemMenu from "./panel_item_menu.jsx";

/** Grupos del panel (Distribuidora, Admin, Sistema) ya filtrados por rol. Lo comparten la barra lateral y el menú del celular. */
export default function PanelMenu({ grupos, achicado = false, onNavegar }) {
  return (
    <nav aria-label="Menú del panel" className="flex-1 overflow-y-auto px-3 pb-4">
      {grupos.map((grupo) => (
        <div key={grupo.id} className="mt-4 first:mt-1">
          {grupo.titulo && (achicado
            ? <div aria-hidden="true" className="mx-3 mb-2 border-t border-white/10" />
            : <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{grupo.titulo}</p>)}
          <ul className="space-y-0.5">
            {grupo.items.map((item) => (
              <li key={item.to}><PanelItemMenu item={item} soloIcono={achicado} onNavegar={onNavegar} /></li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

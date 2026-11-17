import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import InputField from "./input_field.jsx";
export default function SearchField({ value, onSearch, label = "Buscar", placeholder = "Buscar…", delay = 350 }) {
  const [draft, setDraft] = useState({ source: value, text: value });
  if (draft.source !== value) setDraft({ source: value, text: value });
  useEffect(() => {
    if (draft.text.trim() === value) return;
    const timer = setTimeout(() => onSearch(draft.text.trim()), delay);
    return () => clearTimeout(timer);
  }, [draft.text, value, onSearch, delay]);
  return <InputField name="catalog-search" type="search" label={label} hideLabel aria-label={label} icon={Search}
    placeholder={placeholder} value={draft.text} onChange={(e) => setDraft({ source: value, text: e.target.value })} />;
}

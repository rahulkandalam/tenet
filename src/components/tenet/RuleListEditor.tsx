import { useState } from "react";
import { X } from "lucide-react";

export function RuleListEditor({
  values,
  onChange,
  placeholder,
  addLabel,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-3">
      {values.length > 0 && (
        <ul className="flex flex-col gap-2">
          {values.map((v, i) => (
            <li key={i} className="flex items-start gap-2 text-[14px] text-ink">
              <span className="text-ink-secondary mt-[2px]">•</span>
              <span className="flex-1">{v}</span>
              <button
                type="button"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="text-ink-secondary hover:text-[#B91C1C] transition-colors"
                aria-label="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-[14px] rounded-md border border-border bg-surface focus:outline-none focus:border-teal"
        />
        <button
          type="button"
          onClick={add}
          className="text-[13px] text-teal hover:underline whitespace-nowrap"
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}

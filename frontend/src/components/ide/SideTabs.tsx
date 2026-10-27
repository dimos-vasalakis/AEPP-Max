"use client";

/** What the column beside the editor shows: the agent, or a run's variables. */
export type SideTab = "agent" | "variables";

const LABELS: Record<SideTab, string> = { agent: "Agent", variables: "Μεταβλητές" };

/** The column's tabs, in the header of whichever panel shows. */
export function SideTabs({ tab, onTab }: { tab: SideTab; onTab: (tab: SideTab) => void }) {
  return (
    <div role="tablist" aria-label="Πλαϊνή στήλη" className="flex h-full items-stretch gap-3">
      {(Object.keys(LABELS) as SideTab[]).map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={t === tab}
          onClick={() => onTab(t)}
          className={`side-tab -mb-px border-b-2 px-0.5 text-sm font-semibold ${
            t === tab ? "border-accent text-text" : "border-transparent text-muted hover:text-text"
          }`}
        >
          {LABELS[t]}
        </button>
      ))}
    </div>
  );
}

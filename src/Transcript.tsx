import { AnimatePresence, motion } from "motion/react";
import { FileText, X } from "react-feather";

export interface TranscriptEntry {
  id: string;
  text: string;
  at: number;
}

export function TranscriptSidebar({
  open,
  onClose,
  entries,
  partial,
}: {
  open: boolean;
  onClose: () => void;
  entries: TranscriptEntry[];
  partial: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 38 }}
          className="fixed top-0 right-0 z-40 flex h-full w-[380px] flex-col border-l border-fg/10 bg-card shadow-[0_0_60px_rgba(0,0,0,0.5)]"
        >
          <header className="flex items-center justify-between border-b border-fg/10 px-6 py-5">
            <div className="flex items-center gap-2.5">
              <FileText size={20} strokeWidth={1.8} className="text-fg" />
              <div className="text-[18px] leading-6 font-semibold text-fg">
                Transcript
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid size-9 cursor-pointer place-items-center rounded-full text-mute transition-colors hover:bg-fg/10 hover:text-fg"
              aria-label="close transcript"
            >
              <X size={18} strokeWidth={1.8} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {entries.length === 0 && !partial && (
              <div className="mt-12 flex flex-col items-center gap-2 px-6 text-center">
                <div className="text-[15px] font-medium text-fg/70">
                  Nothing captured yet
                </div>
                <div className="text-[13px] leading-[1.5] text-mute">
                  Start speaking — the transcript will stream here with timestamps as
                  you go.
                </div>
              </div>
            )}
            <ul className="flex flex-col gap-4">
              {entries.map((e) => (
                <li key={e.id} className="flex flex-col gap-1">
                  <time className="text-[10px] leading-3 font-medium tracking-[0.2em] text-mute uppercase">
                    {formatTime(e.at)}
                  </time>
                  <p className="text-[15px] leading-[1.5] text-fg">{e.text}</p>
                </li>
              ))}
              {partial && (
                <li className="flex flex-col gap-1">
                  <time className="text-[10px] leading-3 font-medium tracking-[0.2em] text-mute uppercase">
                    now
                  </time>
                  <p className="text-[15px] leading-[1.5] text-fg/55 italic">
                    {partial}
                  </p>
                </li>
              )}
            </ul>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

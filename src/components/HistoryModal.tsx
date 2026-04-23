import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, History, Sprout, Bug, FlaskConical } from 'lucide-react';
import { useHistoryStore, type HistoryEntry, type HistoryModule } from '../stores/historyStore';

const FILTERS: Array<{ label: string; value: 'all' | HistoryModule }> = [
  { label: 'All', value: 'all' },
  { label: 'Disease', value: 'disease' },
  { label: 'Soil', value: 'soil' },
  { label: 'Fertilizer', value: 'fertilizer' },
];

const moduleMeta: Record<HistoryModule, { label: string; icon: React.ReactNode; className: string }> = {
  disease: {
    label: 'Disease',
    icon: <Bug size={16} />,
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  soil: {
    label: 'Soil',
    icon: <Sprout size={16} />,
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  fertilizer: {
    label: 'Fertilizer',
    icon: <FlaskConical size={16} />,
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  crop: {
    label: 'Crop',
    icon: <Sprout size={16} />,
    className: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
  },
};

function renderValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const meta = moduleMeta[entry.module];
  const input = entry.input && typeof entry.input === 'object' ? entry.input : {};
  const output = entry.output && typeof entry.output === 'object' ? entry.output : {};

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${meta.className}`}>
            {meta.icon}
            {meta.label}
          </div>
        </div>
        <div className="text-xs text-stone-500 text-right">
          {new Date(entry.timestamp).toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-dark-input rounded-xl p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Inputs</div>
          <div className="space-y-2 text-sm text-stone-300">
            {Object.entries(input).length === 0 ? (
              <p>No inputs captured.</p>
            ) : (
              Object.entries(input).map(([key, value]) => (
                <p key={key}>
                  <span className="text-stone-500">{key}:</span> {renderValue(value)}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="bg-dark-input rounded-xl p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Output</div>
          <div className="space-y-2 text-sm text-stone-300">
            {Object.entries(output).length === 0 ? (
              <p>No output captured.</p>
            ) : (
              Object.entries(output).map(([key, value]) => (
                <p key={key}>
                  <span className="text-stone-500">{key}:</span> {renderValue(value)}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HistoryModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const history = useHistoryStore((state) => state.history);
  const clearHistory = useHistoryStore((state) => state.clearHistory);
  const [filter, setFilter] = useState<'all' | HistoryModule>('all');

  const filteredHistory = useMemo(() => {
    if (filter === 'all') {
      return history;
    }

    return history.filter((entry) => entry.module === filter);
  }, [filter, history]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm p-4 md:p-8"
        >
          <div className="h-full flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              className="w-full max-w-5xl h-[85vh] bg-dark-bg border border-dark-border rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-dark-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center">
                    <History size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Your History</h2>
                    <p className="text-sm text-stone-500">Saved predictions for the currently signed-in account</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={clearHistory}
                    disabled={history.length === 0}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-40"
                  >
                    Clear History
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-10 h-10 rounded-2xl border border-dark-border flex items-center justify-center text-stone-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 border-b border-dark-border flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide border transition-colors ${
                      filter === item.value
                        ? 'bg-brand-green text-white border-brand-green'
                        : 'bg-dark-card text-stone-400 border-dark-border hover:border-stone-500'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                {filteredHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <History size={48} className="text-stone-700 mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">No history available yet</h3>
                    <p className="text-sm text-stone-500">Run predictions in any module and they will appear here.</p>
                  </div>
                ) : (
                  filteredHistory.map((entry) => <HistoryCard key={entry.id} entry={entry} />)
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

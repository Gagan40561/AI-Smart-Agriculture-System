import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type HistoryModule = 'disease' | 'soil' | 'fertilizer' | 'crop';

export interface HistoryEntry {
  id: number;
  userId: string;
  module: HistoryModule;
  input: any;
  output: any;
  timestamp: string;
}

interface HistoryStore {
  currentUserId: string | null;
  historyByUser: Record<string, HistoryEntry[]>;
  history: HistoryEntry[];
  setCurrentUser: (userId: string | null) => void;
  addEntry: (entry: Omit<HistoryEntry, 'userId'>) => void;
  clearHistory: () => void;
}

const APP_STORAGE_KEY = 'agri_app_data';
const HISTORY_STORAGE_KEY = 'agri-history';

const normalizeLegacyPredictionEntry = (item: any): HistoryEntry | null => {
  if (!item?.result || !item?.timestamp) {
    return null;
  }

  return {
    id: item.id || Date.parse(item.timestamp),
    userId: 'legacy',
    module: item.type === 'disease' ? 'disease' : 'soil',
    input: item.input || null,
    output: {
      result: item.result,
      confidence: item.confidence,
      recommendations: item.recommendations || [],
      type: item.type,
    },
    timestamp: item.timestamp,
  };
};

const normalizeLegacyFertilizerEntry = (item: any): HistoryEntry | null => {
  if (!item?.fertilizerName || !item?.timestamp) {
    return null;
  }

  return {
    id: item.id || Date.parse(item.timestamp),
    userId: 'legacy',
    module: 'fertilizer',
    input: {
      cropType: item.cropType || '',
      soilType: item.soilType || '',
      location: item.location || '',
      n: item.n ?? '',
      p: item.p ?? '',
      k: item.k ?? '',
    },
    output: {
      fertilizerName: item.fertilizerName,
      quantity: item.quantity,
      instructions: item.instructions,
      reason: item.reason,
    },
    timestamp: item.timestamp,
  };
};

const readLegacyHistory = (): Record<string, HistoryEntry[]> => {
  const appData = localStorage.getItem(APP_STORAGE_KEY);
  if (!appData) {
    return {};
  }

  try {
    const parsed = JSON.parse(appData);
    const migrated = [
      ...((parsed.history || []).map(normalizeLegacyPredictionEntry).filter(Boolean) as HistoryEntry[]),
      ...((parsed.fertilizerHistory || []).map(normalizeLegacyFertilizerEntry).filter(Boolean) as HistoryEntry[]),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return migrated.length > 0 ? { legacy: migrated } : {};
  } catch (error) {
    console.error('Failed to migrate legacy history:', error);
    return {};
  }
};

const storage = createJSONStorage<HistoryStore>(() => ({
  getItem: (name) => {
    const raw = localStorage.getItem(name);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return JSON.stringify({
            state: {
              currentUserId: null,
              historyByUser: {},
              history: [],
            },
            version: 0,
          });
        }

        return raw;
      } catch (error) {
        console.error('Failed to parse persisted history:', error);
      }
    }

    const migrated = readLegacyHistory();
    if (Object.keys(migrated).length === 0) {
      return null;
    }

    return JSON.stringify({
      state: {
        currentUserId: null,
        historyByUser: migrated,
        history: [],
      },
      version: 0,
    });
  },
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
}));

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      currentUserId: null,
      historyByUser: {},
      history: [],
      setCurrentUser: (userId) =>
        set((state) => ({
          currentUserId: userId,
          history: userId ? state.historyByUser[userId] || [] : [],
        })),
      addEntry: (entry) =>
        set((state) => {
          if (!state.currentUserId) {
            return state;
          }

          const userHistory = [
            { ...entry, userId: state.currentUserId },
            ...(state.historyByUser[state.currentUserId] || []),
          ];

          return {
            historyByUser: {
              ...state.historyByUser,
              [state.currentUserId]: userHistory,
            },
            history: userHistory,
          };
        }),
      clearHistory: () =>
        set((state) => {
          if (!state.currentUserId) {
            return state;
          }

          return {
            historyByUser: {
              ...state.historyByUser,
              [state.currentUserId]: [],
            },
            history: [],
          };
        }),
    }),
    {
      name: HISTORY_STORAGE_KEY,
      storage,
    }
  )
);

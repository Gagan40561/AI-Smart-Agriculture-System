import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UIActiveTab =
  | 'home'
  | 'advisor'
  | 'fertilizer'
  | 'disease'
  | 'marketplace'
  | 'weather'
  | 'priceTrends'
  | 'learn'
  | 'profile';

interface UIStore {
  showHistory: boolean;
  activeTab: UIActiveTab;
  setShowHistory: (value: boolean) => void;
  setActiveTab: (value: UIActiveTab) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      showHistory: false,
      activeTab: 'home',
      setShowHistory: (value) => set({ showHistory: value }),
      setActiveTab: (value) => set({ activeTab: value }),
    }),
    {
      name: 'agri-ui-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        showHistory: state.showHistory,
        activeTab: state.activeTab,
      }),
    }
  )
);

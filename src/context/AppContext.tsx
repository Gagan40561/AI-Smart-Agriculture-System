import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const APP_STORAGE_KEY = 'agri_app_data';

interface AppData {
  disease: any;
  diseaseLoading: boolean;
  diseaseError: string | null;
  fertilizer: any;
  fertilizerLoading: boolean;
  fertilizerError: string | null;
  advisor: any;
  advisorLoading: boolean;
  advisorError: string | null;
  weather: any;
  weatherLoading: boolean;
  weatherError: string | null;
  market: any;
  marketLoading: boolean;
  marketError: string | null;
  priceTrends: any;
  selectedMarketCrop: any;
  history: any[];
  selectedImage: string | null;
  cropForm: {
    nitrogen: string;
    phosphorus: string;
    potassium: string;
    temperature: string;
    humidity: string;
    ph: string;
    rainfall: string;
  };
  fertilizerForm: {
    cropType: string;
    soilType: string;
    n: string;
    p: string;
    k: string;
    location: string;
  };
  fertilizerHistory: any[];
  marketplace: {
    products: any[];
    search: string;
    category: string;
    location: string;
    view: 'browse' | 'sell' | 'my-listings';
    selectedProduct: any | null;
    loading: boolean;
    error: string | null;
  };
  learn: {
    searchQuery: string;
    selectedCategory: string;
    selectedArticle: any | null;
    bookmarks: string[];
  };
  weatherCity: string;
  marketFilters: {
    state: string;
    district: string;
    commodity: string;
  };
}

interface AppContextType {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  updateModuleData: (module: keyof AppData, data: any) => void;
  clearModuleData: (module: keyof AppData) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultAppData: AppData = {
  disease: null,
  diseaseLoading: false,
  diseaseError: null,
  fertilizer: null,
  fertilizerLoading: false,
  fertilizerError: null,
  advisor: null,
  advisorLoading: false,
  advisorError: null,
  weather: null,
  weatherLoading: false,
  weatherError: null,
  market: null,
  marketLoading: false,
  marketError: null,
  priceTrends: null,
  selectedMarketCrop: null,
  history: [],
  selectedImage: null,
  cropForm: {
    nitrogen: '',
    phosphorus: '',
    potassium: '',
    temperature: '',
    humidity: '',
    ph: '',
    rainfall: ''
  },
  fertilizerForm: {
    cropType: '',
    soilType: '',
    n: '',
    p: '',
    k: '',
    location: ''
  },
  fertilizerHistory: [],
  marketplace: {
    products: [],
    search: '',
    category: 'All',
    location: '',
    view: 'browse',
    selectedProduct: null,
    loading: false,
    error: null
  },
  learn: {
    searchQuery: '',
    selectedCategory: 'All',
    selectedArticle: null,
    bookmarks: []
  },
  weatherCity: 'Bangalore',
  marketFilters: {
    state: 'All States',
    district: 'All Districts',
    commodity: ''
  }
};

const createAppDataFromStorage = (): AppData => {
  try {
    const saved = localStorage.getItem(APP_STORAGE_KEY);
    if (!saved) {
      return defaultAppData;
    }

    const parsed = JSON.parse(saved);
    return {
      ...defaultAppData,
      disease: parsed.disease ?? defaultAppData.disease,
      diseaseError: parsed.diseaseError ?? defaultAppData.diseaseError,
      fertilizer: parsed.fertilizer ?? defaultAppData.fertilizer,
      fertilizerError: parsed.fertilizerError ?? defaultAppData.fertilizerError,
      advisor: parsed.advisor ?? defaultAppData.advisor,
      advisorError: parsed.advisorError ?? defaultAppData.advisorError,
      weather: parsed.weather ?? defaultAppData.weather,
      weatherError: parsed.weatherError ?? defaultAppData.weatherError,
      market: parsed.market ?? defaultAppData.market,
      marketError: parsed.marketError ?? defaultAppData.marketError,
      priceTrends: parsed.priceTrends ?? defaultAppData.priceTrends,
      selectedMarketCrop: parsed.selectedMarketCrop ?? defaultAppData.selectedMarketCrop,
      history: parsed.history ?? defaultAppData.history,
      selectedImage: parsed.selectedImage ?? defaultAppData.selectedImage,
      cropForm: { ...defaultAppData.cropForm, ...(parsed.cropForm || {}) },
      fertilizerForm: { ...defaultAppData.fertilizerForm, ...(parsed.fertilizerForm || {}) },
      fertilizerHistory: parsed.fertilizerHistory ?? defaultAppData.fertilizerHistory,
      marketplace: { ...defaultAppData.marketplace, ...(parsed.marketplace || {}) },
      learn: { ...defaultAppData.learn, ...(parsed.learn || {}) },
      weatherCity: parsed.weatherCity || defaultAppData.weatherCity,
      marketFilters: { ...defaultAppData.marketFilters, ...(parsed.marketFilters || {}) }
    };
  } catch (e) {
    console.error('Failed to load app data from localStorage', e);
    return defaultAppData;
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [appData, setAppData] = useState<AppData>(createAppDataFromStorage);
  const lastUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (loading) {
      return;
    }

    const currentUserId = user?.id ?? null;

    if (lastUserIdRef.current === undefined) {
      lastUserIdRef.current = currentUserId;
      return;
    }

    if (lastUserIdRef.current !== currentUserId) {
      lastUserIdRef.current = currentUserId;
      setAppData(defaultAppData);
    }
  }, [loading, user?.id]);

  useEffect(() => {
    localStorage.setItem(
      APP_STORAGE_KEY,
      JSON.stringify({
        disease: appData.disease,
        diseaseError: appData.diseaseError,
        fertilizer: appData.fertilizer,
        fertilizerError: appData.fertilizerError,
        advisor: appData.advisor,
        advisorError: appData.advisorError,
        weather: appData.weather,
        weatherError: appData.weatherError,
        market: appData.market,
        marketError: appData.marketError,
        priceTrends: appData.priceTrends,
        selectedMarketCrop: appData.selectedMarketCrop,
        history: appData.history,
        selectedImage: appData.selectedImage,
        cropForm: appData.cropForm,
        fertilizerForm: appData.fertilizerForm,
        fertilizerHistory: appData.fertilizerHistory,
        marketplace: appData.marketplace,
        learn: appData.learn,
        weatherCity: appData.weatherCity,
        marketFilters: appData.marketFilters
      })
    );
  }, [appData]);

  const updateModuleData = (module: keyof AppData, data: any) => {
    setAppData(prev => ({
      ...prev,
      [module]: data
    }));
  };

  const clearModuleData = (module: keyof AppData) => {
    setAppData(prev => ({
      ...prev,
      [module]: null
    }));
  };

  return (
    <AppContext.Provider value={{ appData, setAppData, updateModuleData, clearModuleData }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

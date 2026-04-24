import React, { useState, useEffect } from 'react';
import { Logo } from './components/Logo';
import { ChatWidget } from './components/ChatWidget';
import { 
  Sprout, 
  Bug, 
  History, 
  LayoutDashboard, 
  ChevronRight, 
  Upload, 
  Thermometer, 
  Droplets, 
  CloudRain, 
  FlaskConical,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Camera,
  X,
  Home,
  TrendingUp,
  BookOpen,
  Settings,
  Bell,
  Search,
  Languages,
  User,
  Wind,
  Sun,
  MapPin,
  Bookmark,
  BookmarkCheck,
  Filter,
  ArrowLeft,
  RefreshCw,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Map,
  LogOut,
  Loader2,
  ShoppingBag,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { agricultureService, CropInput, PredictionResult } from './services/aiService';
import { initKnowledgeBase } from './services/ragService';
import { marketService, MarketPrice, MarketFilters } from './services/marketService';
import { articles, Article } from './data/articles';
import { useGreeting, useWeather, getFarmingInsights } from './hooks/useAgricultureDashboard';
import { useLocation } from './hooks/useLocation';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useAppContext } from './context/AppContext';
import { Login } from './components/auth/Login';
import { ProfileSetup } from './components/auth/ProfileSetup';
import { ProfileSettings } from './components/auth/ProfileSettings';
import { LocationBanner } from './components/LocationBanner';
import { LanguageSelector } from './components/LanguageSelector';
import { FertilizerRecommendation } from './components/fertilizer/FertilizerRecommendation';
import { HistoryModal } from './components/HistoryModal';
import { Marketplace } from './components/marketplace/Marketplace';
import { useHistoryStore } from './stores/historyStore';
import { useUIStore, type UIActiveTab } from './stores/uiStore';
import { useTranslation } from 'react-i18next';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function TabPanel({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  if (!active) {
    return null;
  }

  return <div>{children}</div>;
}

type Tab = UIActiveTab;

const HERO_CONTENT = [
  {
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200",
    titleKey: "home.slogan1",
    subtitleKey: "home.subtitle1"
  },
  {
    image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=1200",
    titleKey: "home.slogan2",
    subtitleKey: "home.subtitle2"
  },
  {
    image: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=1200",
    titleKey: "home.slogan3",
    subtitleKey: "home.subtitle3"
  },
  {
    image: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=1200",
    titleKey: "home.slogan4",
    subtitleKey: "home.subtitle4"
  },
  {
    image: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=1200",
    titleKey: "home.slogan5",
    subtitleKey: "home.subtitle5"
  }
];

export function AppContent() {
  const { t } = useTranslation();
  const [showLocationBanner, setShowLocationBanner] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { appData, updateModuleData } = useAppContext();
  const history = useHistoryStore((state) => state.history);
  const addEntry = useHistoryStore((state) => state.addEntry);
  const activeTab = useUIStore((state) => state.activeTab);
  const setActiveTab = useUIStore((state) => state.setActiveTab);
  const showHistory = useUIStore((state) => state.showHistory);
  const setShowHistory = useUIStore((state) => state.setShowHistory);

  const [lastMarketUpdate, setLastMarketUpdate] = useState<Date>(new Date());

  const greetingKey = useGreeting();
  const { location, loading: locationLoading, error: locationError, denied: locationDenied, refresh: refreshLocation, setManualLocation } = useLocation();
  const { weather, loading: weatherDataLoading, error: weatherError, refresh: refreshWeather } = useWeather(user?.location || location?.city || appData.weatherCity, location?.lat, location?.lon);
  const farmingInsights = weather ? getFarmingInsights(weather, t) : [];

  useEffect(() => {
    if (locationDenied || locationError) {
      setShowLocationBanner(true);
    } else {
      setShowLocationBanner(false);
    }
  }, [locationDenied, locationError]);

  useEffect(() => {
    if (location) {
      // Update market filters based on location
      const newFilters = {
        ...appData.marketFilters,
        state: location.state || appData.marketFilters.state,
        district: location.district || appData.marketFilters.district
      };
      updateModuleData('marketFilters', newFilters);
      fetchMarketData(newFilters);
      
      // Update weather based on location
      fetchWeather(location.city || appData.weatherCity, location.lat, location.lon);
    }
  }, [location]);

  useEffect(() => {
    initKnowledgeBase();
  }, []);

  useEffect(() => {
    console.log('market:', appData.market);
    console.log('priceTrends:', appData.priceTrends);
    console.log('selectedMarketCrop:', appData.selectedMarketCrop);
    console.log('result:', appData.fertilizer);
    console.log('activeTab:', activeTab);
  }, [activeTab, appData.fertilizer, appData.market, appData.priceTrends, appData.selectedMarketCrop]);

  useEffect(() => {
    if (user) {
      fetchWeather(user.location || 'Bangalore', location?.lat, location?.lon);
      fetchMarketData();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Auto-refresh market data every 5 minutes
    const interval = setInterval(() => {
      fetchMarketData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const fetchMarketData = async (filters = appData.marketFilters) => {
    updateModuleData('marketLoading', true);
    updateModuleData('marketError', null);
    try {
      const data = await marketService.getPrices(filters);
      if (!data || data.length === 0) {
        updateModuleData('market', []);
        updateModuleData('selectedMarketCrop', null);
        updateModuleData('priceTrends', null);
        updateModuleData('marketError', 'No market data available');
        return;
      }

      updateModuleData('market', data);
      setLastMarketUpdate(new Date());
      
      const insight = await agricultureService.generateMarketInsights(data);
      updateModuleData('priceTrends', insight);

      if (!appData.selectedMarketCrop || !data.some((item) => item.id === appData.selectedMarketCrop.id)) {
        updateModuleData('selectedMarketCrop', data[0]);
      }
    } catch (err: any) {
      console.error("Failed to fetch market data");
      updateModuleData('marketError', err.message || "Failed to connect to market service.");
    } finally {
      updateModuleData('marketLoading', false);
    }
  };

  const handleMarketFilterChange = (newFilters: Partial<MarketFilters>) => {
    const updated = { ...appData.marketFilters, ...newFilters };
    updateModuleData('marketFilters', updated);
    fetchMarketData(updated);
  };

  const fetchWeather = async (city: string, lat?: number, lon?: number) => {
    updateModuleData('weatherLoading', true);
    updateModuleData('weatherError', null);
    updateModuleData('weatherCity', city);
    try {
      let url = `/api/weather/${city}`;
      if (lat && lon) {
        url += `?lat=${lat}&lon=${lon}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.status === 'ok') {
        updateModuleData('weather', data);
        if (data.fallback) {
          console.warn('[WEATHER] Using fallback weather data');
        }
      } else {
        updateModuleData('weatherError', data.error || "Weather service unavailable");
      }
    } catch (err) {
      console.error("Failed to fetch weather:", err);
      updateModuleData('weatherError', "Failed to connect to weather service.");
    } finally {
      updateModuleData('weatherLoading', false);
    }
  };

  const [heroIndex, setHeroIndex] = useState(() => new Date().getHours() % HERO_CONTENT.length);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentHour = new Date().getHours();
      setHeroIndex(currentHour % HERO_CONTENT.length);
    }, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const [cropSubmitted, setCropSubmitted] = useState(false);
  const [diseaseSubmitted, setDiseaseSubmitted] = useState(false);
  const emptyCropForm = {
    nitrogen: '',
    phosphorus: '',
    potassium: '',
    temperature: '',
    humidity: '',
    ph: '',
    rainfall: ''
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
  };

  const resetAdvisorResult = () => {
    updateModuleData('cropForm', emptyCropForm);
    updateModuleData('advisor', null);
    updateModuleData('advisorError', null);
    setCropSubmitted(false);
  };

  const resetDiseaseResult = () => {
    updateModuleData('disease', null);
    updateModuleData('diseaseError', null);
    updateModuleData('selectedImage', null);
    setDiseaseSubmitted(false);
  };

  const isCropFormEmpty = Object.values(appData.cropForm).every((value) => value === '');

  const handleCropRecommendation = async (e?: React.FormEvent | React.MouseEvent) => {
    console.log("Crop Analysis triggered");
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Manual validation check
    const values = Object.values(appData.cropForm);
    if (values.some(v => v === '')) {
      updateModuleData('advisorError', "Please fill in all soil parameters before analyzing.");
      return;
    }

    const input: CropInput = {
      nitrogen: Number(appData.cropForm.nitrogen),
      phosphorus: Number(appData.cropForm.phosphorus),
      potassium: Number(appData.cropForm.potassium),
      temperature: Number(appData.cropForm.temperature),
      humidity: Number(appData.cropForm.humidity),
      ph: Number(appData.cropForm.ph),
      rainfall: Number(appData.cropForm.rainfall),
      location: location?.city || user?.location
    };

    updateModuleData('advisorLoading', true);
    updateModuleData('advisorError', null);
    try {
      const res = await agricultureService.recommendCrop(input);
      updateModuleData('advisor', res);
      addEntry({
        id: Date.now(),
        module: 'soil',
        input,
        output: res,
        timestamp: new Date().toISOString(),
      });
      setCropSubmitted(true);
      switchTab('advisor');
    } catch (err: any) {
      updateModuleData('advisorError', err.message);
    } finally {
      updateModuleData('advisorLoading', false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateModuleData('selectedImage', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDiseaseDetection = async (e?: React.FormEvent | React.MouseEvent) => {
    console.log("Disease Detection triggered");
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!appData.selectedImage) return;
    updateModuleData('diseaseLoading', true);
    updateModuleData('diseaseError', null);
    try {
      const res = await agricultureService.detectDisease(appData.selectedImage);
      updateModuleData('disease', res);
      addEntry({
        id: Date.now(),
        module: 'disease',
        input: { image: 'Uploaded Image' },
        output: res,
        timestamp: new Date().toISOString(),
      });
      setDiseaseSubmitted(true);
      switchTab('disease');
    } catch (err: any) {
      updateModuleData('diseaseError', err.message);
    } finally {
      updateModuleData('diseaseLoading', false);
    }
  };

  const renderHome = () => (
    <div className="space-y-6 pb-24">
      {/* Hero Section */}
      <div className="relative h-64 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-900/20">
        <AnimatePresence mode="wait">
          <motion.div
            key={heroIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <img 
              src={HERO_CONTENT[heroIndex].image} 
              alt="Hero" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          </motion.div>
        </AnimatePresence>
        
        <div className="absolute inset-0 p-8 flex flex-col justify-end">
          <motion.div
            key={`text-${heroIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-2">
              {t(greetingKey)}, {user?.name || (user?.id?.startsWith('demo-user') ? t('auth.demoMode') : t('common.profile'))}
            </h2>
            <p className="text-stone-300 text-sm md:text-base max-w-md">
              {t(HERO_CONTENT[heroIndex].titleKey)}
            </p>
            <div className="mt-4 flex items-center space-x-2">
              <div className="w-8 h-1 rounded-full bg-brand-green" />
              <div className="text-[10px] text-stone-400 font-medium">
                {t(HERO_CONTENT[heroIndex].subtitleKey)}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* AI Smart Farming Command Center - Alerts */}
      <AnimatePresence>
        {farmingInsights.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-stone-300 flex items-center">
                <LayoutDashboard size={14} className="mr-2 text-emerald-500" />
                {t('home.commandCenter')}
              </h3>
              <span className="text-[10px] text-stone-500 bg-stone-800/50 px-2 py-0.5 rounded-full">
                {t('home.liveAnalysis')}
              </span>
            </div>
            {farmingInsights.map((insight, index) => {
              const Icon = insight.type === 'rain' ? CloudRain : insight.type === 'heat' ? Sun : Sprout;
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "p-4 rounded-2xl border flex items-start space-x-3",
                    insight.color
                  )}
                >
                  <div className="p-2 rounded-xl bg-white/5">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold mb-0.5">{insight.title}</h4>
                    <p className="text-xs opacity-80 leading-relaxed">{insight.message}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Location Status Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            location ? "bg-brand-green animate-pulse" : locationDenied ? "bg-amber-500" : "bg-stone-600"
          )} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            {locationLoading ? "Fetching Location..." : location ? `Location: ${location.city || location.state}` : locationDenied ? "Location Denied" : "Location Unknown"}
          </span>
        </div>
        <button 
          onClick={() => refreshLocation()}
          disabled={locationLoading}
          className="p-1.5 hover:bg-stone-800 rounded-lg transition-colors text-stone-500 hover:text-brand-green disabled:opacity-50"
          title="Refresh Location"
        >
          <RefreshCw size={14} className={cn(locationLoading && "animate-spin")} />
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-dark-card p-4 rounded-2xl border border-dark-border relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Thermometer size={16} className="text-orange-500" />
              <span className="text-xs text-stone-400 font-medium">{t('home.temperature')}</span>
            </div>
            {weather && !weatherDataLoading && (
              <span className="text-[10px] text-stone-500 flex items-center">
                <MapPin size={8} className="mr-1" /> {weather.location}
              </span>
            )}
          </div>
          
          {weatherDataLoading ? (
            <div className="space-y-2">
              <div className="h-7 w-16 bg-stone-800 animate-pulse rounded" />
              <div className="h-3 w-24 bg-stone-800 animate-pulse rounded" />
            </div>
          ) : (
            <>
              <div className="text-xl font-bold">{weather?.temp ?? 28}°C</div>
              <div className="text-[10px] text-stone-500 uppercase tracking-wider mt-1">
                {weather?.condition ?? 'Clear Sky'}
              </div>
            </>
          )}
        </div>

        <div className="bg-dark-card p-4 rounded-2xl border border-dark-border">
          <div className="flex items-center space-x-2 mb-2">
            <Droplets size={16} className="text-blue-500" />
            <span className="text-xs text-stone-400 font-medium">{t('home.humidity')}</span>
          </div>
          
          {weatherDataLoading ? (
            <div className="space-y-2">
              <div className="h-7 w-16 bg-stone-800 animate-pulse rounded" />
              <div className="h-3 w-20 bg-stone-800 animate-pulse rounded" />
            </div>
          ) : (
            <>
              <div className="text-xl font-bold">{weather?.humidity ?? 65}%</div>
              <div className="text-[10px] text-stone-500 uppercase tracking-wider mt-1">
                Optimal range
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={() => switchTab('advisor')}
          className="bg-brand-green p-6 rounded-3xl flex items-center justify-between group"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mr-4">
              <Sprout className="text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-bold text-lg">{t('home.cropAdvisor')}</h3>
              <p className="text-white/70 text-sm">{t('home.cropAdvisorDesc')}</p>
            </div>
          </div>
          <ChevronRight className="text-white group-hover:translate-x-1 transition-transform" />
        </button>

        <button 
          onClick={() => switchTab('fertilizer')}
          className="bg-dark-card p-6 rounded-3xl border border-dark-border flex items-center justify-between group"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-brand-green/10 rounded-2xl flex items-center justify-center mr-4">
              <FlaskConical className="text-brand-green" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-bold text-lg">{t('home.fertilizerRecommendation')}</h3>
              <p className="text-stone-400 text-sm">{t('home.fertilizerRecommendationDesc')}</p>
            </div>
          </div>
          <ChevronRight className="text-stone-500 group-hover:translate-x-1 transition-transform" />
        </button>

        <button 
          onClick={() => switchTab('disease')}
          className="bg-dark-card p-6 rounded-3xl border border-dark-border flex items-center justify-between group"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mr-4">
              <Bug className="text-amber-500" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-bold text-lg">{t('home.diseaseDetection')}</h3>
              <p className="text-stone-400 text-sm">{t('home.diseaseDetectionDesc')}</p>
            </div>
          </div>
          <ChevronRight className="text-stone-500 group-hover:translate-x-1 transition-transform" />
        </button>

        <button 
          onClick={() => switchTab('marketplace')}
          className="bg-dark-card p-6 rounded-3xl border border-dark-border flex items-center justify-between group"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mr-4">
              <Store className="text-blue-500" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-bold text-lg">{t('home.marketing')}</h3>
              <p className="text-stone-400 text-sm">{t('home.marketingDesc')}</p>
            </div>
          </div>
          <ChevronRight className="text-stone-500 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Recent History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{t('home.recentActivities')}</h3>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="text-brand-green text-sm font-medium"
          >
            {t('home.seeAll')}
          </button>
        </div>
        <div className="space-y-3">
          {history.slice(0, 3).map((item) => {
            const output = item.output || {};
            const confidence = typeof output.confidence === 'number' ? output.confidence : null;
            const resultLabel =
              typeof output.result === 'string'
                ? output.result
                : typeof output.fertilizerName === 'string'
                  ? output.fertilizerName
                  : 'Saved Analysis';

            return (
            <div key={item.id} className="bg-dark-card p-4 rounded-2xl border border-dark-border flex items-center justify-between">
              <div className="flex items-center">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mr-3",
                  item.module === 'soil'
                    ? "bg-emerald-500/10 text-emerald-500"
                    : item.module === 'fertilizer'
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-amber-500/10 text-amber-500"
                )}>
                  {item.module === 'soil' ? <Sprout size={18} /> : item.module === 'fertilizer' ? <FlaskConical size={18} /> : <Bug size={18} />}
                </div>
                <div>
                  <div className="font-bold text-sm">{resultLabel}</div>
                  <div className="text-[10px] text-stone-500">{new Date(item.timestamp).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-stone-500 uppercase font-bold">{item.module}</div>
                <div className="text-xs font-bold text-brand-green">
                  {confidence !== null ? `${(confidence * 100).toFixed(0)}%` : 'Saved'}
                </div>
              </div>
            </div>
          )})}
          {history.length === 0 && (
            <div className="text-center py-8 text-stone-500 text-sm italic">{t('home.noActivities')}</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAdvisor = () => (
    <div className="space-y-6 pb-24">
      <div className="bg-dark-card rounded-3xl border border-dark-border overflow-hidden">
        <div className="p-6 border-b border-dark-border">
          <h2 className="text-xl font-bold flex items-center">
            <FlaskConical className="mr-2 text-brand-green" />
            {t('advisor.soilAnalysis')}
          </h2>
          <p className="text-stone-500 text-sm mt-1">{t('advisor.soilAnalysisDesc')}</p>
        </div>
        <form
          onSubmit={handleCropRecommendation}
          noValidate
          className="p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-400 uppercase">{t('advisor.nitrogen')}</label>
              <input 
                type="number" 
                placeholder="0-200"
                min="0"
                max="200"
                value={appData.cropForm.nitrogen}
                onChange={e => updateModuleData('cropForm', {...appData.cropForm, nitrogen: e.target.value})}
                className="w-full p-3 rounded-xl text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-400 uppercase">{t('advisor.phosphorus')}</label>
              <input 
                type="number" 
                placeholder="0-200"
                min="0"
                max="200"
                value={appData.cropForm.phosphorus}
                onChange={e => updateModuleData('cropForm', {...appData.cropForm, phosphorus: e.target.value})}
                className="w-full p-3 rounded-xl text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-400 uppercase">{t('advisor.potassium')}</label>
              <input 
                type="number" 
                placeholder="0-200"
                min="0"
                max="200"
                value={appData.cropForm.potassium}
                onChange={e => updateModuleData('cropForm', {...appData.cropForm, potassium: e.target.value})}
                className="w-full p-3 rounded-xl text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-400 uppercase">{t('advisor.phLevel')}</label>
              <input 
                type="number" 
                step="0.1"
                placeholder="0-14"
                min="0"
                max="14"
                value={appData.cropForm.ph}
                onChange={e => updateModuleData('cropForm', {...appData.cropForm, ph: e.target.value})}
                className="w-full p-3 rounded-xl text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-400 uppercase">{t('advisor.temperature')}</label>
              <input 
                type="number" 
                step="0.1"
                placeholder="-10 to 60"
                min="-10"
                max="60"
                value={appData.cropForm.temperature}
                onChange={e => updateModuleData('cropForm', {...appData.cropForm, temperature: e.target.value})}
                className="w-full p-3 rounded-xl text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-400 uppercase">{t('advisor.humidity')}</label>
              <input 
                type="number" 
                step="0.1"
                placeholder="0-100"
                min="0"
                max="100"
                value={appData.cropForm.humidity}
                onChange={e => updateModuleData('cropForm', {...appData.cropForm, humidity: e.target.value})}
                className="w-full p-3 rounded-xl text-sm"
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-400 uppercase">{t('advisor.rainfall')}</label>
            <input 
              type="number" 
              step="0.1"
              placeholder="0-1000"
              min="0"
              max="1000"
              value={appData.cropForm.rainfall}
              onChange={e => updateModuleData('cropForm', {...appData.cropForm, rainfall: e.target.value})}
              className="w-full p-3 rounded-xl text-sm"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={appData.advisorLoading}
            className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center disabled:opacity-50"
          >
            {appData.advisorLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : t('advisor.analyze')}
          </button>
          <button
            type="button"
            onClick={resetAdvisorResult}
            disabled={appData.advisorLoading || (isCropFormEmpty && !appData.advisor && !appData.advisorError)}
            className="w-full bg-stone-700 hover:bg-stone-600 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50 disabled:hover:bg-stone-700"
          >
            Enter New Values
          </button>
        </form>
      </div>
      {renderResult(appData.advisor, appData.advisorError, {
        onReset: resetAdvisorResult,
        resetLabel: 'Enter New Values'
      })}
    </div>
  );

  const renderDisease = () => (
    <div className="space-y-6 pb-24">
      <div className="bg-dark-card rounded-3xl border border-dark-border overflow-hidden">
        <div className="p-6 border-b border-dark-border">
          <h2 className="text-xl font-bold flex items-center">
            <Camera className="mr-2 text-amber-500" />
            {t('disease.diseaseDetection')}
          </h2>
          <p className="text-stone-500 text-sm mt-1">{t('disease.scanUpload')}</p>
        </div>
        <form
          onSubmit={handleDiseaseDetection}
          noValidate
          className="p-6"
        >
          {!appData.selectedImage ? (
            <div className="border-2 border-dashed border-dark-border rounded-2xl p-12 flex flex-col items-center justify-center bg-dark-bg/50 hover:bg-dark-bg transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="text-stone-600 mb-2" size={32} />
              <p className="text-stone-400 text-sm font-medium">{t('disease.tapToUpload')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden aspect-square bg-dark-bg">
                <img src={appData.selectedImage} alt="Selected" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                <button 
                  type="button"
                  onClick={resetDiseaseResult}
                  className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm p-1.5 rounded-full"
                >
                  <X size={16} />
                </button>
              </div>
              <button 
                type="submit"
                disabled={appData.diseaseLoading}
                className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center disabled:opacity-50"
              >
                {appData.diseaseLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : t('disease.startDiagnosis')}
              </button>
              {(appData.disease || appData.diseaseError) && (
                <button
                  type="button"
                  onClick={resetDiseaseResult}
                  className="w-full border border-dark-border text-stone-300 font-bold py-3 rounded-2xl transition-all hover:border-stone-500"
                >
                  New Upload
                </button>
              )}
            </div>
          )}
        </form>
      </div>
      {renderResult(appData.disease, appData.diseaseError, {
        onReset: resetDiseaseResult,
        resetLabel: 'Clear Diagnosis'
      })}
    </div>
  );

  const renderWeather = () => (
    <div className="space-y-6 pb-24">
      {/* City Selection & Location */}
      <div className="space-y-3">
        <div className="bg-dark-card p-4 rounded-2xl border border-dark-border flex items-center space-x-4">
          <MapPin className="text-brand-green" size={20} />
          <select 
            value={appData.weatherCity}
            onChange={(e) => {
              const city = e.target.value;
              fetchWeather(city, undefined, undefined);
            }}
            className="bg-transparent border-none text-white font-bold focus:ring-0 cursor-pointer flex-1 outline-none"
          >
            <option value="Bangalore" className="bg-dark-card">Bangalore</option>
            <option value="Mumbai" className="bg-dark-card">Mumbai</option>
            <option value="Delhi" className="bg-dark-card">Delhi</option>
            <option value="Hyderabad" className="bg-dark-card">Hyderabad</option>
            <option value="Chennai" className="bg-dark-card">Chennai</option>
            <option value="Kolkata" className="bg-dark-card">Kolkata</option>
            <option value="Pune" className="bg-dark-card">Pune</option>
          </select>
          {appData.weatherLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-green"></div>}
        </div>

        <button 
          onClick={() => refreshLocation()}
          disabled={locationLoading}
          className="w-full bg-stone-800/50 hover:bg-stone-800 p-3 rounded-xl border border-dark-border flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
        >
          <MapPin size={14} className={cn(locationLoading ? "animate-pulse" : "text-brand-green")} />
          <span className="text-xs font-bold text-stone-300">
            {locationLoading ? "Detecting Location..." : location ? `Using: ${location.city || location.state}` : "Use My Current Location"}
          </span>
        </button>
      </div>

      {appData.weatherLoading ? (
        <div className="py-20 text-center">
          <div className="animate-pulse flex flex-col items-center">
            <RefreshCw size={48} className="text-stone-700 mb-4 animate-spin" />
            <p className="text-stone-500">Fetching weather data...</p>
          </div>
        </div>
      ) : appData.weatherError ? (
        <div className="bg-dark-card p-12 rounded-3xl border border-dark-border flex flex-col items-center justify-center text-center">
          <AlertCircle size={48} className="text-red-500/20 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Weather Error</h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto mb-6">{appData.weatherError}</p>
          <button 
            onClick={() => fetchWeather(appData.weatherCity)}
            className="px-6 py-2 bg-brand-green text-white rounded-xl font-bold text-sm"
          >
            Retry
          </button>
        </div>
      ) : appData.weather ? (
        <>
          <div className="bg-dark-card p-6 rounded-3xl border border-dark-border relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-green/10 rounded-full blur-3xl"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <h2 className="text-2xl font-bold">{appData.weather.city}</h2>
                <p className="text-stone-500 text-sm capitalize">{appData.weather.description}</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{appData.weather.temp}°C</div>
                <p className="text-brand-green text-sm font-medium">{appData.weather.condition}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 relative z-10">
              <div className="bg-dark-bg/50 p-3 rounded-2xl border border-dark-border text-center">
                <Wind size={20} className="mx-auto text-stone-400 mb-1" />
                <div className="text-[10px] text-stone-500 uppercase font-bold">Wind</div>
                <div className="text-sm font-bold">{appData.weather.windSpeed} km/h</div>
              </div>
              <div className="bg-dark-bg/50 p-3 rounded-2xl border border-dark-border text-center">
                <Droplets size={20} className="mx-auto text-stone-400 mb-1" />
                <div className="text-[10px] text-stone-500 uppercase font-bold">Humidity</div>
                <div className="text-sm font-bold">{appData.weather.humidity}%</div>
              </div>
              <div className="bg-dark-bg/50 p-3 rounded-2xl border border-dark-border text-center">
                <Sun size={20} className="mx-auto text-stone-400 mb-1" />
                <div className="text-[10px] text-stone-500 uppercase font-bold">UV Index</div>
                <div className="text-sm font-bold">{appData.weather.uvIndex}</div>
              </div>
            </div>
          </div>

          {/* AI Advisory Layer */}
          <div className="bg-brand-green/10 border border-brand-green/20 p-6 rounded-3xl">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center mr-3">
                <Sprout size={16} className="text-white" />
              </div>
              <h3 className="font-bold text-brand-green">AI Agricultural Insight</h3>
            </div>
            <div className="space-y-2">
              {appData.weather.insights.map((insight: string, i: number) => (
                <div key={i} className="flex items-start">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-green mr-2 shrink-0"></div>
                  <p className="text-stone-400 text-sm leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-4">5-Day Forecast</h3>
            <div className="space-y-3">
              {appData.weather.forecast.map((day: any) => (
                <div key={day.date} className="bg-dark-card p-4 rounded-2xl border border-dark-border flex items-center justify-between">
                  <span className="font-medium text-stone-400 w-24">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center space-x-2">
                    <img 
                      src={`https://openweathermap.org/img/wn/${day.icon}.png`} 
                      alt={day.condition}
                      className="w-8 h-8"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-sm">{day.condition}</span>
                  </div>
                  <div className="text-sm font-bold">
                    <span>{day.temp}°C</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="py-20 text-center">
          <div className="animate-pulse flex flex-col items-center">
            <CloudRain size={48} className="text-stone-700 mb-4" />
            <p className="text-stone-500">Loading weather data...</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderPriceTrends = () => {
    const states = marketService.getStates();
    const districts = marketService.getDistricts(appData.marketFilters.state);

    return (
      <div className="space-y-6 pb-24">
        {/* Market Controls */}
        <div className="bg-dark-card p-6 rounded-3xl border border-dark-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center">
              <TrendingUp size={24} className="mr-2 text-brand-green" />
              {t('market.priceTrends')}
            </h2>
            <div className="flex items-center text-[10px] text-stone-500 font-bold uppercase">
              <RefreshCw size={12} className={cn("mr-1", appData.marketLoading && "animate-spin")} />
              Last updated: {lastMarketUpdate.toLocaleTimeString()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
              <select 
                value={appData.marketFilters.state}
                onChange={(e) => handleMarketFilterChange({ state: e.target.value, district: 'All Districts' })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm appearance-none"
              >
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="relative">
              <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
              <select 
                value={appData.marketFilters.district}
                onChange={(e) => handleMarketFilterChange({ district: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm appearance-none"
              >
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
              <input 
                type="text" 
                placeholder="Search crops..." 
                value={appData.marketFilters.commodity}
                onChange={(e) => handleMarketFilterChange({ commodity: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        {appData.marketLoading && (!appData.market || appData.market.length === 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-dark-card p-6 rounded-3xl border border-dark-border h-64 animate-pulse"></div>
            <div className="bg-dark-card p-6 rounded-3xl border border-dark-border h-64 animate-pulse"></div>
          </div>
        ) : appData.marketError ? (
          <div className="bg-dark-card p-12 rounded-3xl border border-dark-border flex flex-col items-center justify-center text-center">
            <AlertCircle size={48} className="text-red-500/20 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Market Data Error</h3>
            <p className="text-stone-500 text-sm max-w-md mx-auto mb-6">{appData.marketError}</p>
            <button 
              onClick={() => fetchMarketData()}
              className="px-6 py-2 bg-brand-green text-white rounded-xl font-bold text-sm"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Crop List */}
              <div className="lg:col-span-1 bg-dark-card rounded-3xl border border-dark-border overflow-hidden flex flex-col h-[500px]">
                <div className="p-4 border-b border-dark-border bg-dark-bg/30">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Live Prices</h3>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  {appData.market && appData.market.length > 0 ? (
                    appData.market.map((crop: any) => (
                      <button 
                        key={crop.id} 
                        onClick={() => updateModuleData('selectedMarketCrop', crop)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 border-b border-dark-border last:border-0 hover:bg-white/5 transition-colors text-left",
                          appData.selectedMarketCrop?.id === crop.id && "bg-brand-green/10 border-l-4 border-l-brand-green"
                        )}
                      >
                        <div>
                          <div className="font-bold text-sm">{crop.commodity}</div>
                          <div className="text-[10px] text-stone-500 uppercase font-bold">{crop.market}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">₹{crop.modal_price.toLocaleString()}</div>
                          <div className={cn(
                            "text-[10px] font-bold flex items-center justify-end", 
                            crop.trend > 0 ? "text-emerald-500" : "text-red-500"
                          )}>
                            {crop.trend > 0 ? <TrendingUpIcon size={10} className="mr-0.5" /> : <TrendingDownIcon size={10} className="mr-0.5" />}
                            {Math.abs(crop.trend)}%
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center text-stone-500 text-sm italic">
                      No market data found for this selection.
                    </div>
                  )}
                </div>
              </div>

              {/* Visualization & Insights */}
              <div className="lg:col-span-2 space-y-6">
                {appData.selectedMarketCrop && appData.selectedMarketCrop.history && appData.selectedMarketCrop.history.length > 0 && (
                  <div className="bg-dark-card p-6 rounded-3xl border border-dark-border">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold">{appData.selectedMarketCrop.commodity} Price Trend</h3>
                        <p className="text-stone-500 text-xs">7-Day Historical Data (₹ per quintal)</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-brand-green">₹{appData.selectedMarketCrop.modal_price.toLocaleString()}</div>
                        <div className="text-[10px] text-stone-500 font-bold uppercase">Current Modal Price</div>
                      </div>
                    </div>
                    
                    <div className="h-64 w-full min-h-[256px]" style={{ height: 256 }}>
                      <ResponsiveContainer width="100%" height={256} minWidth={1} minHeight={1}>
                        <LineChart data={appData.selectedMarketCrop.history}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2d323d" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            stroke="#57534e" 
                            fontSize={10} 
                            tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                          />
                          <YAxis stroke="#57534e" fontSize={10} domain={['auto', 'auto']} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1a1d23', border: '1px solid #2d323d', borderRadius: '12px' }}
                            itemStyle={{ color: '#22c55e' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#22c55e" 
                            strokeWidth={3} 
                            dot={{ fill: '#22c55e', strokeWidth: 2 }} 
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Price Comparison */}
                {appData.market && appData.market.length > 0 && (
                  <div className="bg-dark-card p-6 rounded-3xl border border-dark-border">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-4">Price Comparison (₹/Quintal)</h3>
                    <div className="h-48 w-full min-h-[192px]" style={{ height: 192 }}>
                      <ResponsiveContainer width="100%" height={192} minWidth={1} minHeight={1}>
                        <BarChart data={appData.market.slice(0, 5)}>
                          <XAxis dataKey="commodity" stroke="#57534e" fontSize={10} />
                          <YAxis stroke="#57534e" fontSize={10} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1a1d23', border: '1px solid #2d323d', borderRadius: '12px' }}
                          />
                          <Bar dataKey="modal_price" radius={[4, 4, 0, 0]}>
                            {appData.market.slice(0, 5).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#22c55e' : '#16a34a'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* AI Insights */}
                <div className="bg-brand-green/10 border border-brand-green/20 p-6 rounded-3xl">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center mr-3">
                      <TrendingUpIcon size={16} className="text-white" />
                    </div>
                    <h3 className="font-bold text-brand-green">AI Market Insight</h3>
                  </div>
                  <p className="text-stone-400 text-sm leading-relaxed italic">
                    {appData.priceTrends || "Analyzing market trends..."}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const toggleBookmark = (id: string) => {
    const newBookmarks = appData.learn.bookmarks.includes(id) 
      ? appData.learn.bookmarks.filter(b => b !== id) 
      : [...appData.learn.bookmarks, id];
    updateModuleData('learn', { ...appData.learn, bookmarks: newBookmarks });
  };

  const renderLearn = () => {
    if (appData.learn.selectedArticle) {
      return (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6 pb-24"
        >
          <button 
            onClick={() => updateModuleData('learn', { ...appData.learn, selectedArticle: null })}
            className="flex items-center text-stone-400 hover:text-white transition-colors mb-4 group"
          >
            <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Learning Center
          </button>

          <div className="bg-dark-card rounded-3xl border border-dark-border overflow-hidden">
            <div className="h-64 relative">
              <img 
                src={appData.learn.selectedArticle.image} 
                alt={appData.learn.selectedArticle.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-card via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <span className="text-[10px] bg-brand-green text-white px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-2 inline-block">
                  {appData.learn.selectedArticle.category}
                </span>
                <h2 className="text-3xl font-bold text-white">{appData.learn.selectedArticle.title}</h2>
              </div>
            </div>
            
            <div className="p-8">
              <div className="flex items-center space-x-4 mb-8 text-stone-500 text-sm">
                <span className="flex items-center">
                  <History size={14} className="mr-1" />
                  {appData.learn.selectedArticle.time}
                </span>
                <button 
                  onClick={() => toggleBookmark(appData.learn.selectedArticle.id)}
                  className="flex items-center hover:text-brand-green transition-colors"
                >
                  {appData.learn.bookmarks.includes(appData.learn.selectedArticle.id) ? (
                    <><BookmarkCheck size={14} className="mr-1 text-brand-green" /> Saved</>
                  ) : (
                    <><Bookmark size={14} className="mr-1" /> Save for later</>
                  )}
                </button>
              </div>

              <div className="prose prose-invert max-w-none">
                <div className="markdown-body text-stone-300 leading-relaxed space-y-4">
                  <Markdown>{appData.learn.selectedArticle.content}</Markdown>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-dark-border">
                <h4 className="font-bold mb-4">Related Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {articles
                    .filter(a => a.category === appData.learn.selectedArticle.category && a.id !== appData.learn.selectedArticle.id)
                    .slice(0, 3)
                    .map(related => (
                      <button 
                        key={related.id}
                        onClick={() => updateModuleData('learn', { ...appData.learn, selectedArticle: related })}
                        className="px-4 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs hover:border-brand-green transition-colors"
                      >
                        {related.title}
                      </button>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    const filteredArticles = articles.filter(article => {
      const matchesSearch = article.title.toLowerCase().includes(appData.learn.searchQuery.toLowerCase()) ||
                          article.description.toLowerCase().includes(appData.learn.searchQuery.toLowerCase());
      const matchesCategory = appData.learn.selectedCategory === 'All' || article.category === appData.learn.selectedCategory;
      return matchesSearch && matchesCategory;
    });

    const categories = ['All', ...Array.from(new Set(articles.map(a => a.category)))];

    return (
      <div className="space-y-6 pb-24">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Learning Center</h2>
          <div className="flex items-center space-x-2 text-stone-500 text-sm">
            <BookOpen size={16} />
            <span>{articles.length} Articles</span>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
            <input 
              type="text" 
              placeholder="Search articles, techniques..." 
              value={appData.learn.searchQuery}
              onChange={(e) => updateModuleData('learn', { ...appData.learn, searchQuery: e.target.value })}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-dark-card border border-dark-border text-sm focus:border-brand-green outline-none transition-colors"
            />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-2 no-scrollbar">
            <Filter size={14} className="text-stone-500 shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => updateModuleData('learn', { ...appData.learn, selectedCategory: cat })}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                  appData.learn.selectedCategory === cat 
                    ? "bg-brand-green border-brand-green text-white" 
                    : "bg-dark-card border-dark-border text-stone-400 hover:border-stone-600"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 gap-6">
          {filteredArticles.map((article) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={article.id} 
              onClick={() => updateModuleData('learn', { ...appData.learn, selectedArticle: article })}
              className="bg-dark-card rounded-3xl border border-dark-border overflow-hidden group hover:shadow-2xl hover:shadow-brand-green/5 transition-all duration-300 cursor-pointer"
            >
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={article.image} 
                  alt={article.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(article.id);
                  }}
                  className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-brand-green transition-colors"
                >
                  {appData.learn.bookmarks.includes(article.id) ? (
                    <BookmarkCheck size={18} className="fill-current" />
                  ) : (
                    <Bookmark size={18} />
                  )}
                </button>
                <div className="absolute bottom-4 left-4">
                  <span className="text-[10px] bg-brand-green text-white px-3 py-1 rounded-full font-bold uppercase tracking-wider shadow-lg">
                    {article.category}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-[10px] text-stone-500 font-bold uppercase flex items-center">
                    <History size={12} className="mr-1" />
                    {article.time}
                  </span>
                </div>
                <h3 className="font-bold text-xl mb-2 group-hover:text-brand-green transition-colors">{article.title}</h3>
                <p className="text-stone-400 text-sm mb-6 line-clamp-2 leading-relaxed">
                  {article.description}
                </p>
                <div className="flex items-center justify-between">
                  <button className="flex items-center text-brand-green text-sm font-bold group/link">
                    Read Article 
                    <ArrowRight size={16} className="ml-1 group-hover/link:translate-x-1 transition-transform" />
                  </button>
                  {appData.learn.bookmarks.includes(article.id) && (
                    <span className="text-[10px] text-brand-green font-bold uppercase">Saved</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4 border border-dark-border">
              <Search size={24} className="text-stone-600" />
            </div>
            <p className="text-stone-500 font-medium">No articles found matching your search.</p>
            <button 
              onClick={() => {
                updateModuleData('learn', { ...appData.learn, searchQuery: '', selectedCategory: 'All' });
              }}
              className="mt-4 text-brand-green text-sm font-bold"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderResult = (
    result: any,
    error: string | null = null,
    options?: { onReset?: () => void; resetLabel?: string }
  ) => (
    <AnimatePresence>
      {(result || error) && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          {error ? (
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-start">
              <AlertCircle className="text-red-500 mr-4 shrink-0" />
              <div>
                <h3 className="text-red-500 font-bold">Error</h3>
                <p className="text-red-400 text-sm mt-1">{error}</p>
              </div>
            </div>
          ) : result && (
            <div className={cn(
              "p-6 rounded-3xl border",
              result.confidence < 0.8 ? "bg-amber-500/10 border-amber-500/20" : "bg-brand-green/10 border-brand-green/20"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  {result.confidence < 0.8 ? (
                    <AlertCircle className="text-amber-500 mr-2" />
                  ) : (
                    <CheckCircle2 className="text-brand-green mr-2" />
                  )}
                  <h3 className={cn(
                    "text-xl font-bold",
                    result.confidence < 0.8 ? "text-amber-500" : "text-brand-green"
                  )}>
                    {result.result}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-stone-500">Confidence</div>
                  <div className="text-lg font-bold">{(result.confidence * 100).toFixed(1)}%</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-stone-300">Recommendations:</h4>
                <div className="grid grid-cols-1 gap-2">
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className="bg-dark-bg/50 p-3 rounded-xl border border-dark-border text-stone-400 text-xs leading-relaxed">
                      {rec}
                    </div>
                  ))}
                </div>
              </div>

              {options?.onReset && (
                <button
                  type="button"
                  onClick={options.onReset}
                  className="mt-5 w-full rounded-2xl border border-dark-border px-4 py-3 text-sm font-bold text-stone-300 transition-colors hover:border-stone-500"
                >
                  {options.resetLabel || 'Clear Result'}
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!user.name || !user.location) {
    return <ProfileSetup />;
  }

  return (
    <div className="min-h-screen bg-dark-bg text-stone-200 font-sans selection:bg-brand-green/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-dark-bg/80 backdrop-blur-md border-b border-dark-border z-40 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3 group cursor-pointer">
          <Logo size={40} />
          <div className="flex flex-col">
            <h1 className="font-bold text-xl tracking-tight leading-none text-white group-hover:text-brand-green transition-colors">Smart Agriculture</h1>
            <div className="flex items-center mt-1">
              <span className="text-[10px] font-medium text-stone-500 uppercase tracking-[0.15em]">AI Powered Farming Intelligence</span>
              {user?.id?.startsWith('demo-user') && (
                <span className="ml-2 text-[8px] font-bold bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded-md uppercase tracking-wider border border-amber-500/30">
                  Demo Mode
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <LanguageSelector />
          <button 
            onClick={() => switchTab('profile')}
            className={cn(
              "w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center border border-dark-border overflow-hidden transition-all",
              activeTab === 'profile' ? "border-emerald-500 ring-2 ring-emerald-500/20" : "hover:border-stone-600"
            )}
          >
            {user?.name ? (
              <span className="text-xs font-bold text-emerald-500">{user.name.charAt(0)}</span>
            ) : (
              <User size={18} className="text-stone-400" />
            )}
          </button>
        </div>
      </header>
      <LocationBanner 
        show={showLocationBanner} 
        onClose={() => setShowLocationBanner(false)} 
        error={locationError}
        denied={locationDenied}
      />

      {/* Main Content */}
      <main className={cn(
        "pt-24 px-6 mx-auto",
        activeTab === 'marketplace' || activeTab === 'fertilizer' ? "max-w-6xl" : "max-w-lg"
      )}>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <TabPanel active={activeTab === 'home'}>{renderHome()}</TabPanel>
          <TabPanel active={activeTab === 'advisor'}>{renderAdvisor()}</TabPanel>
          <TabPanel active={activeTab === 'fertilizer'}>
            <FertilizerRecommendation />
          </TabPanel>
          <TabPanel active={activeTab === 'disease'}>{renderDisease()}</TabPanel>
          <TabPanel active={activeTab === 'marketplace'}>
            <Marketplace 
              initialLocation={location ? `${location.city}, ${location.state}` : user?.location} 
            />
          </TabPanel>
          <TabPanel active={activeTab === 'weather'}>{renderWeather()}</TabPanel>
          <TabPanel active={activeTab === 'priceTrends'}>{renderPriceTrends()}</TabPanel>
          <TabPanel active={activeTab === 'learn'}>{renderLearn()}</TabPanel>
          <TabPanel active={activeTab === 'profile'}><ProfileSettings /></TabPanel>
        </motion.div>
      </main>

      <HistoryModal open={showHistory} onClose={() => setShowHistory(false)} />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-dark-card/90 backdrop-blur-lg border-t border-dark-border z-50 px-2 py-2">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {[
            { id: 'home', icon: Home, label: t('common.home') },
            { id: 'advisor', icon: Sprout, label: t('common.advisor') },
            { id: 'fertilizer', icon: FlaskConical, label: t('common.fertilizer') },
            { id: 'disease', icon: Bug, label: t('common.disease') },
            { id: 'marketplace', icon: Store, label: t('common.marketplace') },
            { id: 'weather', icon: CloudRain, label: t('common.weather') },
            { id: 'priceTrends', icon: TrendingUp, label: t('common.priceTrends') },
            { id: 'learn', icon: BookOpen, label: t('common.learn') },
            { id: 'history', icon: History, label: 'History' },
            { id: 'profile', icon: User, label: t('common.profile') },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'history') {
                  setShowHistory(true);
                  return;
                }

                switchTab(item.id as Tab);
              }}
              className={cn(
                "flex flex-col items-center p-2 rounded-xl transition-all min-w-[56px]",
                (item.id === 'history' ? showHistory : activeTab === item.id)
                  ? "text-brand-green" 
                  : "text-stone-500 hover:text-stone-300"
              )}
            >
              <item.icon size={20} className={cn(
                "mb-1 transition-transform",
                ((item.id === 'history' ? showHistory : activeTab === item.id)) && "scale-110"
              )} />
              <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <ChatWidget />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

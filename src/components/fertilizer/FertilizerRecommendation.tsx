import React, { useEffect, useRef } from 'react';
import { FlaskConical, CheckCircle2, AlertCircle, Loader2, ArrowRight, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { authService } from '../../services/authService';
import { useAppContext } from '../../context/AppContext';
import { useHistoryStore } from '../../stores/historyStore';

interface FertilizerRecommendation {
  id: string;
  fertilizerName: string;
  quantity: string;
  instructions: string;
  reason: string;
  cropType: string;
  soilType: string;
  n: number;
  p: number;
  k: number;
  timestamp: string;
}

export const FertilizerRecommendation: React.FC = () => {
  const { appData, updateModuleData } = useAppContext();
  const addEntry = useHistoryStore((state) => state.addEntry);
  const cropTypeInputRef = useRef<HTMLInputElement>(null);
  const emptyFertilizerForm = {
    cropType: '',
    soilType: '',
    n: '',
    p: '',
    k: '',
    location: ''
  };

  const resetRecommendation = () => {
    updateModuleData('fertilizerForm', emptyFertilizerForm);
    updateModuleData('fertilizer', null);
    updateModuleData('fertilizerError', null);
    window.requestAnimationFrame(() => {
      cropTypeInputRef.current?.focus();
    });
  };

  const isFormEmpty = Object.values(appData.fertilizerForm).every((value) => value === '');

  useEffect(() => {
    console.log('[Fertilizer] Component mounted');
  }, []);

  useEffect(() => {
    console.log('[Fertilizer] Result updated:', appData.fertilizer);
  }, [appData.fertilizer]);

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (appData.fertilizerLoading) {
      return;
    }

    const fertilizerForm = { ...appData.fertilizerForm };

    updateModuleData('fertilizerLoading', true);
    updateModuleData('fertilizerError', null);

    try {
      console.log('[Fertilizer] Submit started');

      const response = await fetch('/api/fertilizer/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`
        },
        body: JSON.stringify(fertilizerForm)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Failed to get recommendation');
      }

      const data = await response.json();
      if (data.status === 'ok') {
        updateModuleData('fertilizer', data);
        addEntry({
          id: Date.now(),
          module: 'fertilizer',
          input: fertilizerForm,
          output: {
            fertilizerName: data.fertilizerName,
            quantity: data.quantity,
            instructions: data.instructions,
            reason: data.reason
          },
          timestamp: data.timestamp || new Date().toISOString()
        });
        if (data.fallback) {
          console.warn('[FERTILIZER] Using fallback recommendation');
        }
      } else {
        updateModuleData('fertilizerError', data.error || 'Failed to get recommendation');
      }
    } catch (err) {
      console.error('Fertilizer recommendation error:', err);
      updateModuleData('fertilizerError', 'Connection error. Please try again.');
    } finally {
      updateModuleData('fertilizerLoading', false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Fertilizer Recommendation</h1>
        <p className="text-gray-400">Get expert advice on the best fertilizer for your crops.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
            <div className="bg-dark-card p-6 rounded-2xl border border-dark-border shadow-sm h-fit">
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Crop Type</label>
                    <input
                      ref={cropTypeInputRef}
                      type="text"
                      placeholder="e.g. Rice, Wheat"
                      className="w-full px-4 py-2 rounded-xl bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={appData.fertilizerForm.cropType}
                      onChange={(e) => updateModuleData('fertilizerForm', { ...appData.fertilizerForm, cropType: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Soil Type</label>
                    <select
                      className="w-full px-4 py-2 rounded-xl bg-dark-input border border-dark-border text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={appData.fertilizerForm.soilType}
                      onChange={(e) => updateModuleData('fertilizerForm', { ...appData.fertilizerForm, soilType: e.target.value })}
                      required
                    >
                      <option value="">Select Soil</option>
                      <option value="Sandy">Sandy</option>
                      <option value="Clay">Clay</option>
                      <option value="Loamy">Loamy</option>
                      <option value="Black">Black</option>
                      <option value="Red">Red</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Location (Optional)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Enter your region"
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={appData.fertilizerForm.location}
                      onChange={(e) => updateModuleData('fertilizerForm', { ...appData.fertilizerForm, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-emerald-400" />
                    Soil Nutrients (Optional)
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Nitrogen (N)</label>
                      <input
                        type="number"
                        placeholder="N"
                        className="w-full px-3 py-2 rounded-lg bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={appData.fertilizerForm.n}
                        onChange={(e) => updateModuleData('fertilizerForm', { ...appData.fertilizerForm, n: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Phosphorus (P)</label>
                      <input
                        type="number"
                        placeholder="P"
                        className="w-full px-3 py-2 rounded-lg bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={appData.fertilizerForm.p}
                        onChange={(e) => updateModuleData('fertilizerForm', { ...appData.fertilizerForm, p: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Potassium (K)</label>
                      <input
                        type="number"
                        placeholder="K"
                        className="w-full px-3 py-2 rounded-lg bg-dark-input border border-dark-border text-white placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={appData.fertilizerForm.k}
                        onChange={(e) => updateModuleData('fertilizerForm', { ...appData.fertilizerForm, k: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {appData.fertilizerError && (
                  <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {appData.fertilizerError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={appData.fertilizerLoading}
                  className="w-full py-3 bg-[#22C55E] text-white rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {appData.fertilizerLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Get Recommendation
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetRecommendation}
                  disabled={appData.fertilizerLoading || (isFormEmpty && !appData.fertilizer && !appData.fertilizerError)}
                  className="w-full py-3 bg-stone-700 text-white rounded-xl font-semibold hover:bg-stone-600 transition-colors disabled:opacity-50 disabled:hover:bg-stone-700"
                >
                  New Recommendation
                </button>
              </form>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              {appData.fertilizer ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-dark-input p-6 rounded-2xl border-2 border-emerald-500 shadow-lg space-y-4"
                >
                  <div className="flex items-center gap-3 pb-4 border-b border-dark-border">
                    <div className="p-3 bg-emerald-900/30 rounded-2xl">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{appData.fertilizer.fertilizerName}</h2>
                      <p className="text-sm text-emerald-400 font-medium">Recommended Fertilizer</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-dark-bg p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Recommended Quantity</h4>
                      <p className="text-white font-semibold">{appData.fertilizer.quantity}</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-white">Why this is recommended?</h4>
                      <p className="text-gray-400 text-sm leading-relaxed">{appData.fertilizer.reason}</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-white">How to use?</h4>
                      <p className="text-gray-400 text-sm leading-relaxed">{appData.fertilizer.instructions}</p>
                    </div>

                    <button
                      type="button"
                      onClick={resetRecommendation}
                      className="w-full py-3 rounded-xl border border-dark-border text-sm font-semibold text-gray-300 transition-colors hover:border-gray-500"
                    >
                      New Recommendation
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-dark-input border-2 border-dashed border-dark-border rounded-2xl h-full flex flex-col items-center justify-center p-8 text-center">
                  <FlaskConical className="w-12 h-12 text-gray-600 mb-4" />
                  <h3 className="text-white font-semibold mb-2">Analysis Results</h3>
                  <p className="text-gray-500 text-sm max-w-[250px]">
                    Fill in your soil and crop details to see the recommended fertilizer here.
                  </p>
                </div>
              )}
            </div>
      </motion.div>
    </div>
  );
};

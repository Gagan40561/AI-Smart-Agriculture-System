import { useState, useEffect, useRef } from 'react';

export const useGreeting = () => {
  const [greetingKey, setGreetingKey] = useState('home.goodMorning');

  useEffect(() => {
    const updateGreeting = () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();

      if (hour >= 4 && hour < 12) {
        setGreetingKey('home.goodMorning');
      } else if (hour >= 12 && hour < 17) {
        setGreetingKey('home.goodAfternoon');
      } else if (hour >= 17 && (hour < 21 || (hour === 21 && minute <= 30))) {
        setGreetingKey('home.goodEvening');
      } else {
        setGreetingKey('home.goodNight');
      }
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return greetingKey;
};

interface WeatherData {
  temp: number;
  humidity: number;
  condition: string;
  location: string;
  rain?: number;
  pop?: number;
}

export const getFarmingInsights = (weather: WeatherData, t: any) => {
  const insights = [];

  // Rain Alert
  // OpenWeatherMap current weather doesn't always have 'pop', so we check rain volume or condition
  const isRaining = weather.condition.toLowerCase().includes('rain') || weather.condition.toLowerCase().includes('drizzle');
  const heavyRain = (weather.rain && weather.rain > 2) || (weather.pop && weather.pop > 60);

  if (heavyRain || isRaining) {
    insights.push({
      id: 'rain-alert',
      type: 'rain',
      title: t('home.rainAlert'),
      message: t('home.rainAlertDesc'),
      color: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      icon: 'CloudRain'
    });
  }

  // Heat Alert
  if (weather.temp > 35) {
    insights.push({
      id: 'heat-alert',
      type: 'heat',
      title: t('home.heatAlert'),
      message: t('home.heatAlertDesc'),
      color: 'bg-red-500/10 border-red-500/20 text-red-400',
      icon: 'Sun'
    });
  }

  // Crop Suggestion (Rule-based AI)
  let cropSuggestion = '';
  let cropTitle = t('home.cropSuitability');
  
  if (weather.temp > 30 && (weather.humidity < 40 || (weather.rain && weather.rain < 0.5))) {
    cropSuggestion = t('home.milletSorghum', { temp: weather.temp });
  } else if (weather.temp >= 20 && weather.temp <= 30 && (weather.humidity > 60 || (weather.rain && weather.rain > 1))) {
    cropSuggestion = t('home.riceMaize', { temp: weather.temp });
  } else if (weather.temp < 20) {
    cropSuggestion = t('home.wheatBarley', { temp: weather.temp });
  } else if (weather.condition.toLowerCase().includes('rain')) {
    cropSuggestion = t('home.moistureLoving');
  } else {
    cropSuggestion = t('home.stableGeneral', { temp: weather.temp, humidity: weather.humidity });
  }

  insights.push({
    id: 'crop-suggestion',
    type: 'suggestion',
    title: cropTitle,
    message: cropSuggestion,
    color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    icon: 'Sprout'
  });

  return insights;
};

export const useWeather = (defaultCity: string = 'Bangalore', initialLat?: number, initialLon?: number) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchWeather = async (lat?: number, lon?: number, city?: string) => {
    // Abort previous request if any
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      let url = '';
      const apiKey = '19927003d654bcd63f64e32840eeba91';
      
      const targetLat = lat ?? initialLat;
      const targetLon = lon ?? initialLon;

      if (targetLat !== undefined && targetLon !== undefined) {
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${targetLat}&lon=${targetLon}&units=metric&appid=${apiKey}`;
      } else {
        url = `https://api.openweathermap.org/data/2.5/weather?q=${city || defaultCity}&units=metric&appid=${apiKey}`;
      }

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const data = await res.json();

      if (data.cod !== 200) {
        throw new Error(data.message || 'Failed to fetch weather');
      }

      setWeather({
        temp: Math.round(data.main.temp),
        humidity: data.main.humidity,
        condition: data.weather[0].main,
        location: data.name,
        rain: data.rain?.['1h'] || 0,
        pop: data.pop ? data.pop * 100 : 0
      });
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }

      if (import.meta.env.DEV) {
        console.error("Weather fetch error:", err);
      }
      setError("Could not load weather data");
      
      if (city !== defaultCity && !lat && !initialLat) {
        fetchWeather(undefined, undefined, defaultCity);
      }
    } finally {
      if (controllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchWeather(initialLat, initialLon);

    const interval = setInterval(() => {
      fetchWeather(initialLat, initialLon);
    }, 10 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [defaultCity, initialLat, initialLon]);

  return { weather, loading, error, refresh: fetchWeather };
};


export interface MarketPrice {
  id: string;
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  arrival_date: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  unit: string;
  trend: number; // percentage change
  history: { date: string; price: number }[];
}

export interface MarketFilters {
  state?: string;
  district?: string;
  commodity?: string;
}

const MOCK_DATA: MarketPrice[] = [
  {
    id: '1',
    state: 'Karnataka',
    district: 'Bangalore',
    market: 'Binny Mill (F&V)',
    commodity: 'Tomato',
    variety: 'Local',
    arrival_date: new Date().toISOString(),
    min_price: 1100,
    max_price: 1400,
    modal_price: 1250,
    unit: 'per quintal',
    trend: 5.4,
    history: [
      { date: '2026-03-08', price: 1100 },
      { date: '2026-03-09', price: 1120 },
      { date: '2026-03-10', price: 1150 },
      { date: '2026-03-11', price: 1180 },
      { date: '2026-03-12', price: 1210 },
      { date: '2026-03-13', price: 1230 },
      { date: '2026-03-14', price: 1250 },
    ]
  },
  {
    id: '2',
    state: 'Punjab',
    district: 'Ludhiana',
    market: 'Ludhiana',
    commodity: 'Wheat',
    variety: 'Kanak',
    arrival_date: new Date().toISOString(),
    min_price: 2100,
    max_price: 2200,
    modal_price: 2125,
    unit: 'per quintal',
    trend: 1.2,
    history: [
      { date: '2026-03-08', price: 2100 },
      { date: '2026-03-09', price: 2105 },
      { date: '2026-03-10', price: 2110 },
      { date: '2026-03-11', price: 2115 },
      { date: '2026-03-12', price: 2120 },
      { date: '2026-03-13', price: 2122 },
      { date: '2026-03-14', price: 2125 },
    ]
  },
  {
    id: '3',
    state: 'Maharashtra',
    district: 'Nashik',
    market: 'Lasalgaon',
    commodity: 'Onion',
    variety: 'Red',
    arrival_date: new Date().toISOString(),
    min_price: 1700,
    max_price: 1900,
    modal_price: 1800,
    unit: 'per quintal',
    trend: 0.8,
    history: [
      { date: '2026-03-08', price: 1780 },
      { date: '2026-03-09', price: 1785 },
      { date: '2026-03-10', price: 1790 },
      { date: '2026-03-11', price: 1792 },
      { date: '2026-03-12', price: 1795 },
      { date: '2026-03-13', price: 1798 },
      { date: '2026-03-14', price: 1800 },
    ]
  },
  {
    id: '4',
    state: 'Uttar Pradesh',
    district: 'Agra',
    market: 'Agra',
    commodity: 'Potato',
    variety: 'Desi',
    arrival_date: new Date().toISOString(),
    min_price: 900,
    max_price: 1000,
    modal_price: 950,
    unit: 'per quintal',
    trend: -2.1,
    history: [
      { date: '2026-03-08', price: 980 },
      { date: '2026-03-09', price: 975 },
      { date: '2026-03-10', price: 970 },
      { date: '2026-03-11', price: 965 },
      { date: '2026-03-12', price: 960 },
      { date: '2026-03-13', price: 955 },
      { date: '2026-03-14', price: 950 },
    ]
  },
  {
    id: '5',
    state: 'Telangana',
    district: 'Warangal',
    market: 'Warangal',
    commodity: 'Cotton',
    variety: 'Other',
    arrival_date: new Date().toISOString(),
    min_price: 6800,
    max_price: 7200,
    modal_price: 7000,
    unit: 'per quintal',
    trend: -1.5,
    history: [
      { date: '2026-03-08', price: 7150 },
      { date: '2026-03-09', price: 7120 },
      { date: '2026-03-10', price: 7100 },
      { date: '2026-03-11', price: 7080 },
      { date: '2026-03-12', price: 7050 },
      { date: '2026-03-13', price: 7020 },
      { date: '2026-03-14', price: 7000 },
    ]
  }
];

export const marketService = {
  async getPrices(filters: MarketFilters = {}): Promise<MarketPrice[]> {
    const getFallbackData = () =>
      MOCK_DATA.filter(p => {
        if (filters.state && filters.state !== 'All States' && p.state !== filters.state) return false;
        if (filters.district && filters.district !== 'All Districts' && p.district !== filters.district) return false;
        if (filters.commodity && !p.commodity.toLowerCase().includes(filters.commodity.toLowerCase())) return false;
        return true;
      });

    try {
      const params = new URLSearchParams();
      if (filters.state && filters.state !== 'All States') params.append('state', filters.state);
      if (filters.district && filters.district !== 'All Districts') params.append('district', filters.district);
      if (filters.commodity) params.append('commodity', filters.commodity);

      const response = await fetch(`/api/market?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Backend market API failed');
      }
      
      const data = await response.json();
      
      if (!data.records || data.records.length === 0) {
        console.warn('[Market Service] No backend market records available');
        return [];
      }

      return data.records.map((record: any, index: number) => {
        const modalPrice = Number(record.modal_price);
        // Generate mock history since this specific API resource doesn't provide historical trends
        const history = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          // Create a pseudo-random but consistent trend based on the record's unique ID
          const seed = (record.state.length + record.district.length + record.commodity.length + i) % 10;
          const variation = (seed - 5) / 100; // +/- 5%
          history.push({
            date: date.toISOString().split('T')[0],
            price: Math.round(modalPrice * (1 + variation))
          });
        }
        // Ensure the last history point matches the current modal price
        history[6].price = modalPrice;

        return {
          id: `${record.state}-${record.district}-${record.market}-${record.commodity}-${index}`,
          state: record.state,
          district: record.district,
          market: record.market,
          commodity: record.commodity,
          variety: record.variety,
          arrival_date: record.arrival_date,
          min_price: Number(record.min_price),
          max_price: Number(record.max_price),
          modal_price: modalPrice,
          unit: 'per quintal',
          trend: Number(((Math.random() - 0.4) * 5).toFixed(1)), // Mock trend for UI
          history
        };
      });
    } catch (error) {
      console.error("Market Service Error:", error);
      return getFallbackData();
    }
  },

  getStates(): string[] {
    return [
      'All States',
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
      'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
      'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
      'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
    ];
  },

  getDistricts(state?: string): string[] {
    // In a real app, we would fetch districts for the selected state
    // For now, we return a few common districts or fallback to mock
    if (!state || state === 'All States') {
      return ['All Districts', 'Bangalore', 'Ludhiana', 'Nashik', 'Agra', 'Warangal'];
    }
    
    const districtMap: Record<string, string[]> = {
      'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Belgaum'],
      'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala'],
      'Maharashtra': ['Mumbai', 'Pune', 'Nashik', 'Nagpur', 'Lasalgaon'],
      'Uttar Pradesh': ['Agra', 'Lucknow', 'Kanpur', 'Varanasi'],
      'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad'],
    };

    return ['All Districts', ...(districtMap[state] || [])];
  }
};

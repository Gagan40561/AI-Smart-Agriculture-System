export interface Article {
  id: string;
  title: string;
  category: 'Efficiency' | 'Sustainability' | 'Basics' | 'AI Farming' | 'Irrigation' | 'Technology';
  time: string;
  image: string;
  description: string;
  content: string;
}

export const articles: Article[] = [
  {
    id: '1',
    title: 'Modern Irrigation Techniques',
    category: 'Irrigation',
    time: '5 min read',
    image: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&q=80&w=800',
    description: 'Explore how drip irrigation and smart sensors are revolutionizing water usage in modern farms.',
    content: `
# Modern Irrigation Techniques

Water is the lifeblood of agriculture, but its scarcity is a growing concern. Modern irrigation techniques focus on **efficiency** and **precision**.

## 1. Drip Irrigation
Drip irrigation delivers water directly to the root zone of plants through a network of valves, pipes, and emitters. 
- **Benefits:** Reduces evaporation and runoff, saves up to 50% more water than traditional methods.

## 2. Smart Sensors
IoT-enabled soil moisture sensors provide real-time data on soil hydration.
- **How it works:** When soil moisture drops below a certain threshold, the irrigation system automatically turns on.

## 3. Variable Rate Irrigation (VRI)
VRI allows farmers to apply different amounts of water across a single field based on soil type and topography.

By adopting these technologies, farmers can ensure sustainable water management for future generations.
`
  },
  {
    id: '2',
    title: 'Organic Pest Control Methods',
    category: 'Sustainability',
    time: '8 min read',
    image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=800',
    description: 'Learn natural ways to protect your crops without harmful chemicals using biological control and companion planting.',
    content: `
# Organic Pest Control Methods

Chemical pesticides can harm the environment and human health. Organic pest control offers a safer, more sustainable alternative.

## 1. Biological Control
Using natural predators to manage pest populations.
- **Example:** Releasing ladybugs to control aphids.

## 2. Companion Planting
Growing certain plants together to deter pests.
- **Example:** Planting marigolds with tomatoes to repel nematodes.

## 3. Neem Oil and Natural Sprays
Neem oil is a powerful organic pesticide that disrupts the life cycle of many insects without harming beneficial ones like bees.

## 4. Physical Barriers
Using row covers or netting to physically prevent insects from reaching crops.

Sustainable farming starts with working *with* nature, not against it.
`
  },
  {
    id: '3',
    title: 'Soil Health Management',
    category: 'Basics',
    time: '12 min read',
    image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=800',
    description: 'The foundation of every great harvest is the soil. Discover techniques for maintaining nutrient-rich earth.',
    content: `
# Soil Health Management

Healthy soil is a living ecosystem. Managing its health is critical for long-term agricultural productivity.

## Key Principles of Soil Health:
1. **Minimize Disturbance:** Reducing tillage helps maintain soil structure and organic matter.
2. **Keep the Soil Covered:** Use cover crops or mulch to prevent erosion and retain moisture.
3. **Maximize Biodiversity:** Rotate crops to prevent nutrient depletion and pest buildup.

## Testing Your Soil
Regular soil testing (pH, N-P-K levels) allows for precise nutrient management, ensuring you only add what is necessary.

Remember: Feed the soil, and the soil will feed the plants.
`
  },
  {
    id: '4',
    title: 'AI in Smart Farming',
    category: 'AI Farming',
    time: '10 min read',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800',
    description: 'How machine learning and computer vision are helping farmers predict yields and detect diseases early.',
    content: `
# AI in Smart Farming

Artificial Intelligence is transforming agriculture from a game of chance into a high-precision science.

## 1. Disease Detection
Computer vision models can analyze leaf images to identify diseases with over 95% accuracy, often before they are visible to the human eye.

## 2. Yield Prediction
AI algorithms analyze historical data, weather patterns, and satellite imagery to predict harvest volumes.

## 3. Autonomous Machinery
Self-driving tractors and drones can perform repetitive tasks like weeding and spraying with extreme precision, reducing labor costs and chemical use.

The future of farming is data-driven.
`
  },
  {
    id: '5',
    title: 'Climate-Smart Agriculture',
    category: 'Sustainability',
    time: '7 min read',
    image: 'https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?auto=format&fit=crop&q=80&w=800',
    description: 'Adapting farming practices to changing weather patterns while reducing greenhouse gas emissions.',
    content: `
# Climate-Smart Agriculture (CSA)

CSA is an approach that helps guide actions to transform agricultural systems towards green and climate-resilient practices.

## Three Main Pillars:
1. **Productivity:** Sustainably increasing agricultural productivity and incomes.
2. **Adaptation:** Building resilience to climate change.
3. **Mitigation:** Reducing greenhouse gas emissions where possible.

## CSA Practices:
- Using drought-resistant crop varieties.
- Implementing agroforestry (integrating trees into farm landscapes).
- Improving livestock management to reduce methane emissions.

CSA ensures food security in a changing world.
`
  },
  {
    id: '6',
    title: 'Crop Rotation Benefits',
    category: 'Basics',
    time: '6 min read',
    image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=800',
    description: 'Why alternating crops is essential for breaking pest cycles and naturally replenishing soil nitrogen.',
    content: `
# Crop Rotation Benefits

Crop rotation is the practice of growing a series of different types of crops in the same area across a sequence of growing seasons.

## Why Rotate?
- **Pest Management:** Many pests are host-specific. By changing the crop, you break their life cycle.
- **Soil Fertility:** Different crops have different nutrient needs. Legumes, for example, fix nitrogen back into the soil.
- **Erosion Control:** Varying root structures help stabilize the soil.

A simple 3-year or 4-year rotation plan can significantly improve farm health without extra costs.
`
  },
  {
    id: '7',
    title: 'Precision Agriculture & IoT',
    category: 'Technology',
    time: '15 min read',
    image: 'https://images.unsplash.com/photo-1558449028-b53a39d100fc?auto=format&fit=crop&q=80&w=800',
    description: 'Using IoT sensors and GPS mapping to apply water and fertilizer with centimeter-level precision.',
    content: `
# Precision Agriculture & IoT

Precision agriculture is about doing the right thing, in the right place, at the right time.

## The IoT Ecosystem:
- **Sensors:** Measuring soil moisture, temperature, and nutrient levels.
- **Drones:** Providing high-resolution aerial maps to identify stressed areas.
- **GPS:** Guiding tractors to avoid overlap and minimize soil compaction.

## Benefits:
- **Cost Savings:** Reduced use of seeds, fertilizer, and water.
- **Environmental Impact:** Less chemical runoff into local water sources.

Technology is the key to feeding a growing global population.
`
  },
  {
    id: '8',
    title: 'Sustainable Fertilizer Usage',
    category: 'Efficiency',
    time: '9 min read',
    image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=800',
    description: 'Optimizing nutrient application to maximize growth while preventing runoff and environmental damage.',
    content: `
# Sustainable Fertilizer Usage

Fertilizers are essential for high yields, but their misuse can lead to soil degradation and water pollution.

## The 4R Framework:
1. **Right Source:** Matching fertilizer type to crop needs.
2. **Right Rate:** Applying the correct amount based on soil tests.
3. **Right Time:** Applying when the crop can actually absorb the nutrients.
4. **Right Place:** Placing fertilizer where the roots can reach it.

## Organic Alternatives:
Compost, manure, and green manures can supplement or replace synthetic fertilizers while improving soil structure.
`
  },
  {
    id: '9',
    title: 'Post-Harvest Storage',
    category: 'Efficiency',
    time: '11 min read',
    image: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=800',
    description: 'Advanced storage techniques to reduce waste and maintain crop quality long after the harvest.',
    content: `
# Post-Harvest Storage Techniques

Up to 30% of harvests in developing regions are lost due to poor storage. Improving this stage is a huge opportunity for food security.

## 1. Hermetic Storage
Airtight bags or containers that suffocate insects and prevent mold growth by depleting oxygen.

## 2. Cold Chain Management
Maintaining a consistent low temperature for perishable goods like fruits and vegetables.

## 3. Proper Drying
Ensuring grains are dried to the correct moisture level before storage to prevent fungal growth (like Aflatoxin).

Reducing waste is just as important as increasing production.
`
  },
  {
    id: '10',
    title: 'Disease Prevention Strategies',
    category: 'AI Farming',
    time: '14 min read',
    image: 'https://images.unsplash.com/photo-1599403210210-9f9393309a9a?auto=format&fit=crop&q=80&w=800',
    description: 'Proactive measures and early warning systems to keep your fields healthy and productive.',
    content: `
# Disease Prevention Strategies

An ounce of prevention is worth a pound of cure in the field.

## 1. Resistant Varieties
Planting seeds that are naturally resistant to common local diseases.

## 2. Field Sanitation
Removing infected plant debris and cleaning tools to prevent the spread of pathogens.

## 3. Monitoring
Regular scouting and using AI-powered apps to identify early signs of stress.

## 4. Water Management
Avoiding overhead irrigation which can keep leaves wet and encourage fungal growth.

Healthy plants start with healthy practices.
`
  }
];

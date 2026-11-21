// Store department (aisle) definitions for the StockSure Nursery.
// `category` must match products.category exactly, as written by scripts/seed-nursery.ts from data/nursery_plants_seed.csv.

export const DEPARTMENTS = [
  { code: 'A', category: 'Indoor foliage', label: 'Indoor foliage', hi: 'इनडोर पौधे' },
  { code: 'B', category: 'Flowering plants', label: 'Flowering plants', hi: 'फूलों के पौधे' },
  { code: 'C', category: 'Herbs & medicinal', label: 'Herbs & medicinal', hi: 'जड़ी-बूटी और औषधीय' },
  { code: 'D', category: 'Fruit plants', label: 'Fruit plants', hi: 'फलों के पौधे' },
  { code: 'E', category: 'Vegetable seedlings', label: 'Vegetable seedlings', hi: 'सब्ज़ी की पौध' },
  { code: 'F', category: 'Succulents & cacti', label: 'Succulents & cacti', hi: 'रसीले पौधे और कैक्टस' },
  { code: 'G', category: 'Palms & ferns', label: 'Palms & ferns', hi: 'पाम और फ़र्न' },
  { code: 'H', category: 'Sacred plants', label: 'Sacred plants', hi: 'पवित्र पौधे' },
  { code: 'I', category: 'Aquatic & orchids', label: 'Aquatic & orchids', hi: 'जलीय पौधे और ऑर्किड' },
] as const;

export const NURSERY_CATEGORIES: string[] = DEPARTMENTS.map((d) => d.category);

import fs from 'node:fs';
import path from 'node:path';
import { getPool } from '../db.ts';

export interface PlantRef {
  id: number;
  commonName: string;
  scientificName: string;
  category: string;
  variantGroup: string;
  slug: string;
  genus: string;
  species: string;
  alternateGenera: string[];
  doNotConfuseWith: string[];
}

export interface PlantImageResult {
  commonName: string;
  scientificName: string;
  slug: string;
  status: 'ok' | 'needs_review' | 'missing';
  imagePath: string | null;
  imageUrl: string | null;
  imageSourceUrl: string | null;
  imageAuthor: string | null;
  imageLicense: string | null;
  imageCredit: string | null;
  notes?: string;
  isManual?: boolean;
}

// Allowed licenses: ONLY CC0, Public Domain, CC BY, CC BY-SA (reject NC, ND, unknown)
export function isAllowedLicense(rawLicense: string | undefined | null): { allowed: boolean; normalized: string } {
  if (!rawLicense || typeof rawLicense !== 'string') {
    return { allowed: false, normalized: 'Unknown' };
  }
  const clean = rawLicense.trim();
  const lower = clean.toLowerCase();

  // Reject NonCommercial (NC) or NoDerivatives (ND)
  if (lower.includes('-nc') || lower.includes('nc') || lower.includes('noncommercial') || lower.includes('non-commercial') ||
      lower.includes('-nd') || lower.includes('nd') || lower.includes('noderivatives') || lower.includes('no-derivatives')) {
    return { allowed: false, normalized: clean };
  }

  // CC0 / Public Domain
  if (lower.includes('cc0') || lower.includes('cc-zero') || lower.includes('zero') ||
      lower.includes('public domain') || lower.startsWith('pd') || lower.includes('pd-') || lower === 'pd') {
    return { allowed: true, normalized: clean.startsWith('CC0') ? 'CC0' : 'Public Domain' };
  }

  // CC BY-SA
  if (lower.includes('by-sa') || lower.includes('by sa')) {
    return { allowed: true, normalized: clean };
  }

  // CC BY
  if (lower.includes('cc by') || lower.includes('cc-by') || lower.startsWith('by-') || lower === 'by') {
    return { allowed: true, normalized: clean };
  }

  // Own photo (manual override)
  if (lower === 'own' || lower === 'own photo') {
    return { allowed: true, normalized: 'own' };
  }

  return { allowed: false, normalized: clean };
}

// Comprehensive reference extracted directly from data/StockSure_Plant_Reference_Sheet.pdf & nursery_plants_seed.csv
export const PLANT_REFERENCE_RULES: PlantRef[] = [
  {
    id: 1,
    commonName: 'Money plant',
    scientificName: 'Epipremnum aureum',
    category: 'Indoor foliage',
    variantGroup: 'pot',
    slug: 'money-plant',
    genus: 'Epipremnum',
    species: 'aureum',
    alternateGenera: [],
    doNotConfuseWith: ['philodendron'],
  },
  {
    id: 2,
    commonName: 'Snake plant',
    scientificName: 'Sansevieria trifasciata',
    category: 'Indoor foliage',
    variantGroup: 'pot',
    slug: 'snake-plant',
    genus: 'Sansevieria',
    species: 'trifasciata',
    alternateGenera: ['Dracaena'], // Sansevieria trifasciata is now classified as Dracaena trifasciata
    doNotConfuseWith: ['cylindrica'],
  },
  {
    id: 3,
    commonName: 'ZZ plant',
    scientificName: 'Zamioculcas zamiifolia',
    category: 'Indoor foliage',
    variantGroup: 'pot',
    slug: 'zz-plant',
    genus: 'Zamioculcas',
    species: 'zamiifolia',
    alternateGenera: [],
    doNotConfuseWith: ['cycas'],
  },
  {
    id: 4,
    commonName: 'Peace lily',
    scientificName: 'Spathiphyllum wallisii',
    category: 'Indoor foliage',
    variantGroup: 'pot',
    slug: 'peace-lily',
    genus: 'Spathiphyllum',
    species: 'wallisii',
    alternateGenera: [],
    doNotConfuseWith: ['anthurium'],
  },
  {
    id: 5,
    commonName: 'Spider plant',
    scientificName: 'Chlorophytum comosum',
    category: 'Indoor foliage',
    variantGroup: 'pot',
    slug: 'spider-plant',
    genus: 'Chlorophytum',
    species: 'comosum',
    alternateGenera: [],
    doNotConfuseWith: ['ophiopogon'],
  },
  {
    id: 6,
    commonName: 'Rubber plant',
    scientificName: 'Ficus elastica',
    category: 'Indoor foliage',
    variantGroup: 'pot',
    slug: 'rubber-plant',
    genus: 'Ficus',
    species: 'elastica',
    alternateGenera: [],
    doNotConfuseWith: ['ficus lyrata', 'fiddle-leaf', 'fiddle leaf'],
  },
  {
    id: 7,
    commonName: 'Monstera',
    scientificName: 'Monstera deliciosa',
    category: 'Indoor foliage',
    variantGroup: 'pot',
    slug: 'monstera',
    genus: 'Monstera',
    species: 'deliciosa',
    alternateGenera: [],
    doNotConfuseWith: ['philodendron xanadu', 'monstera adansonii', 'adansonii'],
  },
  {
    id: 8,
    commonName: 'Chinese evergreen',
    scientificName: 'Aglaonema commutatum',
    category: 'Indoor foliage',
    variantGroup: 'pot',
    slug: 'chinese-evergreen',
    genus: 'Aglaonema',
    species: 'commutatum',
    alternateGenera: [],
    doNotConfuseWith: ['dieffenbachia'],
  },
  {
    id: 9,
    commonName: 'Areca palm',
    scientificName: 'Dypsis lutescens',
    category: 'Palms & ferns',
    variantGroup: 'pot',
    slug: 'areca-palm',
    genus: 'Dypsis',
    species: 'lutescens',
    alternateGenera: ['Chrysalidocarpus'],
    doNotConfuseWith: ['kentia', 'howea'],
  },
  {
    id: 10,
    commonName: 'Boston fern',
    scientificName: 'Nephrolepis exaltata',
    category: 'Palms & ferns',
    variantGroup: 'pot',
    slug: 'boston-fern',
    genus: 'Nephrolepis',
    species: 'exaltata',
    alternateGenera: [],
    doNotConfuseWith: ['asparagus fern'],
  },
  {
    id: 11,
    commonName: 'Aloe vera',
    scientificName: 'Aloe vera',
    category: 'Succulents & cacti',
    variantGroup: 'pot',
    slug: 'aloe-vera',
    genus: 'Aloe',
    species: 'vera',
    alternateGenera: [],
    doNotConfuseWith: ['agave'],
  },
  {
    id: 12,
    commonName: 'Jade plant',
    scientificName: 'Crassula ovata',
    category: 'Succulents & cacti',
    variantGroup: 'pot',
    slug: 'jade-plant',
    genus: 'Crassula',
    species: 'ovata',
    alternateGenera: [],
    doNotConfuseWith: ['portulacaria afra', 'portulacaria'],
  },
  {
    id: 13,
    commonName: 'Echeveria',
    scientificName: 'Echeveria elegans',
    category: 'Succulents & cacti',
    variantGroup: 'pot',
    slug: 'echeveria',
    genus: 'Echeveria',
    species: 'elegans',
    alternateGenera: [],
    doNotConfuseWith: ['sempervivum', 'graptopetalum'],
  },
  {
    id: 14,
    commonName: 'Desert rose',
    scientificName: 'Adenium obesum',
    category: 'Succulents & cacti',
    variantGroup: 'pot',
    slug: 'desert-rose',
    genus: 'Adenium',
    species: 'obesum',
    alternateGenera: [],
    doNotConfuseWith: ['plumeria', 'euphorbia'],
  },
  {
    id: 15,
    commonName: 'Rose',
    scientificName: 'Rosa x hybrida',
    category: 'Flowering plants',
    variantGroup: 'pot',
    slug: 'rose',
    genus: 'Rosa',
    species: 'hybrida',
    alternateGenera: [],
    doNotConfuseWith: ['hibiscus'],
  },
  {
    id: 16,
    commonName: 'Hibiscus',
    scientificName: 'Hibiscus rosa-sinensis',
    category: 'Flowering plants',
    variantGroup: 'pot',
    slug: 'hibiscus',
    genus: 'Hibiscus',
    species: 'rosa-sinensis',
    alternateGenera: [],
    doNotConfuseWith: ['rose', 'hibiscus syriacus'],
  },
  {
    id: 17,
    commonName: 'Arabian jasmine',
    scientificName: 'Jasminum sambac',
    category: 'Flowering plants',
    variantGroup: 'pot',
    slug: 'arabian-jasmine',
    genus: 'Jasminum',
    species: 'sambac',
    alternateGenera: [],
    doNotConfuseWith: ['jasminum officinale', 'grandiflorum'],
  },
  {
    id: 18,
    commonName: 'Marigold',
    scientificName: 'Tagetes erecta',
    category: 'Flowering plants',
    variantGroup: 'pot',
    slug: 'marigold',
    genus: 'Tagetes',
    species: 'erecta',
    alternateGenera: [],
    doNotConfuseWith: ['tagetes patula', 'french marigold'],
  },
  {
    id: 19,
    commonName: 'Bougainvillea',
    scientificName: 'Bougainvillea glabra',
    category: 'Flowering plants',
    variantGroup: 'pot',
    slug: 'bougainvillea',
    genus: 'Bougainvillea',
    species: 'glabra',
    alternateGenera: [],
    doNotConfuseWith: [],
  },
  {
    id: 20,
    commonName: 'Ixora',
    scientificName: 'Ixora coccinea',
    category: 'Flowering plants',
    variantGroup: 'pot',
    slug: 'ixora',
    genus: 'Ixora',
    species: 'coccinea',
    alternateGenera: [],
    doNotConfuseWith: ['lantana'],
  },
  {
    id: 21,
    commonName: 'Frangipani',
    scientificName: 'Plumeria rubra',
    category: 'Flowering plants',
    variantGroup: 'pot',
    slug: 'frangipani',
    genus: 'Plumeria',
    species: 'rubra',
    alternateGenera: [],
    doNotConfuseWith: ['adenium', 'desert rose'],
  },
  {
    id: 22,
    commonName: 'Periwinkle',
    scientificName: 'Catharanthus roseus',
    category: 'Flowering plants',
    variantGroup: 'pot',
    slug: 'periwinkle',
    genus: 'Catharanthus',
    species: 'roseus',
    alternateGenera: [],
    doNotConfuseWith: ['vinca minor'],
  },
  {
    id: 23,
    commonName: 'Crossandra',
    scientificName: 'Crossandra infundibuliformis',
    category: 'Flowering plants',
    variantGroup: 'pot',
    slug: 'crossandra',
    genus: 'Crossandra',
    species: 'infundibuliformis',
    alternateGenera: [],
    doNotConfuseWith: ['ixora', 'lantana'],
  },
  {
    id: 24,
    commonName: 'Tuberose',
    scientificName: 'Polianthes tuberosa',
    category: 'Flowering plants',
    variantGroup: 'pot',
    slug: 'tuberose',
    genus: 'Polianthes',
    species: 'tuberosa',
    alternateGenera: ['Agave'], // Polianthes tuberosa is also Agave amica in modern taxonomy
    doNotConfuseWith: ['hedychium', 'ginger lily'],
  },
  {
    id: 25,
    commonName: 'Sunflower',
    scientificName: 'Helianthus annuus',
    category: 'Flowering plants',
    variantGroup: 'pot',
    slug: 'sunflower',
    genus: 'Helianthus',
    species: 'annuus',
    alternateGenera: [],
    doNotConfuseWith: ['tithonia'],
  },
  {
    id: 26,
    commonName: 'Tulsi (holy basil)',
    scientificName: 'Ocimum tenuiflorum',
    category: 'Herbs & medicinal',
    variantGroup: 'pot',
    slug: 'tulsi-holy-basil',
    genus: 'Ocimum',
    species: 'tenuiflorum',
    alternateGenera: ['Ocimum sanctum'],
    doNotConfuseWith: ['sweet basil', 'basilicum'],
  },
  {
    id: 27,
    commonName: 'Neem',
    scientificName: 'Azadirachta indica',
    category: 'Herbs & medicinal',
    variantGroup: 'sapling',
    slug: 'neem',
    genus: 'Azadirachta',
    species: 'indica',
    alternateGenera: [],
    doNotConfuseWith: ['melia azedarach', 'chinaberry'],
  },
  {
    id: 28,
    commonName: 'Curry leaf',
    scientificName: 'Murraya koenigii',
    category: 'Herbs & medicinal',
    variantGroup: 'pot',
    slug: 'curry-leaf',
    genus: 'Murraya',
    species: 'koenigii',
    alternateGenera: [],
    doNotConfuseWith: ['moringa'],
  },
  {
    id: 29,
    commonName: 'Mint',
    scientificName: 'Mentha spicata',
    category: 'Herbs & medicinal',
    variantGroup: 'pot',
    slug: 'mint',
    genus: 'Mentha',
    species: 'spicata',
    alternateGenera: [],
    doNotConfuseWith: ['coleus', 'lemon balm'],
  },
  {
    id: 30,
    commonName: 'Lemongrass',
    scientificName: 'Cymbopogon citratus',
    category: 'Herbs & medicinal',
    variantGroup: 'pot',
    slug: 'lemongrass',
    genus: 'Cymbopogon',
    species: 'citratus',
    alternateGenera: [],
    doNotConfuseWith: ['vetiver'],
  },
  {
    id: 31,
    commonName: 'Ashwagandha',
    scientificName: 'Withania somnifera',
    category: 'Herbs & medicinal',
    variantGroup: 'pot',
    slug: 'ashwagandha',
    genus: 'Withania',
    species: 'somnifera',
    alternateGenera: [],
    doNotConfuseWith: ['tomatillo', 'physalis'],
  },
  {
    id: 32,
    commonName: 'Brahmi',
    scientificName: 'Bacopa monnieri',
    category: 'Herbs & medicinal',
    variantGroup: 'pot',
    slug: 'brahmi',
    genus: 'Bacopa',
    species: 'monnieri',
    alternateGenera: [],
    doNotConfuseWith: ['centella asiatica'],
  },
  {
    id: 33,
    commonName: 'Turmeric',
    scientificName: 'Curcuma longa',
    category: 'Herbs & medicinal',
    variantGroup: 'pot',
    slug: 'turmeric',
    genus: 'Curcuma',
    species: 'longa',
    alternateGenera: [],
    doNotConfuseWith: ['zingiber', 'ginger', 'canna'],
  },
  {
    id: 34,
    commonName: 'Ginger',
    scientificName: 'Zingiber officinale',
    category: 'Herbs & medicinal',
    variantGroup: 'pot',
    slug: 'ginger',
    genus: 'Zingiber',
    species: 'officinale',
    alternateGenera: [],
    doNotConfuseWith: ['curcuma', 'turmeric'],
  },
  {
    id: 35,
    commonName: 'Moringa',
    scientificName: 'Moringa oleifera',
    category: 'Herbs & medicinal',
    variantGroup: 'sapling',
    slug: 'moringa',
    genus: 'Moringa',
    species: 'oleifera',
    alternateGenera: [],
    doNotConfuseWith: ['curry leaf', 'cassia'],
  },
  {
    id: 36,
    commonName: 'Mango',
    scientificName: 'Mangifera indica',
    category: 'Fruit plants',
    variantGroup: 'sapling',
    slug: 'mango',
    genus: 'Mangifera',
    species: 'indica',
    alternateGenera: [],
    doNotConfuseWith: ['cashew', 'jamun'],
  },
  {
    id: 37,
    commonName: 'Guava',
    scientificName: 'Psidium guajava',
    category: 'Fruit plants',
    variantGroup: 'sapling',
    slug: 'guava',
    genus: 'Psidium',
    species: 'guajava',
    alternateGenera: [],
    doNotConfuseWith: ['jamun', 'rose apple'],
  },
  {
    id: 38,
    commonName: 'Pomegranate',
    scientificName: 'Punica granatum',
    category: 'Fruit plants',
    variantGroup: 'sapling',
    slug: 'pomegranate',
    genus: 'Punica',
    species: 'granatum',
    alternateGenera: [],
    doNotConfuseWith: [],
  },
  {
    id: 39,
    commonName: 'Lemon',
    scientificName: 'Citrus limon',
    category: 'Fruit plants',
    variantGroup: 'sapling',
    slug: 'lemon',
    genus: 'Citrus',
    species: 'limon',
    alternateGenera: [],
    doNotConfuseWith: ['sweet lime', 'kagzi lime'],
  },
  {
    id: 40,
    commonName: 'Papaya',
    scientificName: 'Carica papaya',
    category: 'Fruit plants',
    variantGroup: 'sapling',
    slug: 'papaya',
    genus: 'Carica',
    species: 'papaya',
    alternateGenera: [],
    doNotConfuseWith: ['castor', 'cecropia'],
  },
  {
    id: 41,
    commonName: 'Banana',
    scientificName: 'Musa x paradisiaca',
    category: 'Fruit plants',
    variantGroup: 'sapling',
    slug: 'banana',
    genus: 'Musa',
    species: 'paradisiaca',
    alternateGenera: [],
    doNotConfuseWith: ['heliconia', 'canna'],
  },
  {
    id: 42,
    commonName: 'Sapota',
    scientificName: 'Manilkara zapota',
    category: 'Fruit plants',
    variantGroup: 'sapling',
    slug: 'sapota',
    genus: 'Manilkara',
    species: 'zapota',
    alternateGenera: [],
    doNotConfuseWith: ['mimusops elengi', 'bakul'],
  },
  {
    id: 43,
    commonName: 'Jackfruit',
    scientificName: 'Artocarpus heterophyllus',
    category: 'Fruit plants',
    variantGroup: 'sapling',
    slug: 'jackfruit',
    genus: 'Artocarpus',
    species: 'heterophyllus',
    alternateGenera: [],
    doNotConfuseWith: ['breadfruit'],
  },
  {
    id: 44,
    commonName: 'Amla (gooseberry)',
    scientificName: 'Phyllanthus emblica',
    category: 'Fruit plants',
    variantGroup: 'sapling',
    slug: 'amla-gooseberry',
    genus: 'Phyllanthus',
    species: 'emblica',
    alternateGenera: [],
    doNotConfuseWith: ['tamarind'],
  },
  {
    id: 45,
    commonName: 'Custard apple',
    scientificName: 'Annona squamosa',
    category: 'Fruit plants',
    variantGroup: 'sapling',
    slug: 'custard-apple',
    genus: 'Annona',
    species: 'squamosa',
    alternateGenera: [],
    doNotConfuseWith: ['soursop', 'annona reticulata'],
  },
  {
    id: 46,
    commonName: 'Coconut (dwarf)',
    scientificName: 'Cocos nucifera',
    category: 'Fruit plants',
    variantGroup: 'sapling',
    slug: 'coconut-dwarf',
    genus: 'Cocos',
    species: 'nucifera',
    alternateGenera: [],
    doNotConfuseWith: ['areca palm', 'date palm'],
  },
  {
    id: 47,
    commonName: 'Bael',
    scientificName: 'Aegle marmelos',
    category: 'Sacred plants',
    variantGroup: 'sapling',
    slug: 'bael',
    genus: 'Aegle',
    species: 'marmelos',
    alternateGenera: [],
    doNotConfuseWith: ['wood apple', 'limonia'],
  },
  {
    id: 48,
    commonName: 'Tomato',
    scientificName: 'Solanum lycopersicum',
    category: 'Vegetable seedlings',
    variantGroup: 'pot',
    slug: 'tomato',
    genus: 'Solanum',
    species: 'lycopersicum',
    alternateGenera: [],
    doNotConfuseWith: ['brinjal', 'potato'],
  },
  {
    id: 49,
    commonName: 'Chilli',
    scientificName: 'Capsicum annuum',
    category: 'Vegetable seedlings',
    variantGroup: 'pot',
    slug: 'chilli',
    genus: 'Capsicum',
    species: 'annuum',
    alternateGenera: [],
    doNotConfuseWith: ['blocky fruit'],
  },
  {
    id: 50,
    commonName: 'Brinjal',
    scientificName: 'Solanum melongena',
    category: 'Vegetable seedlings',
    variantGroup: 'pot',
    slug: 'brinjal',
    genus: 'Solanum',
    species: 'melongena',
    alternateGenera: [],
    doNotConfuseWith: ['tomato', 'potato'],
  },
  {
    id: 51,
    commonName: 'Okra',
    scientificName: 'Abelmoschus esculentus',
    category: 'Vegetable seedlings',
    variantGroup: 'pot',
    slug: 'okra',
    genus: 'Abelmoschus',
    species: 'esculentus',
    alternateGenera: [],
    doNotConfuseWith: ['hibiscus sabdariffa', 'cotton'],
  },
  {
    id: 52,
    commonName: 'Coriander',
    scientificName: 'Coriandrum sativum',
    category: 'Vegetable seedlings',
    variantGroup: 'pot',
    slug: 'coriander',
    genus: 'Coriandrum',
    species: 'sativum',
    alternateGenera: [],
    doNotConfuseWith: ['parsley'],
  },
  {
    id: 53,
    commonName: 'Lotus',
    scientificName: 'Nelumbo nucifera',
    category: 'Water plants',
    variantGroup: 'pot',
    slug: 'lotus',
    genus: 'Nelumbo',
    species: 'nucifera',
    alternateGenera: [],
    doNotConfuseWith: ['nymphaea', 'water lily'],
  },
];

/**
 * Botanical validator: checks that candidate title/description contains genus or species,
 * and does NOT contain any "do not confuse with" terms.
 */
export function validateBotanical(
  text: string,
  ref: PlantRef
): { valid: boolean; reason?: string } {
  const combined = text.toLowerCase();

  // 1. Check for "Do NOT confuse with" keywords
  for (const avoid of ref.doNotConfuseWith) {
    const avoidLower = avoid.toLowerCase();
    // Word boundary or substring check
    const regex = new RegExp(`\\b${avoidLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (regex.test(combined)) {
      return { valid: false, reason: `Matches prohibited confusion term: "${avoid}"` };
    }
  }

  // 2. Check that genus or species is present
  const validGenera = [ref.genus.toLowerCase(), ...(ref.alternateGenera || []).map((g) => g.toLowerCase())];
  const speciesLower = ref.species.toLowerCase().replace(/^x\s+/, '');

  const hasGenus = validGenera.some((g) => combined.includes(g));
  const hasSpecies = speciesLower.length > 2 && combined.includes(speciesLower);

  if (!hasGenus && !hasSpecies) {
    return { valid: false, reason: `Neither genus (${ref.genus}) nor species (${ref.species}) found in image metadata` };
  }

  return { valid: true };
}

/**
 * Updates DB product records and plant_attributes for all size variants of a plant.
 */
export async function updatePlantImageInDb(result: PlantImageResult): Promise<number> {
  const pool = getPool();
  const filename = result.imagePath ? path.basename(result.imagePath) : null;
  const relativeUrl = filename ? `/static/plants/${filename}` : null;

  // Update products table where scientific_name or plant_common_name matches
  const updateRes = await pool.query(
    `UPDATE products 
     SET image_path = $1,
         image_url = $2,
         image_source_url = $3,
         image_author = $4,
         image_license = $5,
         image_status = $6
     WHERE lower(plant_common_name) = lower($7) 
        OR lower(scientific_name) = lower($8)
        OR sku ILIKE 'PLANT-' || $9 || '-%'`,
    [
      filename,
      relativeUrl,
      result.imageSourceUrl,
      result.imageAuthor,
      result.imageLicense,
      result.status,
      result.commonName,
      result.scientificName,
      result.slug,
    ]
  );

  // Update plant_attributes table
  await pool.query(
    `UPDATE plant_attributes
     SET image_path = $1,
         image_source_url = $2,
         image_author = $3,
         image_license = $4,
         image_status = $5
     WHERE lower(scientific_name) = lower($6)
        OR product_id IN (
           SELECT id FROM products 
           WHERE lower(plant_common_name) = lower($7) OR sku ILIKE 'PLANT-' || $8 || '-%'
        )`,
    [
      filename,
      result.imageSourceUrl,
      result.imageAuthor,
      result.imageLicense,
      result.status,
      result.scientificName,
      result.commonName,
      result.slug,
    ]
  );

  return updateRes.rowCount || 0;
}

/**
 * Generates reports/plant-images-review.html
 */
export function generateReviewHtml(results: PlantImageResult[]): string {
  const okCount = results.filter((r) => r.status === 'ok').length;
  const reviewCount = results.filter((r) => r.status === 'needs_review').length;
  const missingCount = results.filter((r) => r.status === 'missing').length;

  const cardsHtml = results
    .map((r, i) => {
      const badgeColor =
        r.status === 'ok'
          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
          : r.status === 'needs_review'
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-rose-100 text-rose-800 border-rose-300';

      const imgSrc = r.imagePath ? `../data/plant-images/${path.basename(r.imagePath)}` : null;

      return `
      <div class="border rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col">
        <div class="relative bg-stone-100 h-52 flex items-center justify-center overflow-hidden">
          ${
            imgSrc
              ? `<img src="${imgSrc}" alt="${r.commonName}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src=''; this.parentElement.innerHTML='<span class=\\'text-xs text-stone-400 font-mono\\'>Image Load Failed</span>';"/>`
              : `<div class="text-stone-400 text-xs font-mono">No Image</div>`
          }
          <span class="absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeColor}">
            ${r.status.toUpperCase()}${r.isManual ? ' (MANUAL)' : ''}
          </span>
          <span class="absolute bottom-2 left-2 text-[11px] font-mono bg-black/60 text-white px-2 py-0.5 rounded">
            #${i + 1}
          </span>
        </div>
        <div class="p-4 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="font-bold text-base text-stone-900 leading-tight">${r.commonName}</h3>
            <p class="text-xs italic text-stone-500 mb-2">${r.scientificName}</p>
            ${r.notes ? `<p class="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded mb-2 border border-amber-200">${r.notes}</p>` : ''}
          </div>
          <div class="text-xs space-y-1 pt-2 border-t border-stone-100 text-stone-600">
            <div><span class="font-medium text-stone-500">License:</span> <span class="font-mono text-[11px] bg-stone-100 px-1 py-0.5 rounded">${r.imageLicense || 'None'}</span></div>
            <div><span class="font-medium text-stone-500">Author:</span> ${r.imageAuthor || 'N/A'}</div>
            ${
              r.imageSourceUrl
                ? `<div class="truncate"><a href="${r.imageSourceUrl}" target="_blank" rel="noopener noreferrer" class="text-emerald-700 hover:underline">Source Link ↗</a></div>`
                : '<div class="text-stone-400">No source link</div>'
            }
          </div>
        </div>
      </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>StockSure Nursery - Plant Images Review Sheet</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-stone-50 text-stone-800 p-6 md:p-10 font-sans">
  <div class="max-w-7xl mx-auto">
    <header class="mb-8 pb-6 border-b border-stone-200">
      <h1 class="text-2xl md:text-3xl font-extrabold text-[#183D2B]">StockSure Plant Images Review Sheet</h1>
      <p class="text-sm text-stone-500 mt-1">Total plants: 53 • Verified, licensed botanical images from Wikimedia Commons / Manual Override</p>
      
      <div class="flex flex-wrap gap-4 mt-4">
        <div class="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold">
          OK: ${okCount}
        </div>
        <div class="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-semibold">
          Needs Review: ${reviewCount}
        </div>
        <div class="px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm font-semibold">
          Missing: ${missingCount}
        </div>
      </div>
    </header>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      ${cardsHtml}
    </div>
  </div>
</body>
</html>`;
}

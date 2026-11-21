import { backend, adaptProduct, formatImageUrl, Product } from '@/lib/backend';

export interface BotanicalAnswer {
  reply: string;
  suggestions: string[];
  products?: any[];
  action?: any;
}

export async function processBotanicalQuery(
  rawText: string,
  backendData: any,
  branchName: string = 'Koramangala',
  city: string = 'Bengaluru'
): Promise<BotanicalAnswer> {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();
  const backendReply = typeof backendData?.reply === 'string' ? backendData.reply : '';
  const isFallback =
    !backendReply ||
    backendReply.includes("not quite sure about that") ||
    backendReply.includes("do not have curated care notes") ||
    backendReply.includes("Searching our real-time catalogue");

  // ================= 1. OVERARCHING SEASONAL ADVISORY =================
  // Handles: "which plant is best for seasons", "seasons", "all seasons", "season plants"
  if (
    /\b(which plant is best for seasons|best for seasons|seasons|all season|all seasons|seasonal plants?|best seasonal)\b/i.test(lower) &&
    !lower.includes('summer') &&
    !lower.includes('winter') &&
    !lower.includes('rainy') &&
    !lower.includes('monsoon')
  ) {
    const products = await getRecommendedProducts(['money', 'snake', 'peace', 'zz', 'areca']);
    return {
      reply: `🌿 **StockSure Seasonal Guide: Best Plants for Every Season in ${city}:**\n\nDifferent plants flourish during specific weather windows. Here is our horticultural roadmap for the year:\n\n• ☀️ **Summer Season (March – June)**: Drought-hardy specimens that store water in thick succulent leaves and love heat: **Snake Plant**, **Jade Plant**, **Aloe Vera**, and **Bougainvillea**.\n• 🌧️ **Rainy / Monsoon Season (July – September)**: High humidity lovers that thrive with lush new vegetative shoots: **Boston Fern**, **Peace Lily**, and **Money Plant**.\n• ❄️ **Winter Season (October – February)**: Low-light champions with dormant water needs: **ZZ Plant**, **Rubber Plant**, and **Areca Palm** (natural indoor humidifier).\n• 🌸 **Spring Season**: Rapid blooming and sweet fragrances: **Arabian Jasmine (Mogra)** and **Monstera Deliciosa**.\n\n👇 *Select a season below for specific watering routines & recommended specimens:*`,
      suggestions: [
        'for summer',
        'for rainy',
        'for winter',
        'for spring',
        'Plant Care Tips',
      ],
      products,
    };
  }

  // ================= 2. SPECIFIC SEASONAL ADVISORIES =================
  // Summer
  if (/\b(summer|hot weather|heat|high temp|dry season|for summer)\b/i.test(lower)) {
    const products = await getRecommendedProducts(['aloe', 'snake', 'jade', 'bougainvillea', 'succulent']);
    return {
      reply: `☀️ **Best Plants for Summer Season:**\n\nDuring hot weather, choose botanical specimens that retain internal moisture, tolerate ambient heat, and regulate transpiration efficiently:\n\n• **Snake Plant (Sansevieria)**: Drought-tolerant, thrives even in scorching dry spells, and releases oxygen at night.\n• **Jade Plant & Succulents**: Store water inside thick, fleshy leaves and love bright sunny balconies.\n• **Aloe Vera**: Hardy botanical that purifies air and requires minimal weekly watering.\n• **Bougainvillea**: Loves direct summer sunlight and produces brilliant, vibrant floral blooms.\n\n💡 *Summer Care Tip*: Water early in the morning before 8 AM or after sunset to prevent rapid evaporation and root thermal shock.`,
      suggestions: [
        'for winter',
        'for rainy',
        'Summer watering guide',
        'Best plants for balcony',
        'Care for Snake plant',
      ],
      products,
    };
  }

  // Winter
  if (/\b(winter|cold weather|chilly|for winter|in winter)\b/i.test(lower)) {
    const products = await getRecommendedProducts(['areca', 'zz', 'rubber', 'money', 'peace']);
    return {
      reply: `❄️ **Best Plants for Winter Season:**\n\nIn cooler winter months, indoor light diminishes and vegetative growth naturally slows down. The best winter plants tolerate reduced sunlight and require very little hydration:\n\n• **ZZ Plant (Zamioculcas)**: Bulbous rhizomes store water for weeks; thrives even in dimly lit rooms and only needs watering once a month in winter.\n• **Areca Palm**: Natural indoor humidifier that counteracts dry winter heaters and indoor air.\n• **Rubber Plant (Ficus elastica)**: Robust architectural foliage with a waxy cuticle that locks in moisture.\n• **Money Plant (Golden Pothos)**: Highly adaptable indoor vine that stays green and lush throughout winter.\n\n💡 *Winter Care Tip*: Reduce your watering routine by 50% during winter. Always inspect the soil with your finger—if it feels cool and damp, wait another week!`,
      suggestions: [
        'for summer',
        'for rainy',
        'Care for ZZ plant',
        'Care for Areca palm',
        'Best low light plants',
      ],
      products,
    };
  }

  // Rainy / Monsoon
  if (/\b(rainy|rain|monsoon|humidity|wet season|for rainy|in rainy)\b/i.test(lower)) {
    const products = await getRecommendedProducts(['fern', 'peace', 'money', 'syngonium']);
    return {
      reply: `🌧️ **Best Plants for Rainy & Monsoon Season:**\n\nMonsoon weather brings lush humidity, creating ideal conditions for tropical foliage to thrive and sprout rapid root growth:\n\n• **Boston Fern & Maidenhair Fern**: Adore high relative humidity and unfurl tender green fronds.\n• **Peace Lily (Spathiphyllum)**: Loves humid monsoon environments and flowers with pristine white spathes.\n• **Money Plant**: Spawns rapid aerial roots and climbs vigorously in monsoon humidity.\n• **Syngonium (Arrowhead Plant)**: Thrives in warm, damp weather with vibrant patterned leaves.\n\n💡 *Monsoon Care Tip*: Ensure your planters have unobstructed drainage holes. High ambient humidity means soil stays damp longer, so avoid waterlogged trays to protect against root fungal rot.`,
      suggestions: [
        'for summer',
        'for winter',
        'Care for Peace Lily',
        'Care for Money plant',
        'Monsoon fungal prevention',
      ],
      products,
    };
  }

  // Spring
  if (/\b(spring|flowering|blooming|for spring|in spring)\b/i.test(lower)) {
    const products = await getRecommendedProducts(['jasmine', 'hibiscus', 'peace', 'monstera']);
    return {
      reply: `🌸 **Best Plants for Spring Season:**\n\nSpring is the primary vegetative growth and flowering period across Indian climates:\n\n• **Arabian Jasmine (Mogra)**: Releases enchanting evening fragrance with rapid spring bud formation.\n• **Monstera Deliciosa**: Unfurls fresh, glossy fenestrated leaves as daylight hours increase.\n• **Peace Lily**: Produces fresh white flowers throughout spring.\n\n💡 *Spring Care Tip*: Spring is the best time to repot root-bound plants and provide organic liquid compost or vermicompost!`,
      suggestions: [
        'Spring repotting tips',
        'Care for Monstera',
        'Care for Jasmine',
        'for summer',
      ],
      products,
    };
  }

  // ================= 3. PLANT CARE TIPS & GUIDELINES =================
  if (/\b(plant care tips|care tips?|how to care|plant care|care guide|care notes)\b/i.test(lower)) {
    const products = await getRecommendedProducts(['money', 'snake', 'peace', 'zz']);
    return {
      reply: `🌿 **StockSure Horticultural Care Principles:**\n\nCultivating healthy nursery specimens in Bengaluru requires following four foundational principles:\n\n1. 💧 **The 2-Inch Moisture Rule**: Always press your index finger 2 inches into the soil. If it feels cool or damp, wait! Overwatering kills 10x more houseplants than underwatering.\n2. ☀️ **Bright Indirect Light**: Position indoor plants 3–6 feet from an east or north window. Direct midday sun behind glass can scorch tender foliage.\n3. 🌱 **Living Peat-Free Substrate**: All StockSure plants are cultivated in peat-free, aerated organic potting substrate enriched with cocopeat, perlite, and vermicompost.\n4. 🍃 **Foliage Hygiene**: Wipe leaves with a damp microfiber cloth once every two weeks to remove household dust and optimize chlorophyll photosynthesis.\n\nTap any plant below for exact tailored guidelines:`,
      suggestions: [
        'Care for Money plant',
        'Care for Snake plant',
        'Care for Peace Lily',
        'Care for ZZ plant',
        'Why are leaves turning yellow?',
      ],
      products,
    };
  }

  // ================= 4. SPECIFIC PLANT CARE LOOKUPS =================
  if (lower.includes('money plant') || lower.includes('pothos')) {
    const products = await getRecommendedProducts(['money']);
    return {
      reply: `🌿 **Money Plant (Epipremnum aureum / Golden Pothos) Care Guide:**\n\n• ☀️ **Light**: Thrives in medium to bright indirect light; also tolerates fluorescent office lighting.\n• 💧 **Water**: Water once every 5–7 days when the top inch of soil dries out. In winter, reduce to every 10–12 days.\n• 🍃 **Propagation**: Highly adaptable! Can grow in peat-free potting soil or directly in clean water jars.\n• 💡 *Pro Tip*: Mist the moss pole weekly to encourage aerial roots to cling and produce larger, heart-shaped leaves.`,
      suggestions: ['Can Money plant grow in water?', 'Why are Money plant leaves yellow?', 'Add Money plant to cart', 'Browse all products'],
      products,
    };
  }

  if (lower.includes('snake plant') || lower.includes('sansevieria')) {
    const products = await getRecommendedProducts(['snake']);
    return {
      reply: `🌿 **Snake Plant (Sansevieria trifasciata) Care Guide:**\n\n• ☀️ **Light**: Indestructible! Thrives from low corners to bright direct sun.\n• 💧 **Water**: Drought champion. Water only every 14–20 days. Ensure the soil is completely dry between waterings.\n• 🛏️ **Bedroom Benefit**: Emits clean oxygen throughout the night through CAM photosynthesis.\n• 💡 *Pro Tip*: Never pour water directly into the center rosette crown to prevent core fungal rot.`,
      suggestions: ['Best bedroom plants', 'Care for ZZ plant', 'Add Snake plant to cart', 'Air purifying plants'],
      products,
    };
  }

  if (lower.includes('peace lily')) {
    const products = await getRecommendedProducts(['peace']);
    return {
      reply: `🌿 **Peace Lily (Spathiphyllum) Care Guide:**\n\n• ☀️ **Light**: Low to bright filtered light. Keep out of harsh afternoon sun.\n• 💧 **Water**: Loves consistent gentle moisture. The leaves dramatically droop when thirsty and spring back within 2 hours of watering!\n• 🌸 **Flowering**: Blooms pristine white spathes in spring and monsoon seasons.\n• 💡 *Pro Tip*: Use filtered water or tap water that has rested for 24h to prevent brown leaf tips.`,
      suggestions: ['Why is my Peace Lily drooping?', 'Care for Money plant', 'Add Peace Lily to cart', 'Monsoon plant care'],
      products,
    };
  }

  if (lower.includes('zz plant')) {
    const products = await getRecommendedProducts(['zz']);
    return {
      reply: `🌿 **ZZ Plant (Zamioculcas zamiifolia) Care Guide:**\n\n• ☀️ **Light**: Thrives in deep shade, low light, and windowless office settings.\n• 💧 **Water**: Has potato-like underground rhizomes that store water. Water once a month!\n• 🍃 **Shine**: Naturally glossy, waxy leaves that never need synthetic leaf shine chemicals.\n• 💡 *Pro Tip*: The only way to harm a ZZ plant is by watering it too frequently!`,
      suggestions: ['Best low light plants', 'Care for Snake plant', 'Add ZZ plant to cart', 'Browse all products'],
      products,
    };
  }

  // ================= 5. ROOM & PLACEMENT ADVISORY =================
  if (/\b(bedroom|sleeping|sleep|bed room)\b/i.test(lower)) {
    const products = await getRecommendedProducts(['snake', 'peace', 'areca']);
    return {
      reply: `🛏️ **Best Plants for Bedrooms:**\n\nFor restful sleep and optimal indoor air, select botanicals that engage in Crassulacean Acid Metabolism (CAM)—releasing oxygen throughout the night:\n\n• **Snake Plant**: Converts CO₂ into clean oxygen all night long; highly forgiving of forgotten watering.\n• **Peace Lily**: Natural biological air scrubber that neutralizes airborne VOCs and toxins.\n• **Areca Palm**: Transpires clean moisture, preventing dry throat and irritated skin.\n\n💡 *Placement Tip*: Place your Snake Plant within 6–8 feet of your headboard for optimum night-time oxygen circulation.`,
      suggestions: ['Care for Snake plant', 'Care for Peace Lily', 'Air purifying plants', 'Low maintenance plants'],
      products,
    };
  }

  if (/\b(low light|dark room|dim light|no sun|corner|office)\b/i.test(lower)) {
    const products = await getRecommendedProducts(['zz', 'snake', 'money', 'aglaonema']);
    return {
      reply: `💡 **Best Plants for Low Light & Dim Spaces:**\n\nThese hardy botanical champions thrive in indirect, filtered, or even artificial fluorescent light:\n\n• **ZZ Plant**: The undisputed king of low-light resilience; requires water once every 3–4 weeks.\n• **Snake Plant**: Tolerates dark corners without stretching or losing structural vitality.\n• **Money Plant**: Thrives on desks and interior shelves under soft ambient room lighting.\n• **Chinese Evergreen (Aglaonema)**: Vibrant patterned leaves that preserve color even in deep shade.`,
      suggestions: ['Care for ZZ plant', 'Care for Snake plant', 'Desk plants for office', 'Easy beginner plants'],
      products,
    };
  }

  if (/\b(balcony|terrace|outdoor|sunlight|direct sun)\b/i.test(lower)) {
    const products = await getRecommendedProducts(['bougainvillea', 'jasmine', 'aloe', 'jade']);
    return {
      reply: `🌿 **Best Plants for Balconies & Sunny Terraces:**\n\nFor spaces with direct sun and fresh airflow, choose strong sun-loving specimens:\n\n• **Bougainvillea**: Prolific sun lover with dazzling floral cascades.\n• **Arabian Jasmine (Mogra)**: Loves morning sun and bathes your balcony in sweet evening aroma.\n• **Jade Plant**: Loves bright balcony light; develops woody ornamental bonsai-like trunks.\n• **Aloe Vera**: Thrives in dry, sun-drenched architectural planters.`,
      suggestions: ['Balcony plant care', 'Care for Jade plant', 'Outdoor perennials', 'Summer watering guide'],
      products,
    };
  }

  // ================= 6. BROWSE / EXPLORE CATALOG =================
  if (/\b(browse|browse shop|browse all|all products|view catalog|show all|show plants|shop|plants)\b/i.test(lower)) {
    const products = await getRecommendedProducts(['money', 'snake', 'peace', 'areca', 'fern', 'zz']);
    return {
      reply: `🌿 **StockSure Live Nursery Catalog (${branchName}, ${city}):**\n\nHere are our certified, acclimated nursery specimens currently in stock. Each plant is cultivated in 100% peat-free organic substrate and potted with balanced root architecture:\n\nTap **'+ Add'** to reserve items directly in your cart, or tap **'Details'** for full botanical specifications!`,
      suggestions: [
        'which plant is best for seasons',
        'Best plants for low light',
        'Air purifying plants',
        'Delivery charges & timings',
      ],
      products,
      action: {
        type: 'show_products',
        payload: { query: 'all' },
      },
    };
  }

  // ================= 7. HELP & ASSISTANCE =================
  if (/\b(more help|help|support|what can you do|features|guide me|options)\b/i.test(lower)) {
    return {
      reply: `🌱 **Hello! I'm Planty, your StockSure Botanical Concierge.** Here is everything I can do for you:\n\n1. 🌿 **Plant Selection**: Tell me your room (*bedroom, balcony, office*) or season (*summer, winter, rainy*) and I'll recommend the best specimens.\n2. 💧 **Care Tips & Diagnostics**: Ask about watering routines, yellow leaves, pest prevention, or repotting.\n3. 🚚 **Instant Delivery Quotes**: Check instant 30-minute delivery to your PIN code across Bengaluru.\n4. 📦 **Live Order Tracking**: Provide an Order ID to check live rider dispatch and transit progress.\n5. 🏬 **Store Sanctuaries**: Find our local branches with live inventory counters.\n\nWhat would you like to explore?`,
      suggestions: [
        'which plant is best for seasons',
        'Plant Care Tips',
        'Browse all products',
        'Delivery charges',
        'Store locations',
      ],
    };
  }

  // ================= 8. ORDER TRACKING & DELIVERY =================
  if (/\b(track my order|track order|order tracking|order status|where is my order)\b/i.test(lower)) {
    return {
      reply: `📦 **Live Order Tracking:**\n\nYou can track any active order in real time! Check your order history in the [My Profile & Orders](/profile) portal, or simply paste your Order ID here and I'll retrieve live status, rider assignment, and transit updates immediately.`,
      suggestions: ['Go to Profile & Orders', 'Browse all products', 'Delivery charges', 'More Help'],
    };
  }

  if (/\b(delivery charges?|shipping cost|delivery fee|how much delivery)\b/i.test(lower)) {
    return {
      reply: `🚚 **StockSure Delivery Information (${city}):**\n\n• **Complimentary Delivery**: Orders above **₹499** enjoy 100% FREE delivery across Bengaluru.\n• **Express Standard Delivery**: Flat **₹49** for smaller botanical orders.\n• **Insulated Climate Control**: All plants travel in custom peat-insulated carriers that shield delicate root balls and foliage from vehicular heat and vibration.\n• **Express 30-Minute Dispatch**: Orders are dispatched directly from your nearest sanctuary branch (Indiranagar, Koramangala, or Whitefield).`,
      suggestions: ['Browse all products', 'Store locations', 'which plant is best for seasons', 'Plant Care Tips'],
    };
  }

  if (/\b(store locations?|branches|where are you located|address|visit nursery)\b/i.test(lower)) {
    return {
      reply: `🏬 **StockSure Botanical Sanctuaries in Bengaluru:**\n\n1. 🌿 **Koramangala Sanctuary**: 80 Feet Road, 4th Block (Near Sony World Junction) • Open daily 8 AM – 9 PM\n2. 🌿 **Indiranagar Sanctuary**: 100 Feet Road, HAL 2nd Stage • Open daily 8 AM – 9 PM\n3. 🌿 **Whitefield Sanctuary**: ITPB Main Road, Near ITPL • Open daily 8 AM – 8:30 PM\n\nAll three branches maintain live inventory counters, peat-free potting stations, and on-site horticulturists!`,
      suggestions: ['Browse all products', 'Delivery charges', 'Plant Care Tips', 'More Help'],
    };
  }

  // ================= 9. PLANT HEALTH DIAGNOSTICS =================
  if (/\b(yellow leaves|yellowing|brown leaves|brown tips|drooping|dying|pest|bugs|fertilizer|repotting)\b/i.test(lower)) {
    if (lower.includes('yellow')) {
      return {
        reply: `🍂 **Diagnostic: Yellowing Leaves**\n\nYellow leaves are the most common botanical symptom. Here is how to diagnose and cure it:\n\n• **Primary Cause: Overwatering**: If lower leaves turn soft and yellow, the roots are suffocating from soggy soil. Let top 2–3 inches dry before watering again.\n• **Secondary Cause: Poor Drainage**: Ensure excess water escapes the bottom drainage hole freely.\n• **Natural Aging**: If only one single oldest leaf at the base turns yellow while new shoots emerge, it's natural leaf turnover!\n\n💡 *Action*: Pause watering for 5–7 days, aerate the surface soil with a fork, and ensure bright indirect light.`,
        suggestions: ['How to check soil moisture', 'Care for Money plant', 'Care for Snake plant', 'Organic fertilizer tips'],
      };
    }

    if (lower.includes('brown')) {
      return {
        reply: `🌿 **Diagnostic: Brown Leaf Tips & Edges**\n\nBrown, crispy leaf edges usually indicate atmospheric or water quality issues:\n\n• **Low Humidity**: Dry air causes tips to crisp. Mist broad leaves or place on a pebble water tray.\n• **Tap Water Salts**: Municipal tap water often has chlorine/fluoride. Use filtered water or let tap water sit for 24h before watering.\n• **Underwatered**: If soil has shrunk from pot edges, give a slow thorough soak until water drains.`,
        suggestions: ['Monsoon humidity tips', 'Care for Peace Lily', 'Care for Areca palm', 'Best indoor plants'],
      };
    }

    if (lower.includes('droop')) {
      return {
        reply: `💧 **Diagnostic: Drooping Foliage**\n\nDrooping is a plant's physical cry for help:\n\n• **Thirsty (Underwatered)**: Touch the soil—if bone dry, your plant is flagging. Peace lilies dramatically droop when thirsty and bounce back 2 hours after a deep drink!\n• **Overwatered (Root Rot)**: If the soil is wet yet the plant droops, roots cannot absorb oxygen. Gently unpot and inspect for dark, mushy roots.`,
        suggestions: ['Care for Peace Lily', 'Summer watering guide', 'Potting soil mix tips', 'Browse nursery catalog'],
      };
    }
  }

  // ================= 10. IF BACKEND HAS A VALID SPECIFIC ANSWER =================
  if (!isFallback) {
    const dynamicSuggestions = generateFollowUpSuggestions(lower, backendData?.suggestions || []);
    return {
      reply: backendReply,
      suggestions: dynamicSuggestions,
      action: backendData.action,
      products: backendData.products,
    };
  }

  // ================= 11. SEARCH FALLBACK =================
  try {
    const searchRes = await backend.searchProducts({ q: text, city });
    if (searchRes.results && searchRes.results.length > 0) {
      const prods = searchRes.results.slice(0, 6).map((r: any) => ({
        id: r.product_id || r.id,
        product_id: r.product_id || r.id,
        name: r.name,
        price_paise: r.price_paise,
        image_url: formatImageUrl(r.image_url, r.name),
        category: r.category,
      }));

      return {
        reply: `🌿 Found **${searchRes.results.length} verified botanical specimens** matching "${text}" at StockSure ${branchName}:`,
        suggestions: [
          'which plant is best for seasons',
          'Care tips for ' + (searchRes.results[0]?.name?.split(',')[0] || 'plants'),
          'Plant Care Tips',
          'Delivery charges & timings',
        ],
        products: prods,
      };
    }
  } catch {
    // proceed to intelligent fallback
  }

  // ================= 12. INTELLIGENT HELPFUL FALLBACK =================
  const catalog = await getRecommendedProducts(['money', 'snake', 'peace']);
  return {
    reply: `🌿 I'm here to help you cultivate your green sanctuary in ${city}! Here are some popular things you can ask me:\n\n• **Seasonal Recommendations**: "Which plant is best for seasons?", "Best for summer", "Best winter plants"\n• **Room Matching**: "Plants for bedroom", "Low light desk plants", "Balcony perennials"\n• **Plant Care**: "Plant Care Tips", "How to water Money plant", "Why are leaves turning yellow?"\n• **Store & Delivery**: "Check delivery charges", "Locate nearest branch", "Track my order"`,
    suggestions: [
      'which plant is best for seasons',
      'Plant Care Tips',
      'Best plants for summer',
      'Browse all products',
    ],
    products: catalog,
  };
}

// Helper to fetch matching products from catalog
async function getRecommendedProducts(keywords: string[]): Promise<any[]> {
  try {
    const res = await backend.getProducts({ pageSize: 40 });
    const matching = res.products.filter((p) => {
      const pName = p.name.toLowerCase();
      const pTags = (p.tags || []).join(' ').toLowerCase();
      return keywords.some((k) => pName.includes(k) || pTags.includes(k));
    });

    const list = matching.length > 0 ? matching.slice(0, 6) : res.products.slice(0, 6);
    return list.map(adaptProduct);
  } catch {
    return [];
  }
}

// Generate contextual follow-up suggestions so user is always encouraged to ask more
function generateFollowUpSuggestions(query: string, existing: string[] = []): string[] {
  const suggestions = [...existing];

  if (query.includes('money')) {
    suggestions.push('Care for Money plant', 'Can Money plant grow in water?', 'which plant is best for seasons');
  } else if (query.includes('snake')) {
    suggestions.push('Care for Snake plant', 'How often to water Snake plant?', 'Best bedroom plants');
  } else if (query.includes('peace')) {
    suggestions.push('Care for Peace Lily', 'Why is my Peace Lily drooping?', 'Air purifying plants');
  } else if (query.includes('summer')) {
    suggestions.push('for winter', 'for rainy', 'Summer watering guide', 'Care for Jade plant');
  } else if (query.includes('winter')) {
    suggestions.push('for summer', 'for rainy', 'Care for ZZ plant', 'Low light plants');
  } else if (query.includes('season')) {
    suggestions.push('for summer', 'for rainy', 'for winter', 'Plant Care Tips');
  } else {
    suggestions.push('which plant is best for seasons', 'Plant Care Tips', 'Browse all products');
  }

  // Deduplicate and return top 4
  return Array.from(new Set(suggestions.filter(Boolean))).slice(0, 4);
}

import fs from 'node:fs';
import path from 'node:path';
import { AppError } from '../errors.ts';

export interface ChatAction {
  type: 'show_products' | 'navigate' | 'open_map' | 'show_quote' | 'show_order' | 'add_to_cart';
  payload?: Record<string, any>;
}

export interface ChatResponse {
  intent: string;
  reply: string;
  action?: ChatAction;
  suggestions?: string[];
}

export interface ChatMessageContext {
  customerId?: number;
  city?: string;
}

interface FaqItem {
  id: string;
  category: string;
  keywords: string[];
  question: string;
  answer: string;
}

const ALLOWED_NAVIGATE_ROUTES = new Set([
  'home',
  'shop',
  'cart',
  'checkout',
  'orders',
  'account',
  'login',
  'map',
  'help',
]);

// Load FAQ data
let faqDatabase: FaqItem[] = [];
try {
  const faqPath = path.resolve(process.cwd(), 'data/faq.json');
  if (fs.existsSync(faqPath)) {
    faqDatabase = JSON.parse(fs.readFileSync(faqPath, 'utf8'));
  }
} catch {
  faqDatabase = [];
}

interface CareItem {
  common_name: string;
  scientific_name: string;
  aliases: string[];
  light: string;
  water: string;
  soil: string;
  pet_friendly: boolean;
  verified: boolean;
  tips: string;
}

// Load Plant Care database
let careDatabase: CareItem[] = [];
try {
  const carePath = path.resolve(process.cwd(), 'data/care.json');
  if (fs.existsSync(carePath)) {
    careDatabase = JSON.parse(fs.readFileSync(carePath, 'utf8'));
  }
} catch {
  careDatabase = [];
}

export async function processChatMessage(
  message: string,
  context: ChatMessageContext = {}
): Promise<ChatResponse> {
  const text = (message || '').trim();
  if (!text) {
    throw new AppError(422, 'EMPTY_MESSAGE', 'Message cannot be empty');
  }
  if (text.length > 500) {
    throw new AppError(422, 'MESSAGE_TOO_LONG', 'Message cannot exceed 500 characters');
  }

  const lower = text.toLowerCase();

  // 1. GREETING
  if (/^(hi|hello|hey|namaste|good\s*(morning|afternoon|evening)|hola|sup)\b/i.test(lower)) {
    return {
      intent: 'GREETING',
      reply: `Hello! Welcome to StockSure. I can help you search provisions, check stock across our neighborhood branches, calculate instant delivery, or track an active order. How can I help you today?`,
      suggestions: ['Browse all products', 'Delivery charges', 'Store locations', 'Track my order'],
    };
  }

  // 2. HUMAN HANDOFF
  if (/\b(human|agent|representative|call|support|care@stocksure|phone number|customer care|speak to someone)\b/i.test(lower)) {
    return {
      intent: 'HUMAN_HANDOFF',
      reply: `Our customer support team is available daily from 7:00 AM to 11:00 PM IST. You can email us directly at care@stocksure.in or call our hotline at 1800-STOCKSURE (1800-786-2578). An agent will also be alerted to this chat.`,
      suggestions: ['Email support', 'Return to shop', 'Track active order'],
    };
  }

  // 3. ORDER STATUS / TRACKING
  if (/\b(track|order status|where is (my\s+)?order|delivery status|my order|dispatch)\b/i.test(lower) || /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(lower)) {
    // Check if an order UUID is mentioned
    const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuidMatch) {
      return {
        intent: 'ORDER_STATUS',
        reply: `Here is the live tracking status for order ${uuidMatch[0]}. Handover verification code will be displayed when out for delivery.`,
        action: {
          type: 'show_order',
          payload: { order_id: uuidMatch[0] },
        },
        suggestions: ['View full tracking', 'Report an issue'],
      };
    }

    return {
      intent: 'ORDER_STATUS',
      reply: `You can check real-time status and live rider location on your Orders page. Would you like to view your order history?`,
      action: {
        type: 'navigate',
        payload: { route: 'orders' },
      },
      suggestions: ['Go to Orders', 'Report an issue', 'Contact support'],
    };
  }

  // 4. CART SUMMARY / CHECKOUT
  if (/\b(my cart|view cart|open cart|show cart|checkout|pay now)\b/i.test(lower)) {
    const isCheckout = /\b(checkout|pay now)\b/i.test(lower);
    return {
      intent: 'CART_SUMMARY',
      reply: isCheckout
        ? `Proceeding to checkout. You can select Store Pickup or Express Delivery.`
        : `Opening your shopping cart to review selected items.`,
      action: {
        type: 'navigate',
        payload: { route: isCheckout ? 'checkout' : 'cart' },
      },
      suggestions: ['Continue shopping', 'View cart'],
    };
  }

  // 5. NEAREST BRANCH / MAP
  if (/\b(branch|store|location|near me|nearest|where are you|map|nursery|address)\b/i.test(lower)) {
    return {
      intent: 'NEAREST_BRANCH',
      reply: `We have flagship branches across Bengaluru, Mumbai, Delhi, Ahmedabad, Kolkata, and Pune equipped with live inventory and instant fulfillment counters.`,
      action: {
        type: 'open_map',
        payload: { city: context.city || 'Bengaluru' },
      },
      suggestions: ['View branch map', 'Store pickup timings', 'Check delivery radius'],
    };
  }

  // 6. DELIVERY QUOTE
  if (/\b(delivery fee|shipping charge|delivery cost|delivery charges|delivery quote|free shipping|free delivery)\b/i.test(lower)) {
    return {
      intent: 'DELIVERY_QUOTE',
      reply: `Delivery is 100% FREE on all orders of ₹999 or more! For smaller orders within our 25km radius, delivery is ₹49 base + ₹15/km.`,
      action: {
        type: 'show_quote',
        payload: {},
      },
      suggestions: ['Free delivery items', 'Store locations', 'Browse shop'],
    };
  }

  // 7. NAVIGATE SHORTCUTS
  for (const route of ALLOWED_NAVIGATE_ROUTES) {
    if (new RegExp(`\\b(go to|open|take me to|show)\\s+${route}\\b`, 'i').test(lower)) {
      return {
        intent: 'NAVIGATE',
        reply: `Navigating to ${route}.`,
        action: {
          type: 'navigate',
          payload: { route },
        },
      };
    }
  }

  // 8. FAQ MATCHING
  for (const item of faqDatabase) {
    const matched = item.keywords.some((k) => lower.includes(k));
    if (matched) {
      return {
        intent: 'HELP_FAQ',
        reply: item.answer,
        suggestions: ['Browse shop', 'Contact human agent', 'Delivery timings'],
      };
    }
  }

  // 8b. PLANT CARE TIPS (curated from care.json only)
  if (/\b(care tips?|how to care|care for|watering|plant care)\b/i.test(lower)) {
    const matched = careDatabase.find((c) =>
      c.aliases.some((a) => lower.includes(a)) || lower.includes(c.common_name.toLowerCase())
    );

    if (matched) {
      const guidancePrefix = matched.verified ? '' : ' (General Guidance)';
      const reply = `🌿 Care Guide for ${matched.common_name} (${matched.scientific_name})${guidancePrefix}:\n• Light: ${matched.light}\n• Water: ${matched.water}\n• Soil: ${matched.soil}\n• Pet-Safe: ${matched.pet_friendly ? 'Yes (Non-toxic)' : 'No (Toxic to pets)'}\n• Tip: ${matched.tips}`;
      return {
        intent: 'CARE_TIPS',
        reply,
        suggestions: ['Buy ' + matched.common_name, 'Other Plant Care', 'Store Locations'],
      };
    }

    return {
      intent: 'CARE_TIPS',
      reply: `We do not have curated care notes for that plant yet. Our resident horticulturists can provide customized advice! Would you like to speak to an agent?`,
      suggestions: ['Contact human agent', 'Browse popular indoor plants', 'Delivery charges'],
    };
  }

  // 9. PRODUCT SEARCH / AVAILABILITY
  if (/\b(find|search|buy|looking for|have|available|stock|show me|price of|catalogue|plant|grocery|electronics)\b/i.test(lower)) {
    const cleanQuery = lower
      .replace(/\b(find|search|buy|looking for|do you have|is there|show me|any|products?|items?|price of)\b/gi, '')
      .trim();

    const q = cleanQuery.length > 0 ? cleanQuery : lower;

    return {
      intent: 'FIND_PLANT',
      reply: `Searching our real-time catalogue for "${q}". Here are the matching verified items:`,
      action: {
        type: 'show_products',
        payload: { query: q },
      },
      suggestions: ['Filter in-stock only', 'Sort by price', 'View cart'],
    };
  }

  // 10. UNKNOWN FALLBACK
  return {
    intent: 'UNKNOWN',
    reply: `I'm not quite sure about that. I can help you search for essentials, check local store availability, estimate delivery costs, or track an existing order. What would you like to do?`,
    suggestions: ['Browse all products', 'Delivery charges', 'Store locations', 'Contact support'],
  };
}

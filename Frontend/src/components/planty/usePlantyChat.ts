'use client';

import { useState, useEffect, useCallback } from 'react';
import { backend, adaptProduct, formatImageUrl, Product } from '@/lib/backend';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { ROUTE_MAP, executeNavigation } from './actions';
import { processBotanicalQuery } from './botanicalBrain';

const GREETING_TEXT =
  'Hello! 🌿 Ask me anything about our plants, care tips, or orders!';

const STORAGE_KEY = 'planty_chat_history_v2';
const TEASER_SEEN_KEY = 'planty_teaser_seen_v2';

export function usePlantyChat() {
  const { user } = useAuth();
  const { selectedBranch, selectedBranchId, addToCart, setIsCartOpen, setIsCheckoutOpen } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [isTeaserVisible, setIsTeaserVisible] = useState(false);
  const [messages, setMessages] = useState<any[]>(() => {
    return [{ id: 'init-greeting', sender: 'bot', text: GREETING_TEXT, timestamp: Date.now() }];
  });

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Authenticated vs Non-Signed In User Chat Memory Management:
  // Non-signed in user chats MUST NOT be saved and MUST be deleted when opening/interacting with chatbot
  useEffect(() => {
    if (!user || user.is_guest) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      setMessages([{ id: 'init-greeting', sender: 'bot', text: GREETING_TEXT, timestamp: Date.now() }]);
    } else {
      try {
        const userStorageKey = `${STORAGE_KEY}_${user.id}`;
        const saved = sessionStorage.getItem(userStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed.slice(-30));
            return;
          }
        }
      } catch {
        // ignore
      }
    }
  }, [user]);

  // Sync to sessionStorage ONLY if user is authenticated; wipe if non-signed in
  useEffect(() => {
    if (user && !user.is_guest) {
      try {
        const userStorageKey = `${STORAGE_KEY}_${user.id}`;
        sessionStorage.setItem(userStorageKey, JSON.stringify(messages.slice(-30)));
      } catch {
        // ignore
      }
    } else {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, [messages, user]);

  // Teaser timing: trigger after 4s
  useEffect(() => {
    const seen = sessionStorage.getItem(TEASER_SEEN_KEY);
    if (!seen) {
      const showTimer = setTimeout(() => {
        setIsTeaserVisible(true);
      }, 4000);

      const hideTimer = setTimeout(() => {
        setIsTeaserVisible(false);
        sessionStorage.setItem(TEASER_SEEN_KEY, 'true');
      }, 12000);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  const dismissTeaser = useCallback(() => {
    setIsTeaserVisible(false);
    sessionStorage.setItem(TEASER_SEEN_KEY, 'true');
  }, []);

  const openChat = useCallback(() => {
    // If not signed in, ensure any previous/cached chats are deleted and reset
    if (!user || user.is_guest) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      setMessages([{ id: 'init-greeting', sender: 'bot', text: GREETING_TEXT, timestamp: Date.now() }]);
    }

    setIsOpen(true);
    setHasUnread(false);
    dismissTeaser();
  }, [dismissTeaser, user]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    if (isOpen) closeChat();
    else openChat();
  }, [isOpen, openChat, closeChat]);

  // Main Send Message Logic
  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = (rawText || '').trim();
      if (!text || isTyping) return;

      setInputValue('');

      const userMsg = {
        id: `u-${Date.now()}`,
        sender: 'user',
        text,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      const backupInput = text;

      try {
        const rawBackendData = await backend
          .sendChatMessage(text, { city: selectedBranch?.city || 'Bengaluru' })
          .catch(() => ({}));

        // Pass through botanical intelligence engine
        const brainResult = await processBotanicalQuery(
          text,
          rawBackendData,
          selectedBranch?.name || 'Koramangala',
          selectedBranch?.city || 'Bengaluru'
        );

        let botText = brainResult.reply;
        const actionPayload: Record<string, any> = {};

        if (brainResult.products && brainResult.products.length > 0) {
          actionPayload.products = brainResult.products;
        }

        const action = brainResult.action || (rawBackendData as any)?.action;
        if (action) {
          const { type, payload } = action;

          if (type === 'show_products' && !actionPayload.products) {
            let prods: any[] = payload?.products || [];
            if ((!prods || prods.length === 0) && (payload?.query || text)) {
              try {
                const searchQ = payload?.query || text;
                const searchRes = await backend.searchProducts({ q: searchQ, city: selectedBranch?.city });
                if (searchRes.results && searchRes.results.length > 0) {
                  prods = searchRes.results.map((r: any) => ({
                    id: r.product_id || r.id,
                    product_id: r.product_id || r.id,
                    name: r.name,
                    price_paise: r.price_paise,
                    image_url: formatImageUrl(r.image_url, r.name),
                    category: r.category,
                  }));
                } else {
                  const catalogRes = await backend.getProducts({ pageSize: 6 });
                  prods = catalogRes.products.map(adaptProduct);
                }
              } catch {
                prods = [];
              }
            }
            actionPayload.products = prods.slice(0, 6);
          } else if (type === 'navigate' && payload?.route) {
            const isAllowed = Boolean(ROUTE_MAP[payload.route]);
            if (isAllowed) {
              const target = ROUTE_MAP[payload.route];
              actionPayload.navigatingTo = `Taking you to ${target.label}...`;
              executeNavigation(payload.route, { setIsCartOpen, setIsCheckoutOpen });
            }
          } else if (type === 'open_map') {
            actionPayload.navigatingTo = 'Opening branch locator...';
            executeNavigation('map', { setIsCartOpen, setIsCheckoutOpen });
          } else if (type === 'show_quote') {
            try {
              const q = await backend.getDeliveryQuote(selectedBranch.lat || 12.9352, selectedBranch.lng || 77.6245, 99900);
              actionPayload.quote = q;
            } catch {
              actionPayload.quote = { fee_paise: 0, distance_km: 4.2, eta_minutes: 30, branch_name: selectedBranch.name };
            }
          } else if (type === 'show_order' && payload?.order_id) {
            actionPayload.orderId = payload.order_id;
          } else if (type === 'add_to_cart' && payload) {
            actionPayload.confirmAdd = payload;
          }
        }

        // Set rich contextual follow-up suggestions so the user always has prompts to ask more!
        setSuggestions(brainResult.suggestions);

        const botMsg = {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: botText,
          ...actionPayload,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, botMsg]);
        if (!isOpen) {
          setHasUnread(true);
        }
      } catch (err: any) {
        setInputValue(backupInput);
        const errMsg = {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: err.message || 'I encountered an issue processing that. Please try again.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, selectedBranch, isOpen, setIsCartOpen, setIsCheckoutOpen]
  );

  const confirmAddToCart = useCallback(
    async (item: any) => {
      if (!item) return;
      const targetProduct: Product = {
        id: String(item.product_id || item.id),
        productId: Number(item.product_id || item.id),
        name: item.name || 'Botanical Specimen',
        scientificName: 'Organic specimen',
        category: 'indoor-plants',
        categoryLabel: 'Indoor Plant',
        price: item.price_paise ? Math.round(item.price_paise / 100) : item.price || 249,
        price_paise: item.price_paise || (item.price ? item.price * 100 : 24900),
        rating: 4.8,
        reviewsCount: 30,
        stock: 20,
        description: `${item.name} from StockSure nursery.`,
        features: ['Peat-Free Substrate'],
        dimensions: '4" Pot',
        light: 'Low to Bright Indirect',
        water: 'Weekly',
        petFriendly: true,
        difficulty: 'Easy',
        imageUrl: item.image_url || '/products/snake-plant.jpg',
      };

      addToCart(targetProduct, item.qty || 1);
      setIsCartOpen(true);

      setMessages((prev) =>
        prev.map((m) =>
          m.confirmAdd === item
            ? { ...m, confirmAdd: null, text: `${m.text}\n✓ Added ${item.name} to your cart!` }
            : m
        )
      );
    },
    [addToCart, setIsCartOpen]
  );

  const cancelAddToCart = useCallback(() => {
    setMessages((prev) =>
      prev.map((m) => (m.confirmAdd ? { ...m, confirmAdd: null } : m))
    );
  }, []);

  const promptAddToCart = useCallback((product: any) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `conf-${Date.now()}`,
        sender: 'bot',
        text: `Would you like to add ${product.name} to your cart?`,
        confirmAdd: {
          product_id: product.id || product.product_id,
          name: product.name,
          price_paise: product.price_paise,
          price_rupees: product.price,
          qty: 1,
        },
        timestamp: Date.now(),
      },
    ]);
  }, []);

  return {
    isOpen,
    isTeaserVisible,
    messages,
    inputValue,
    setInputValue,
    isTyping,
    hasUnread,
    suggestions,
    viewingProduct,
    setViewingProduct,
    openChat,
    closeChat,
    toggleChat,
    dismissTeaser,
    sendMessage,
    confirmAddToCart,
    cancelAddToCart,
    promptAddToCart,
  };
}

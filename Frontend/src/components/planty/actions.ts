export const ROUTE_MAP: Record<string, { hash: string; label: string; type: 'hash' | 'action'; actionKey?: string }> = {
  home: {
    hash: '',
    label: 'Storefront Entrance',
    type: 'hash',
  },
  shop: {
    hash: '#shop',
    label: 'Botanical Catalogue',
    type: 'hash',
  },
  cart: {
    hash: '#shop',
    label: 'Shopping Cart',
    type: 'action',
    actionKey: 'open_cart',
  },
  checkout: {
    hash: '#shop',
    label: 'Express Checkout',
    type: 'action',
    actionKey: 'open_checkout',
  },
  orders: {
    hash: '#shop',
    label: 'Order Tracking',
    type: 'hash',
  },
  account: {
    hash: '#shop',
    label: 'Customer Account',
    type: 'hash',
  },
  login: {
    hash: '#shop',
    label: 'Sign In',
    type: 'hash',
  },
  map: {
    hash: '#branches',
    label: 'Neighborhood Branches Map',
    type: 'hash',
  },
  help: {
    hash: '#contact',
    label: 'Customer Support & Advisory',
    type: 'hash',
  },
};

export function executeNavigation(route: string, context: { setIsCartOpen?: (open: boolean) => void; setIsCheckoutOpen?: (open: boolean) => void } = {}) {
  const target = ROUTE_MAP[route];
  if (!target) return false;

  setTimeout(() => {
    if (typeof window === 'undefined') return;
    if (target.type === 'hash') {
      window.location.hash = target.hash;
    } else if (target.type === 'action') {
      if (target.actionKey === 'open_cart' && context.setIsCartOpen) {
        context.setIsCartOpen(true);
      } else if (target.actionKey === 'open_checkout' && context.setIsCheckoutOpen) {
        context.setIsCheckoutOpen(true);
      }
    }
  }, 400);

  return true;
}

export function formatPaiseToInr(paise: number = 0): string {
  const rupees = Math.round(Number(paise || 0) / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

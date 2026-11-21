import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../utils/audio';
import { ShoppingCart, Compass } from 'lucide-react';
import { PRODUCTS } from '../data/products';
import FindProductCard from './FindProductCard';
import ProductDetailsCard from './ProductDetailsCard';
import CheckoutCard from './CheckoutCard';
import ThankYouCard from './ThankYouCard';
import AboutPage from './AboutPage';
import ScrollCinematicArrival from './ScrollCinematicArrival';

// FLOW STAGES:
// 1. 'SCROLL_CINEMATIC' - Scroll-scrubbed arrival: drone -> enterior -> interior (user scroll controls video timeline, NO autoplay!)
// 2. 'INTERIOR'         - Living supermarket interior loops during shopping
// 3. 'FIND_PRODUCT'     - Visual FindProductCard visible over living supermarket interior
// 4. 'TROLLEY_PUSH'     - Trimmed trolley_push.mp4 plays through aisle to shelf
// 5. 'PRODUCT_DETAILS'  - ProductDetailsCard visible at shelf; "Find Another Product" reopens search without video
// 6. 'CHECKOUT_VIDEO'   - Checkout.mp4 plays billing counter arrival
// 7. 'CHECKOUT_CARD'    - CheckoutCard visible with all cart items and totals
// 8. 'THANK_YOU'        - ThankYouCard visible with Continue Shopping & Know Us More
// 9. 'ABOUT'            - Full-page AboutPage (Premium light theme, sections A-F)

// Trimmed trolley push timing
const PUSH_TRIM_START = 1.1;  // Forward glide down central aisle
const PUSH_TRIM_END = 5.7;    // Halts facing grocery shelves

export default function EntranceFlow({
  trolleyItems,
  setTrolleyItems,
  onUpdateQuantity,
  onRemoveItem,
  checkoutTriggered,
}) {
  const [stage, setStage] = useState('SCROLL_CINEMATIC');
  const [showEntranceChoices, setShowEntranceChoices] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [aboutReturnTarget, setAboutReturnTarget] = useState('CINEMATIC');

  // Video element references
  const droneRef = useRef(null);
  const enteriorRef = useRef(null);
  const interiorRef = useRef(null);
  const trolleyPickupRef = useRef(null);
  const trolleyPushRef = useRef(null);
  const checkoutVidRef = useRef(null);

  // Synchronous locks to prevent duplicate clicks
  const enterLockedRef = useRef(false);
  const trolleyLockedRef = useRef(false);
  const findProductLockedRef = useRef(false);
  const checkoutLockedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // STEP 1: Autoplay DRONE video & Preload all assets
  // Enhanced speed: 1.32x playback for a faster, engaging, cinematic arrival
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const droneVid = droneRef.current;
    if (droneVid) {
      droneVid.currentTime = 0.4;
      droneVid.playbackRate = 1.32;
      droneVid.play().catch((err) => {
        console.warn('Drone autoplay notice:', err);
      });
    }

    // Preload all assets in background
    if (enteriorRef.current) enteriorRef.current.load();
    if (trolleyPickupRef.current) trolleyPickupRef.current.load();
    if (interiorRef.current) interiorRef.current.load();
    if (trolleyPushRef.current) trolleyPushRef.current.load();
    if (checkoutVidRef.current) checkoutVidRef.current.load();
  }, []);

  // Drone ended -> freeze and show PRESS TO ENTER
  const handleDroneEnded = () => {
    if (stage !== 'DRONE') return;
    const droneVid = droneRef.current;
    if (droneVid) droneVid.pause();
    enterLockedRef.current = false;
    setStage('WAITING_FOR_ENTER');
  };

  const handleDroneTimeUpdate = () => {
    const droneVid = droneRef.current;
    if (!droneVid) return;
    if (
      stage === 'DRONE' &&
      droneVid.duration > 0 &&
      droneVid.currentTime >= droneVid.duration - 0.08
    ) {
      droneVid.pause();
      enterLockedRef.current = false;
      setStage('WAITING_FOR_ENTER');
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 2: ONE ENTER CLICK -> ENTERIOR
  // ---------------------------------------------------------------------------
  const handleSingleEnterClick = () => {
    if (enterLockedRef.current || stage !== 'WAITING_FOR_ENTER') return;
    enterLockedRef.current = true;

    sound.playChime();
    sound.playDoorSlide();

    setStage('ENTERIOR');
    const enteriorVid = enteriorRef.current;
    if (enteriorVid) {
      enteriorVid.currentTime = 0;
      enteriorVid.play().catch(console.warn);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (stage === 'WAITING_FOR_ENTER') {
          e.preventDefault();
          handleSingleEnterClick();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage]);

  // When enterior completes -> show Explore Store & Pick Up Trolley options
  const handleEnteriorEnded = () => {
    if (stage !== 'ENTERIOR') return;
    const enteriorVid = enteriorRef.current;
    if (enteriorVid) enteriorVid.pause();
    setShowEntranceChoices(true);
  };

  const handleEnteriorTimeUpdate = () => {
    const enteriorVid = enteriorRef.current;
    if (!enteriorVid) return;
    if (
      stage === 'ENTERIOR' &&
      enteriorVid.duration > 0 &&
      enteriorVid.currentTime >= enteriorVid.duration - 0.08
    ) {
      handleEnteriorEnded();
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 3: PICK UP TROLLEY (or Explore Store)
  // (interior must NOT play before trolley pickup finishes!)
  // ---------------------------------------------------------------------------
  const handlePickUpTrolley = (e) => {
    if (e) e.stopPropagation();
    if (trolleyLockedRef.current) return;
    trolleyLockedRef.current = true;

    setShowEntranceChoices(false);
    sound.playChime();

    // 1. Immediately pause enterior video
    const enteriorVid = enteriorRef.current;
    if (enteriorVid) enteriorVid.pause();

    // 2. Play trolley pickup video (interior is strictly NOT started yet)
    setStage('TROLLEY_PICKUP');
    const trolleyVid = trolleyPickupRef.current;
    if (trolleyVid) {
      trolleyVid.currentTime = 0;
      trolleyVid.play().catch(console.warn);
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 3B: EXPLORE STORE -> OPENS ABOUT STOCKSURE PAGE (NOT MODAL)
  // ---------------------------------------------------------------------------
  const handleExploreStore = (e) => {
    if (e) e.stopPropagation();
    sound.playChime();

    const enteriorVid = enteriorRef.current;
    if (enteriorVid) enteriorVid.pause();

    setAboutReturnTarget('ENTERIOR');
    setStage('ABOUT');
  };

  // ---------------------------------------------------------------------------
  // STEP 1: SCROLL-DRIVEN CINEMATIC ARRIVAL HANDLERS
  // ---------------------------------------------------------------------------
  const handleCinematicComplete = () => {
    sound.playChime();
    findProductLockedRef.current = false;

    // Start interior video looping as primary living supermarket background
    const interiorVid = interiorRef.current;
    if (interiorVid) {
      interiorVid.currentTime = 0;
      interiorVid.play().catch(console.warn);
    }
    setStage('FIND_PRODUCT');
  };

  const handleExploreStoreFromCinematic = () => {
    sound.playChime();
    setAboutReturnTarget('CINEMATIC');
    setStage('ABOUT');
  };

  // Navigates directly from About Page into the 3D Supermarket Interior
  // Does NOT replay drone, entrance, or trolley pickup; preserves cart!
  const handleVisitStoreFromAbout = () => {
    sound.playChime();
    findProductLockedRef.current = false;

    // Start or resume interior video smoothly as primary living background
    const interiorVid = interiorRef.current;
    if (interiorVid) {
      if (interiorVid.paused) {
        interiorVid.currentTime = 0;
        interiorVid.play().catch(console.warn);
      }
    }
    // Directly ready to discover and shop
    setStage('FIND_PRODUCT');
  };

  // Return to previous screen from About Page
  const handleBackFromAbout = () => {
    sound.playChime();
    if (aboutReturnTarget === 'THANK_YOU') {
      setStage('THANK_YOU');
    } else {
      setStage('SCROLL_CINEMATIC');
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 4: TROLLEY PICKUP ENDS -> TRANSITION TO INTERIOR
  // (interior starts automatically and loops continuously during shopping)
  // ---------------------------------------------------------------------------
  const handleTrolleyPickupEnded = () => {
    const trolleyVid = trolleyPickupRef.current;
    if (trolleyVid) trolleyVid.pause();

    // Start interior video smoothly as primary living supermarket background
    const interiorVid = interiorRef.current;
    if (interiorVid) {
      interiorVid.currentTime = 0;
      interiorVid.play().catch(console.warn);
    }

    findProductLockedRef.current = false;
    // Reveal product search card
    setStage('FIND_PRODUCT');
  };

  const handleTrolleyPickupTimeUpdate = () => {
    const trolleyVid = trolleyPickupRef.current;
    if (!trolleyVid) return;
    if (
      stage === 'TROLLEY_PICKUP' &&
      trolleyVid.duration > 0 &&
      trolleyVid.currentTime >= trolleyVid.duration - 0.08
    ) {
      handleTrolleyPickupEnded();
    }
  };

  // Continuous background loop for interior video
  const handleInteriorEnded = () => {
    const interiorVid = interiorRef.current;
    if (interiorVid) {
      interiorVid.currentTime = 0;
      interiorVid.play().catch(() => {});
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 5: FIND PRODUCT CLICK -> TRIMMED TROLLEY PUSH VIDEO
  // ---------------------------------------------------------------------------
  const handleStartFindProductPush = () => {
    if (findProductLockedRef.current || stage !== 'FIND_PRODUCT') return;
    findProductLockedRef.current = true;

    sound.playChime();

    // Smoothly start trimmed trolley push video toward shelf
    const pushVid = trolleyPushRef.current;
    if (pushVid) {
      pushVid.currentTime = PUSH_TRIM_START;
      pushVid.play().catch(console.warn);
    }
    setStage('TROLLEY_PUSH');
  };

  // ---------------------------------------------------------------------------
  // STEP 6: TROLLEY PUSH ENDS -> REVEAL PRODUCT DETAILS CARD
  // ---------------------------------------------------------------------------
  const handleTrolleyPushEnded = () => {
    const pushVid = trolleyPushRef.current;
    if (pushVid) pushVid.pause();
    setStage('PRODUCT_DETAILS');
  };

  const handleTrolleyPushTimeUpdate = () => {
    const pushVid = trolleyPushRef.current;
    if (!pushVid) return;

    if (stage === 'TROLLEY_PUSH') {
      if (
        pushVid.currentTime >= PUSH_TRIM_END ||
        (pushVid.duration > 0 && pushVid.currentTime >= pushVid.duration - 0.1)
      ) {
        handleTrolleyPushEnded();
      }
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 7: ADD TO TROLLEY ACTION
  // ---------------------------------------------------------------------------
  const handleAddToCart = (product, quantity) => {
    sound.playChime();
    setTrolleyItems((prevItems) => {
      const existingIdx = prevItems.findIndex((item) => item.product.id === product.id);
      if (existingIdx >= 0) {
        const updated = [...prevItems];
        updated[existingIdx].quantity += quantity;
        return updated;
      }
      return [...prevItems, { product, quantity }];
    });
  };

  // ---------------------------------------------------------------------------
  // STEP 8: FIND ANOTHER PRODUCT (REOPENS SEARCH WITHOUT PLAYING VIDEO!)
  // ---------------------------------------------------------------------------
  const handleFindAnotherProduct = () => {
    sound.playDoorSlide();
    findProductLockedRef.current = false;
    // Reopen Find Product search card immediately; no video replay; cart preserved!
    setStage('FIND_PRODUCT');
  };

  // ---------------------------------------------------------------------------
  // STEP 9: BUY NOW CLICKED -> PLAY CHECKOUT VIDEO (BILLING COUNTER)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (checkoutTriggered > 0) {
      handleStartCheckoutVideo();
    }
  }, [checkoutTriggered]);

  const handleStartCheckoutVideo = () => {
    if (checkoutLockedRef.current) return;
    checkoutLockedRef.current = true;

    // Pause any other active video
    if (interiorRef.current) interiorRef.current.pause();
    if (trolleyPushRef.current) trolleyPushRef.current.pause();

    sound.playChime();
    setStage('CHECKOUT_VIDEO');

    const checkVid = checkoutVidRef.current;
    if (checkVid) {
      checkVid.currentTime = 0;
      checkVid.play().catch(console.warn);
    }
  };

  const handleCheckoutVideoEnded = () => {
    const checkVid = checkoutVidRef.current;
    if (checkVid) checkVid.pause();
    checkoutLockedRef.current = false;
    // Smoothly reveal Checkout Card at the counter!
    setStage('CHECKOUT_CARD');
  };

  const handleCheckoutVideoTimeUpdate = () => {
    const checkVid = checkoutVidRef.current;
    if (!checkVid) return;
    if (
      stage === 'CHECKOUT_VIDEO' &&
      checkVid.duration > 0 &&
      checkVid.currentTime >= checkVid.duration - 0.08
    ) {
      handleCheckoutVideoEnded();
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 10: CHECKOUT CARD ACTIONS (Continue Shopping / Complete Shopping)
  // ---------------------------------------------------------------------------
  const handleContinueShoppingFromCheckout = () => {
    sound.playChime();
    findProductLockedRef.current = false;

    // Return to supermarket interior without losing cart or replaying entrance
    const interiorVid = interiorRef.current;
    if (interiorVid) {
      interiorVid.play().catch(() => {});
    }
    setStage('FIND_PRODUCT');
  };

  const handleCompleteShopping = () => {
    sound.playChime();
    setStage('THANK_YOU');
  };

  const handleContinueShoppingFromThankYou = () => {
    sound.playChime();
    findProductLockedRef.current = false;

    // Return to supermarket interior; preserves cart
    const interiorVid = interiorRef.current;
    if (interiorVid) {
      interiorVid.play().catch(() => {});
    }
    setStage('FIND_PRODUCT');
  };

  // ---------------------------------------------------------------------------
  // SCENE VIEW: SCROLL-DRIVEN CINEMATIC ARRIVAL
  // User scroll controls the video timeline. Video does NOT autoplay.
  // ---------------------------------------------------------------------------
  if (stage === 'SCROLL_CINEMATIC') {
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
        <ScrollCinematicArrival
          onComplete={handleCinematicComplete}
          onExploreStore={handleExploreStoreFromCinematic}
        />
      </div>
    );
  }

  return (
    <div
      onClick={stage === 'WAITING_FOR_ENTER' ? handleSingleEnterClick : undefined}
      className="relative w-screen h-screen overflow-hidden bg-black select-none cursor-default flex items-center justify-center"
    >
      {/* =======================================================================
          VIDEO 1: DRONE (drone.mp4)
          ======================================================================= */}
      <div
        className="absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-900 ease-in-out"
        style={{
          opacity: stage === 'DRONE' || stage === 'WAITING_FOR_ENTER' ? 1 : 0,
          zIndex: stage === 'DRONE' || stage === 'WAITING_FOR_ENTER' ? 20 : 5,
          pointerEvents: stage === 'WAITING_FOR_ENTER' ? 'auto' : 'none',
        }}
      >
        <video
          ref={droneRef}
          src="/videos/drone.mp4"
          preload="auto"
          muted
          playsInline
          onEnded={handleDroneEnded}
          onTimeUpdate={handleDroneTimeUpdate}
          className="w-full h-full object-contain"
        />
      </div>

      {/* =======================================================================
          VIDEO 2: ENTERIOR (enterior.mp4)
          ======================================================================= */}
      <div
        className="absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-900 ease-in-out"
        style={{
          opacity: stage === 'ENTERIOR' ? 1 : 0,
          zIndex: stage === 'ENTERIOR' ? 20 : 5,
          pointerEvents: 'none',
        }}
      >
        <video
          ref={enteriorRef}
          src="/videos/enterior.mp4"
          preload="auto"
          muted
          playsInline
          onEnded={handleEnteriorEnded}
          onTimeUpdate={handleEnteriorTimeUpdate}
          className="w-full h-full object-contain"
        />
      </div>

      {/* =======================================================================
          VIDEO 3: TROLLEY PICK UP (trolley pick up.mp4)
          Plays after Pick Up Trolley; interior does NOT play yet!
          ======================================================================= */}
      <div
        className="absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-900 ease-in-out"
        style={{
          opacity: stage === 'TROLLEY_PICKUP' ? 1 : 0,
          zIndex: stage === 'TROLLEY_PICKUP' ? 25 : 5,
          pointerEvents: 'none',
        }}
      >
        <video
          ref={trolleyPickupRef}
          src="/videos/trolley%20pick%20up.mp4"
          preload="auto"
          muted
          playsInline
          onEnded={handleTrolleyPickupEnded}
          onTimeUpdate={handleTrolleyPickupTimeUpdate}
          className="w-full h-full object-contain"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/15 pointer-events-none" />
      </div>

      {/* =======================================================================
          VIDEO 4: INTERIOR (interior.mp4)
          Starts ONLY after trolley pickup finishes; loops continuously during shopping
          ======================================================================= */}
      <div
        className="absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-1000 ease-in-out"
        style={{
          opacity:
            stage === 'FIND_PRODUCT' ||
            stage === 'TROLLEY_PUSH' ||
            stage === 'PRODUCT_DETAILS'
              ? 1
              : 0,
          zIndex:
            stage === 'FIND_PRODUCT' ||
            stage === 'TROLLEY_PUSH' ||
            stage === 'PRODUCT_DETAILS'
              ? 10
              : 5,
          pointerEvents: 'none',
        }}
      >
        <video
          ref={interiorRef}
          src="/videos/interior.mp4"
          preload="auto"
          muted
          playsInline
          onEnded={handleInteriorEnded}
          className="w-full h-full object-contain"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
      </div>

      {/* =======================================================================
          VIDEO 5: TROLLEY PUSH (trolley_push.mp4)
          Trimmed clip through supermarket aisle. Holds final frame upon completion.
          ======================================================================= */}
      <div
        className="absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-900 ease-in-out"
        style={{
          opacity:
            stage === 'TROLLEY_PUSH' || stage === 'PRODUCT_DETAILS'
              ? 1
              : 0,
          zIndex:
            stage === 'TROLLEY_PUSH' || stage === 'PRODUCT_DETAILS'
              ? 28
              : 5,
          pointerEvents: 'none',
        }}
      >
        <video
          ref={trolleyPushRef}
          src="/videos/trolley_push.mp4"
          preload="auto"
          muted
          playsInline
          onEnded={handleTrolleyPushEnded}
          onTimeUpdate={handleTrolleyPushTimeUpdate}
          className="w-full h-full object-contain"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
      </div>

      {/* =======================================================================
          VIDEO 6: CHECKOUT COUNTER (checkout.mp4)
          Plays upon clicking Buy Now; holds final frame at counter
          ======================================================================= */}
      <div
        className="absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-900 ease-in-out"
        style={{
          opacity:
            stage === 'CHECKOUT_VIDEO' ||
            stage === 'CHECKOUT_CARD' ||
            stage === 'THANK_YOU'
              ? 1
              : 0,
          zIndex:
            stage === 'CHECKOUT_VIDEO' ||
            stage === 'CHECKOUT_CARD' ||
            stage === 'THANK_YOU'
              ? 30
              : 5,
          pointerEvents: 'none',
        }}
      >
        <video
          ref={checkoutVidRef}
          src="/videos/checkout.mp4"
          preload="auto"
          muted
          playsInline
          onEnded={handleCheckoutVideoEnded}
          onTimeUpdate={handleCheckoutVideoTimeUpdate}
          className="w-full h-full object-contain"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
      </div>

      {/* =======================================================================
          INTERACTION 1: "(o) PRESS TO ENTER" - Light Mint Frosted Glass
          ======================================================================= */}
      {stage === 'WAITING_FOR_ENTER' && (
        <div
          onClick={handleSingleEnterClick}
          role="button"
          tabIndex={0}
          className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 cursor-pointer group outline-none transition-all duration-500 ease-out animate-fadeIn"
        >
          <div className="flex items-center gap-3.5 px-6 py-2.5 rounded-full bg-neutral-950/70 hover:bg-neutral-950/90 backdrop-blur-xl border border-[#C8E8D0]/30 hover:border-[#C8E8D0]/70 shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_20px_rgba(200,232,208,0.1)] transition-all duration-300">
            <div className="relative flex items-center justify-center w-5 h-5">
              <div className="absolute inset-0 rounded-full border border-white/40 group-hover:border-[#C8E8D0]/70 transition-colors duration-300" />
              <div className="absolute inset-0 rounded-full border border-[#C8E8D0]/40 animate-ping opacity-75" />
              <div className="w-1.5 h-1.5 rounded-full bg-white group-hover:bg-[#C8E8D0] transition-colors duration-300" />
            </div>

            <span className="text-xs font-light tracking-[0.25em] uppercase text-[#F8F7F3] group-hover:text-white transition-colors duration-300">
              Press To Enter
            </span>
          </div>
        </div>
      )}

      {/* =======================================================================
          INTERACTION 2: ENTRANCE OPTIONS - "EXPLORE STORE" & "🛒 PICK UP TROLLEY"
          ======================================================================= */}
      {stage === 'ENTERIOR' && showEntranceChoices && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 animate-fadeIn">
          {/* Explore Store Button */}
          <button
            onClick={handleExploreStore}
            type="button"
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-neutral-950/75 hover:bg-neutral-950/95 backdrop-blur-xl border border-white/[0.12] hover:border-[#C8E8D0]/40 text-xs sm:text-sm font-light tracking-[0.16em] uppercase text-stone-200 hover:text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] outline-none shadow-lg"
          >
            <Compass className="w-4 h-4 text-[#C8E8D0]" />
            <span>Explore Store</span>
          </button>

          {/* Pick Up Trolley Button */}
          <button
            onClick={handlePickUpTrolley}
            type="button"
            className="group flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-[#B9DCC2] via-[#C8E8D0] to-[#DDF3E4] hover:brightness-105 backdrop-blur-xl border border-[#C8E8D0]/50 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_25px_rgba(200,232,208,0.25)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] outline-none text-[#061a10]"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="text-xs sm:text-sm font-medium tracking-[0.18em] uppercase">
              Pick Up Trolley
            </span>
          </button>
        </div>
      )}

      {/* =======================================================================
          INTERACTION 3: FIND PRODUCT SEARCH CARD
          ======================================================================= */}
      {stage === 'FIND_PRODUCT' && (
        <FindProductCard
          selectedProduct={selectedProduct}
          onSelectProduct={setSelectedProduct}
          onFindProduct={handleStartFindProductPush}
        />
      )}

      {/* =======================================================================
          INTERACTION 4: PRODUCT DETAILS CARD
          ======================================================================= */}
      {stage === 'PRODUCT_DETAILS' && (
        <ProductDetailsCard
          product={selectedProduct}
          onAddToCart={handleAddToCart}
          onFindAnotherProduct={handleFindAnotherProduct}
        />
      )}

      {/* =======================================================================
          INTERACTION 5: CHECKOUT CARD (Appears after checkout.mp4 finishes)
          ======================================================================= */}
      {stage === 'CHECKOUT_CARD' && (
        <CheckoutCard
          items={trolleyItems}
          onUpdateQuantity={onUpdateQuantity}
          onRemoveItem={onRemoveItem}
          onContinueShopping={handleContinueShoppingFromCheckout}
          onCompleteShopping={handleCompleteShopping}
        />
      )}

      {/* =======================================================================
          INTERACTION 6: FINAL THANK YOU SCREEN
          ======================================================================= */}
      {stage === 'THANK_YOU' && (
        <ThankYouCard
          onContinueShopping={handleContinueShoppingFromThankYou}
          onKnowUsMore={() => {
            sound.playChime();
            setAboutReturnTarget('THANK_YOU');
            setStage('ABOUT');
          }}
        />
      )}

      {/* =======================================================================
          INTERACTION 7: ABOUT STOCKSURE (FULL-PAGE PREMIUM LIGHT EXPERIENCE)
          ======================================================================= */}
      {stage === 'ABOUT' && (
        <AboutPage
          onVisitStore={handleVisitStoreFromAbout}
          onBack={handleBackFromAbout}
          returnTarget={aboutReturnTarget}
          cartCount={trolleyItems.reduce((acc, item) => acc + item.quantity, 0)}
        />
      )}
    </div>
  );
}

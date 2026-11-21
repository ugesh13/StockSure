import React, { useState, useRef, useCallback } from 'react';
import ScrollDroneEntrance from './ScrollDroneEntrance';
import ShapeTransition from './ShapeTransition';
import StockSureHero from './StockSureHero';

/**
 * EntranceExperience
 * 
 * Clean, single orchestrator for the new StockSure entrance:
 * 
 * Flow:
 * 1. Original Drone Video (Scroll-Controlled)
 * 2. Video Reaches Final Gate Frame
 * 3. "PRESS ENTER TO ENTER" appears
 * 4. User presses Enter or clicks prompt
 * 5. Shape Transition expands
 * 6. Newly Attached StockSure Image Reveals
 */
export default function EntranceExperience() {
  // Stages: 'DRONE_SCROLLING' -> 'TRANSITIONING' -> 'HERO_REVEALED'
  const [stage, setStage] = useState('DRONE_SCROLLING');
  const isTransitioningRef = useRef(false);

  // Triggered via keyboard Enter or prompt click
  const handleTriggerEnter = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setStage('TRANSITIONING');
  }, []);

  // Called when ShapeTransition animation finishes
  const handleTransitionComplete = useCallback(() => {
    setStage('HERO_REVEALED');
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      
      {/* Layer 1: Drone Video Sequence (Controlled by user scroll) */}
      {stage !== 'HERO_REVEALED' && (
        <div className="absolute inset-0 w-full h-full z-10">
          <ScrollDroneEntrance
            onTriggerEnter={handleTriggerEnter}
            isTransitioning={stage === 'TRANSITIONING'}
          />
        </div>
      )}

      {/* Layer 2: Shape-Based Transition Placeholder Architecture */}
      <ShapeTransition
        isActive={stage === 'TRANSITIONING'}
        shapeType="circle"
        durationMs={1300}
        onComplete={handleTransitionComplete}
      >
        <StockSureHero />
      </ShapeTransition>

      {/* Layer 3: Fully Revealed Hero Page */}
      {stage === 'HERO_REVEALED' && (
        <div className="absolute inset-0 w-full h-full z-20 animate-fadeIn">
          <StockSureHero />
        </div>
      )}

    </div>
  );
}

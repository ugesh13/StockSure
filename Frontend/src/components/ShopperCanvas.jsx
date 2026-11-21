import React, { useEffect, useRef } from 'react';

/**
 * High-performance HTML5 Canvas rendering realistic, natural shopper movement
 * inside the StockSure supermarket interior.
 */
export default function ShopperCanvas({ isActive }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Shopper 1: Trolley Shopper State
    const trolleyShopper = {
      x: 1050,
      y: 505,
      speed: 26, // pixels per second
      direction: -1, // moving left
      state: 'WALKING', // 'WALKING' | 'BROWSING'
      browseTimer: 0,
      stridePhase: 0,
      width: 28,
      height: 98,
    };

    // Shopper 2: Produce Stand Browser State
    const produceBrowser = {
      x: 440,
      y: 435,
      state: 'IDLE', // 'IDLE' | 'REACHING' | 'EXAMINING'
      timer: 0,
      armProgress: 0,
      height: 78,
    };

    // Shopper 3: Distant Background Shopper
    const backgroundShopper = {
      x: 720,
      y: 382,
      speed: 12,
      direction: 1,
      stridePhase: 0,
      height: 48,
    };

    let lastTime = performance.now();

    const render = (currentTime) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Ensure canvas dimensions match container
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const scaleX = canvas.width / 1376;
      const scaleY = canvas.height / 768;

      // =========================================================================
      // 1. UPDATE & DRAW SHOPPER 1 (Customer with Shopping Trolley)
      // =========================================================================
      if (trolleyShopper.state === 'WALKING') {
        trolleyShopper.x += trolleyShopper.direction * trolleyShopper.speed * dt;
        trolleyShopper.stridePhase += dt * 3.8;

        // Slow down and browse near produce display
        if (trolleyShopper.x < 620 && trolleyShopper.x > 610) {
          trolleyShopper.state = 'BROWSING';
          trolleyShopper.browseTimer = 4.2;
        }

        // Loop seamlessly across the aisle with realistic entry/exit
        if (trolleyShopper.x < 180) {
          trolleyShopper.x = 1150;
        }
      } else if (trolleyShopper.state === 'BROWSING') {
        trolleyShopper.browseTimer -= dt;
        if (trolleyShopper.browseTimer <= 0) {
          trolleyShopper.state = 'WALKING';
        }
      }

      const tX = trolleyShopper.x * scaleX;
      const tY = trolleyShopper.y * scaleY;
      const tH = trolleyShopper.height * scaleY;
      const tW = trolleyShopper.width * scaleX;

      // Soft contact shadow on polished floor
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(tX, tY + tH * 0.98, tW * 1.8, 6 * scaleY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Soft reflection on glossy polished floor
      ctx.fillStyle = 'rgba(18, 14, 12, 0.18)';
      ctx.beginPath();
      ctx.ellipse(tX, tY + tH * 1.08, tW * 1.2, 14 * scaleY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw Trolley Shopper Body
      const legOffset =
        trolleyShopper.state === 'WALKING' ? Math.sin(trolleyShopper.stridePhase) * 6 * scaleY : 0;
      const bob =
        trolleyShopper.state === 'WALKING'
          ? Math.abs(Math.sin(trolleyShopper.stridePhase * 2)) * 1.5 * scaleY
          : 0;

      // Clothing palette: dark charcoal jacket, dark slacks (realistic retail shopper)
      // Slacks/Legs
      ctx.fillStyle = '#1c2227';
      // Left leg
      ctx.fillRect(tX - 4 * scaleX, tY + tH * 0.55 - bob, 4 * scaleX, tH * 0.42 + legOffset);
      // Right leg
      ctx.fillRect(tX + 1 * scaleX, tY + tH * 0.55 - bob, 4 * scaleX, tH * 0.42 - legOffset);

      // Shoes
      ctx.fillStyle = '#0f1113';
      ctx.fillRect(tX - 6 * scaleX, tY + tH * 0.96 + legOffset, 6 * scaleX, 3 * scaleY);
      ctx.fillRect(tX - 1 * scaleX, tY + tH * 0.96 - legOffset, 6 * scaleX, 3 * scaleY);

      // Torso & Jacket
      ctx.fillStyle = '#2d3748';
      ctx.beginPath();
      ctx.roundRect(tX - 7 * scaleX, tY + tH * 0.22 - bob, 14 * scaleX, tH * 0.38, 3);
      ctx.fill();

      // Head & Hair
      ctx.fillStyle = '#221c18';
      ctx.beginPath();
      ctx.arc(tX, tY + tH * 0.12 - bob, 6.5 * scaleY, 0, Math.PI * 2);
      ctx.fill();

      // Arms extending to hold trolley handle
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 3 * scaleX;
      ctx.beginPath();
      ctx.moveTo(tX, tY + tH * 0.28 - bob);
      ctx.lineTo(tX - 16 * scaleX, tY + tH * 0.52);
      ctx.stroke();

      // Supermarket Shopping Trolley
      const trX = tX - 38 * scaleX;
      const trY = tY + tH * 0.46;
      const trW = 34 * scaleX;
      const trH = 36 * scaleY;

      // Trolley Basket (metal wireframe)
      ctx.strokeStyle = 'rgba(215, 222, 230, 0.75)';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(trX, trY, trW, trH * 0.65);

      // Wire mesh grid
      ctx.strokeStyle = 'rgba(215, 222, 230, 0.35)';
      ctx.beginPath();
      ctx.moveTo(trX + trW * 0.33, trY);
      ctx.lineTo(trX + trW * 0.33, trY + trH * 0.65);
      ctx.moveTo(trX + trW * 0.66, trY);
      ctx.lineTo(trX + trW * 0.66, trY + trH * 0.65);
      ctx.moveTo(trX, trY + trH * 0.32);
      ctx.lineTo(trX + trW, trY + trH * 0.32);
      ctx.stroke();

      // Trolley Lower Chassis
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(trX, trY + trH * 0.65);
      ctx.lineTo(trX + trW * 0.9, trY + trH * 0.88);
      ctx.lineTo(trX + trW * 1.15, trY + trH * 0.2); // push handle support
      ctx.stroke();

      // Handle grip
      ctx.fillStyle = '#dc2626'; // red retail handle grip
      ctx.fillRect(trX + trW * 1.1, trY + trH * 0.16, 4 * scaleX, 3 * scaleY);

      // Caster wheels
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(trX + 3 * scaleX, trY + trH * 0.95, 2.8 * scaleY, 0, Math.PI * 2);
      ctx.arc(trX + trW * 0.85, trY + trH * 0.95, 2.8 * scaleY, 0, Math.PI * 2);
      ctx.fill();

      // Groceries inside trolley (subtle color accents: green organics, cereal box, juice)
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(trX + 4 * scaleX, trY + 6 * scaleY, 8 * scaleX, 10 * scaleY);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(trX + 14 * scaleX, trY + 8 * scaleY, 7 * scaleX, 9 * scaleY);
      ctx.restore();

      // =========================================================================
      // 2. UPDATE & DRAW SHOPPER 2 (Customer Browsing Fresh Produce Stand)
      // =========================================================================
      produceBrowser.timer += dt;
      if (produceBrowser.timer > 8.5) {
        produceBrowser.timer = 0;
      }

      // Natural inspection motion: reaching, examining, returning
      let armReach = 0;
      if (produceBrowser.timer > 2.0 && produceBrowser.timer < 5.0) {
        // Reaching and examining
        const p = (produceBrowser.timer - 2.0) / 3.0;
        armReach = Math.sin(p * Math.PI) * 12 * scaleX;
      }

      const pX = produceBrowser.x * scaleX;
      const pY = produceBrowser.y * scaleY;
      const pH = produceBrowser.height * scaleY;
      const pW = 20 * scaleX;

      ctx.save();
      // Floor contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(pX, pY + pH * 0.98, pW * 0.8, 5 * scaleY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shopper 2 Body (casual retail customer: beige sweater, jeans)
      // Slacks
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(pX - 4 * scaleX, pY + pH * 0.52, 4 * scaleX, pH * 0.44);
      ctx.fillRect(pX + 1 * scaleX, pY + pH * 0.52, 4 * scaleX, pH * 0.44);

      // Sweater
      ctx.fillStyle = '#9ca3af';
      ctx.beginPath();
      ctx.roundRect(pX - 6 * scaleX, pY + pH * 0.22, 12 * scaleX, pH * 0.34, 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#372b22';
      ctx.beginPath();
      ctx.arc(pX, pY + pH * 0.12, 5 * scaleY, 0, Math.PI * 2);
      ctx.fill();

      // Arm reaching toward the produce bin
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 2.4 * scaleX;
      ctx.beginPath();
      ctx.moveTo(pX + 3 * scaleX, pY + pH * 0.28);
      ctx.lineTo(pX + 8 * scaleX + armReach, pY + pH * 0.46);
      ctx.stroke();

      // Small item in hand when reaching
      if (armReach > 4 * scaleX) {
        ctx.fillStyle = '#f97316'; // orange / apple
        ctx.beginPath();
        ctx.arc(pX + 9 * scaleX + armReach, pY + pH * 0.48, 2.5 * scaleY, 0, Math.PI * 2);
        ctx.fill();
      }

      // Handheld shopping basket on the other arm
      ctx.strokeStyle = '#059669'; // StockSure green shopping basket
      ctx.lineWidth = 1.8;
      ctx.strokeRect(pX - 12 * scaleX, pY + pH * 0.5, 9 * scaleX, 8 * scaleY);
      ctx.beginPath();
      ctx.arc(pX - 7.5 * scaleX, pY + pH * 0.48, 4 * scaleX, Math.PI, 0);
      ctx.stroke();
      ctx.restore();

      // =========================================================================
      // 3. UPDATE & DRAW SHOPPER 3 (Distant Shopper in Background Aisle)
      // =========================================================================
      backgroundShopper.x += backgroundShopper.direction * backgroundShopper.speed * dt;
      backgroundShopper.stridePhase += dt * 3.0;

      if (backgroundShopper.x > 840) {
        backgroundShopper.direction = -1;
      } else if (backgroundShopper.x < 680) {
        backgroundShopper.direction = 1;
      }

      const bX = backgroundShopper.x * scaleX;
      const bY = backgroundShopper.y * scaleY;
      const bH = backgroundShopper.height * scaleY;
      const bLegOffset = Math.sin(backgroundShopper.stridePhase) * 3 * scaleY;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(bX, bY + bH * 0.98, 6 * scaleX, 2.5 * scaleY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Distant silhouette / shopper
      ctx.fillStyle = '#334155';
      // Legs
      ctx.fillRect(bX - 2 * scaleX, bY + bH * 0.55, 2 * scaleX, bH * 0.42 + bLegOffset);
      ctx.fillRect(bX + 1 * scaleX, bY + bH * 0.55, 2 * scaleX, bH * 0.42 - bLegOffset);

      // Torso
      ctx.fillStyle = '#475569';
      ctx.fillRect(bX - 3.5 * scaleX, bY + bH * 0.22, 7 * scaleX, bH * 0.35);

      // Head
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(bX, bY + bH * 0.12, 3 * scaleY, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

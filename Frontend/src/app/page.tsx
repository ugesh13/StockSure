'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
  useMotionValueEvent,
} from 'framer-motion';
import DynamicIslandNavbar from '@/components/DynamicIslandNavbar';
import AnimatedHeroLetters from '@/components/AnimatedHeroLetters';
import {
  Sprout,
  Sun,
  ShieldCheck,
  Leaf,
  MapPin,
  Clock,
  Phone,
  Mail,
  Compass,
  ExternalLink,
  CheckCircle2,
  Send,
  ArrowRight,
  Navigation,
  Loader2,
  AlertCircle,
  Building2,
  Layers,
  Sparkles,
  X,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';

const BRANCHES = [
  {
    id: 'flagship',
    name: 'Sanctuary Glasshouse Flagship',
    city: 'San Francisco, CA',
    address: '428 Botanical Way, Conservatory Park, San Francisco, CA 94117',
    hours: 'Mon – Sat: 9:00 AM – 7:00 PM | Sun: 10:00 AM – 6:00 PM',
    phone: '+1 (415) 890-4420',
    email: 'conservatory@verdant-botanicals.com',
    highlight: 'Full atrium specimen collection, peat-free repotting bar, and consultation pavilion.',
    image: '/images/branch-sf.jpg',
    lat: 37.7749,
    lng: -122.4194,
    features: ['Peat-Free Repotting Bar', 'Rare Specimen Atrium', 'Private Consultations'],
  },
  {
    id: 'coastal',
    name: 'Coastal Nursery & Courtyard',
    city: 'Carmel-by-the-Sea, CA',
    address: '112 Ocean Pine Lane, Carmel-by-the-Sea, CA 93921',
    hours: 'Wed – Sun: 10:00 AM – 5:30 PM',
    phone: '+1 (831) 450-8812',
    email: 'coastal@verdant-botanicals.com',
    highlight: 'Outdoor perennials, architectural coastal conifers, and handmade stoneware planters.',
    image: '/images/branch-carmel.jpg',
    lat: 36.5552,
    lng: -121.9233,
    features: ['Coastal Conifer Terrace', 'Handmade Stoneware Studio', 'Courtyard Garden'],
  },
  {
    id: 'botanical-hub',
    name: 'Manhattan Living Conservatory',
    city: 'New York, NY',
    address: '74 Mercer Street, SoHo, New York, NY 10012',
    hours: 'Tue – Sun: 11:00 AM – 8:00 PM',
    phone: '+1 (212) 670-9930',
    email: 'soho@verdant-botanicals.com',
    highlight: 'Indoor low-light acclimated botanicals, architectural ficus specimens, and private delivery fleet.',
    image: '/images/branch-nyc.jpg',
    lat: 40.7209,
    lng: -74.0007,
    features: ['Low-Light Specialists', 'Architectural Ficus Loft', 'White-Glove Delivery'],
  },
];

export default function Home() {
  const { scrollY } = useScroll();
  const [windowHeight, setWindowHeight] = useState(900);
  const [aboutBounds, setAboutBounds] = useState({ top: 900, height: 1100 });
  const [branchesBounds, setBranchesBounds] = useState({ top: 1800, height: 1200 });
  const [selectedBranch, setSelectedBranch] = useState(BRANCHES[0]);
  const [visitedBranchModal, setVisitedBranchModal] = useState<typeof BRANCHES[0] | null>(null);

  // Video card state
  const branchesVideoRef = useRef<HTMLVideoElement | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Contact Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Plant Care & Light Diagnostic',
    message: '',
  });
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Measure section bounds
  useEffect(() => {
    const updateBounds = () => {
      const h = window.innerHeight || 900;
      setWindowHeight(h);
      const scroll = window.scrollY || window.pageYOffset;

      const aboutEl = document.getElementById('about');
      if (aboutEl) {
        const rect = aboutEl.getBoundingClientRect();
        setAboutBounds({
          top: rect.top + scroll,
          height: aboutEl.offsetHeight || 1100,
        });
      }

      const branchesEl = document.getElementById('branches');
      if (branchesEl) {
        const rect = branchesEl.getBoundingClientRect();
        setBranchesBounds({
          top: rect.top + scroll,
          height: branchesEl.offsetHeight || 1200,
        });
      }
    };

    updateBounds();
    window.addEventListener('resize', updateBounds);
    const timer = setTimeout(updateBounds, 500);
    return () => {
      window.removeEventListener('resize', updateBounds);
      clearTimeout(timer);
    };
  }, []);

  const springConfig = { stiffness: 95, damping: 22, mass: 0.8 };

  const effectiveH = aboutBounds.top > 0 ? aboutBounds.top : windowHeight;

  // 1. Hero Section Fade:
  // Starts fading smoothly as user begins scrolling toward About Us (0 to effectiveH * 0.78)
  const heroFadeRaw = useTransform(scrollY, [0, effectiveH * 0.78], [1, 0]);
  const heroFade = useTransform(heroFadeRaw, (v) => (v < 0.005 ? 0 : v));

  // 2. Subtitle & Button: Fade out smoothly in sync with the hero dissolve
  const subOpacityRaw = useTransform(scrollY, [0, effectiveH * 0.65], [1, 0]);
  const subYRaw = useTransform(scrollY, [0, effectiveH * 0.65], [0, 32]);
  const subOpacity = useSpring(subOpacityRaw, springConfig);
  const subY = useSpring(subYRaw, springConfig);

  // 3. Pointer events guard so faded hero never blocks clicks on About Us
  const heroPointerEvents = useTransform(heroFade, (v) => (v <= 0.01 ? 'none' : 'auto'));

  // 4. Succulent Pot: Reveals inside About Us resting gracefully in circular artwork
  const potOpacityRaw = useTransform(
    scrollY,
    [windowHeight * 0.45, windowHeight * 0.90],
    [0, 1]
  );
  const potScaleRaw = useTransform(
    scrollY,
    [windowHeight * 0.45, windowHeight * 0.90],
    [0.88, 1.0]
  );
  const potOpacity = useSpring(potOpacityRaw, { stiffness: 90, damping: 22, mass: 0.7 });
  const potScale = useSpring(potScaleRaw, { stiffness: 90, damping: 22, mass: 0.7 });

  const toggleVideoPlay = () => {
    if (!branchesVideoRef.current) return;
    if (branchesVideoRef.current.paused) {
      branchesVideoRef.current
        .play()
        .then(() => {
          setVideoPlaying(true);
        })
        .catch(() => {
          setVideoPlaying(false);
        });
    } else {
      branchesVideoRef.current.pause();
      setVideoPlaying(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setErrorMessage('Please provide your name, a valid email address, and your message.');
      setFormStatus('error');
      return;
    }

    setFormStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Server rejected inquiry');
      }

      setFormStatus('success');
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: 'Plant Care & Light Diagnostic',
        message: '',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect to advisory service. Please try again.');
      setFormStatus('error');
    }
  };

  return (
    <div className="relative min-h-screen w-full select-none bg-[#b8c5ae] overflow-x-clip">
      {/* Dynamic Floating Glassmorphic Navbar */}
      <DynamicIslandNavbar />

      {/* 1. HOME / HERO SECTION (100vh) */}
      <motion.section
        id="home"
        style={{
          pointerEvents: heroPointerEvents,
        }}
        className="relative z-50 w-full h-screen min-h-screen overflow-visible pointer-events-auto"
      >
        {/* Cinematic Dissolving Background: Poster, Video, and 4 CSS Lighting Overlays */}
        <motion.div
          style={{ opacity: heroFade }}
          className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none bg-forest-900"
        >
          {/* High-Resolution Fallback Poster */}
          <Image
            src="/images/hero-poster.jpg"
            alt="Verdant botanical nursery greenhouse sanctuary"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center filter brightness-[1.04]"
          />

          {/* Video Asset from Reference folder */}
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster="/images/hero-poster.jpg"
            className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[1.04]"
          >
            <source src="/reference/nursery_shop.mp4" type="video/mp4" />
            <source src="/references/Nursery_shop.mp4" type="video/mp4" />
            <source src="/references/nursery_shop.mp4" type="video/mp4" />
          </video>

          {/* NON-DESTRUCTIVE CSS LIGHTING EFFECT OVERLAYS */}
          {/* 1. Natural sunlight radial gradient from above falling over the plants */}
          <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_95%_75%_at_45%_10%,rgba(255,252,238,0.32)_0%,rgba(255,255,255,0.1)_45%,transparent_85%)] pointer-events-none" />

          {/* 2. Soft warm-white daylight exposure enhancement */}
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-amber-50/15 via-transparent to-black/20 pointer-events-none" />

          {/* 3. Soft ambient light bloom over top foliage without washing out details */}
          <div className="absolute top-0 left-0 right-0 h-3/5 z-10 bg-gradient-to-b from-white/12 via-white/5 to-transparent pointer-events-none" />

          {/* 4. Subtle contrast gradient behind right-side text to ensure crisp legibility */}
          <div className="absolute inset-0 z-10 bg-gradient-to-l from-black/45 via-black/15 to-transparent pointer-events-none" />
        </motion.div>

        {/* Unified Hero Text & CTA Flex Column: Heading on top, followed by generous vertical spacing, subtitle, and Shop Now button */}
        <div className="absolute left-[70.1%] top-[50%] -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center text-center w-full max-w-[340px] sm:max-w-xl lg:max-w-2xl px-4 pointer-events-auto">
          {/* Main Hero Heading with falling letters */}
          <div className="w-full flex justify-center">
            <AnimatedHeroLetters
              scrollY={scrollY}
              windowHeight={windowHeight}
              aboutTop={aboutBounds.top}
            />
          </div>

          {/* Subtitle with generous, clean vertical spacing below the heading */}
          <motion.p
            style={{ opacity: subOpacity, y: subY }}
            className="font-sans font-light text-white/95 text-base sm:text-lg md:text-xl lg:text-2xl tracking-normal drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] mt-6 sm:mt-8 leading-relaxed max-w-lg select-none"
          >
            Gift a Great Life to Your Home
          </motion.p>

          {/* Shop Now button with proper vertical spacing below the subtitle */}
          <motion.div
            style={{ opacity: subOpacity, y: subY }}
            className="mt-5 sm:mt-6"
          >
            <a
              href="#about"
              className="group relative inline-flex items-center justify-center px-7 sm:px-9 py-2.5 sm:py-3 rounded-[6px] bg-[#5F7355]/70 hover:bg-white text-white hover:text-[#183D2B] border border-white/60 hover:border-white backdrop-blur-md shadow-[0_4px_20px_rgba(24,61,43,0.25)] hover:shadow-[0_8px_28px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-out font-sans font-semibold text-xs sm:text-sm tracking-wider uppercase cursor-pointer overflow-hidden"
            >
              {/* Subtle shimmer sweep on hover */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
              <span className="relative z-10">Shop Now</span>
            </a>
          </motion.div>
        </div>
      </motion.section>

      {/* 2. ABOUT US SECTION — With Image 1 background & scroll-driven succulent reveal & roll composition */}
      <section
        id="about"
        className="relative z-30 w-full min-h-screen py-24 lg:py-0 lg:h-screen flex items-center overflow-visible bg-[#A2B193]"
      >
        {/* Full Image 1 Background: Preserving original artwork, muted green tone, corner foliage, and circular design */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <Image
            src="/images/about-bg.jpg"
            alt="Verdant botanical sanctuary"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center filter brightness-[1.01]"
          />
          {/* Subtle soft ambient daylight glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/10 pointer-events-none" />
        </div>

        {/* Succulent Pot Container: Resting gracefully in About Us circular artwork */}
        <div
          id="succulent-pot-anchor"
          className="absolute left-[70.1%] top-[52.8%] -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none flex items-center justify-center"
        >
          <motion.div
            style={{
              scale: potScale,
              opacity: potOpacity,
            }}
            className="flex items-center justify-center origin-center will-change-transform"
          >
            <div
              id="succulent-pot-image-wrapper"
              className="relative w-64 sm:w-80 md:w-96 lg:w-[430px] xl:w-[460px] aspect-[432/578]"
            >
              <Image
                src="/images/pot.png"
                alt="Verdant botanical succulent arrangement in artisan stone bowl"
                fill
                priority
                sizes="(max-width: 640px) 260px, (max-width: 1024px) 380px, 460px"
                className="object-contain filter drop-shadow-[0_24px_36px_rgba(18,34,22,0.35)] drop-shadow-[0_6px_14px_rgba(0,0,0,0.18)]"
              />
            </div>
          </motion.div>
        </div>

        {/* Content Container: Left Column for Editorial Story, Right Column aligned with Pot */}
        <div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Refined Editorial Botanical Story */}
            <div className="lg:col-span-6 space-y-6 text-left max-w-xl">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#183D2B]/12 border border-[#183D2B]/20 backdrop-blur-md">
                <Leaf className="w-3.5 h-3.5 text-[#183D2B]" />
                <span className="font-sans text-[11px] font-semibold text-[#183D2B] tracking-widest uppercase">
                  Living Architecture
                </span>
              </div>

              <h2 className="font-playfair text-4xl sm:text-5xl md:text-6xl font-normal text-[#183D2B] tracking-tight leading-[1.08]">
                Nurtured by Nature,<br />
                <span className="italic font-light text-[#234934]">Curated for Living.</span>
              </h2>

              <p className="font-sans text-sm sm:text-base text-[#183D2B]/90 font-light leading-relaxed">
                At Verdant, every architectural specimen is acclimated in our artisan micro-greenhouses. We marry slow horticulture with peat-free custom substrates and hand-thrown ceramic stoneware to bring natural balance into residential spaces.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#183D2B]/20">
                <div className="space-y-1">
                  <span className="block font-mono text-xs uppercase tracking-wider text-[#183D2B]/70 font-semibold">
                    Acclimatization
                  </span>
                  <span className="block font-sans text-sm font-medium text-[#183D2B]">
                    8+ Weeks Quarantine
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="block font-mono text-xs uppercase tracking-wider text-[#183D2B]/70 font-semibold">
                    Substrate
                  </span>
                  <span className="block font-sans text-sm font-medium text-[#183D2B]">
                    100% Peat-Free Organic
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Balanced spacer matching composition */}
            <div className="hidden lg:block lg:col-span-6 min-h-[460px] pointer-events-none" />
          </div>
        </div>
      </section>

      {/* 3. BRANCHES SECTION — With Cinematic Video Card on Left & Pot-Activated Play Collision */}
      <section
        id="branches"
        className="relative z-20 bg-[#b8c5ae] text-[#183D2B] py-28 sm:py-36 px-4 sm:px-8 lg:px-12 overflow-visible border-t border-[#183D2B]/10"
      >
        <div className="max-w-7xl mx-auto space-y-16 sm:space-y-20">
          {/* Header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#183D2B]/10 border border-[#183D2B]/15 text-[11px] font-semibold text-[#183D2B] uppercase tracking-widest">
              <Compass className="w-3.5 h-3.5 text-[#183D2B]" />
              <span>Physical Sanctuaries</span>
            </div>
            <h2 className="font-playfair text-4xl sm:text-5xl md:text-6xl font-normal text-[#183D2B] tracking-tight leading-[1.08]">
              Find Your Nearest Verdant
            </h2>
            <p className="font-sans text-sm sm:text-base text-[#3D5A45] font-light leading-relaxed">
              A little greenery, closer to home.
            </p>
          </div>

          {/* MAIN SHOWCASE: Left Side Video Card & Right Side Branch Locations */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            {/* LEFT SIDE: Premium Branches Video Card (Cols 1-5) */}
            <div className="lg:col-span-5 xl:col-span-5 flex flex-col justify-between gap-6">
              <div className="group relative w-full rounded-[24px] bg-[#cad6c0]/70 hover:bg-[#d0dcbf]/85 border border-[#183D2B]/15 hover:border-[#183D2B]/35 shadow-[0_8px_32px_rgba(24,61,43,0.08)] hover:shadow-[0_18px_44px_rgba(24,61,43,0.15)] transition-all duration-300 p-5 sm:p-7 flex flex-col justify-between gap-5 hover:-translate-y-1 h-full">
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-[#183D2B]/10 text-[11px] font-mono font-semibold uppercase tracking-wider text-[#183D2B]">
                    <Sparkles className="w-3.5 h-3.5 text-[#183D2B]" />
                    <span>Living Sanctuary Film</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#3D5A45] px-2.5 py-0.5 rounded-full bg-[#183D2B]/8">
                    {videoPlaying ? 'Playing' : 'Paused'}
                  </span>
                </div>

                {/* 16:9 Video Container: Strict aspect-video maintains 1280x720 aspect ratio without stretch or unnecessary crop */}
                <div
                  id="branches-video-container"
                  onClick={toggleVideoPlay}
                  className="relative w-full aspect-video rounded-[18px] overflow-hidden bg-black/90 shadow-[0_6px_24px_rgba(24,61,43,0.18)] cursor-pointer group/player border border-white/20 select-none"
                >
                  <video
                    ref={branchesVideoRef}
                    playsInline
                    muted={isMuted}
                    loop
                    preload="metadata"
                    onEnded={() => setVideoPlaying(false)}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/player:scale-[1.015]"
                  >
                    <source src="/videos/branches_video.mp4" type="video/mp4" />
                    <source src="/references/branches_video.mp4" type="video/mp4" />
                  </video>

                  {/* Ambient Scrim Gradient */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25 pointer-events-none transition-opacity duration-300 ${
                      videoPlaying ? 'opacity-20 group-hover/player:opacity-50' : 'opacity-65'
                    }`}
                  />

                  {/* Clean, Minimal Play Triangle Button at EXACT CENTER */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <button
                      id="branches-play-button"
                      type="button"
                      aria-label={videoPlaying ? 'Pause branches film' : 'Play branches film'}
                      className={`pointer-events-auto relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 hover:bg-white text-[#183D2B] shadow-[0_8px_32px_rgba(24,61,43,0.35)] border border-white flex items-center justify-center transition-all duration-300 cursor-pointer ${
                        videoPlaying
                          ? 'opacity-0 scale-90 group-hover/player:opacity-100 group-hover/player:scale-100'
                          : 'opacity-100 scale-100 hover:scale-110 shadow-[0_12px_36px_rgba(24,61,43,0.4)]'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVideoPlay();
                      }}
                    >
                      {videoPlaying ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 sm:w-2 h-5 sm:h-6 rounded-full bg-[#183D2B]" />
                          <span className="w-1.5 sm:w-2 h-5 sm:h-6 rounded-full bg-[#183D2B]" />
                        </div>
                      ) : (
                        <svg
                          className="w-7 h-7 sm:w-8 sm:h-8 text-[#183D2B] translate-x-0.5 transition-transform group-hover/player:scale-110"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <polygon points="6 3 20 12 6 21 6 3" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Bottom Controls / Mute Button Bar inside Video */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="text-[10px] font-mono text-white/85 bg-black/50 backdrop-blur-md px-2.5 py-0.5 rounded-full">
                      {videoPlaying ? 'Click video to pause' : 'Click to play film'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted(!isMuted);
                      }}
                      className="pointer-events-auto p-1.5 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md text-white transition-colors cursor-pointer"
                      aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                    >
                      {isMuted ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Editorial Caption & Details below the video */}
                <div className="space-y-2">
                  <h4 className="font-playfair text-xl sm:text-2xl font-bold text-[#183D2B] leading-tight">
                    Living Conservatories Film
                  </h4>
                  <p className="text-xs sm:text-sm text-[#2D5038] font-light leading-relaxed">
                    Take a visual walkthrough of our flagship San Francisco atrium and coastal specimen collections.
                  </p>
                </div>

                {/* Botanical Badges */}
                <div className="pt-3 border-t border-[#183D2B]/15 flex items-center justify-between text-[11px] font-mono text-[#3D5A45]">
                  <span>4K Greenhouse Film</span>
                  <span>Muted by Default</span>
                  <span>16:9 Cinema</span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: The 3 Branch Cards (Cols 6-12) */}
            <div className="lg:col-span-7 xl:col-span-7 space-y-6 flex flex-col justify-between">
              {BRANCHES.map((b, idx) => (
                <div
                  key={b.id}
                  className="group relative p-6 sm:p-7 rounded-[20px] bg-[#cad6c0]/70 hover:bg-[#d0dcbf]/85 border border-[#183D2B]/15 hover:border-[#183D2B]/35 shadow-[0_4px_24px_rgba(24,61,43,0.06)] hover:shadow-[0_16px_36px_rgba(24,61,43,0.12)] transition-all duration-300 flex flex-col sm:flex-row gap-6 items-center justify-between hover:-translate-y-1"
                >
                  {/* Thumbnail Image with Zoom on Hover */}
                  <div className="relative w-full sm:w-44 h-40 sm:h-36 rounded-[14px] overflow-hidden bg-[#183D2B]/10 flex-shrink-0">
                    <Image
                      src={b.image}
                      alt={b.name}
                      fill
                      sizes="200px"
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-[#183D2B]/85 backdrop-blur-md text-white text-[10px] font-mono">
                      {b.city.split(',')[0]}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-[#3D5A45] font-semibold uppercase tracking-wider">
                        {b.city}
                      </span>
                      <span className="text-[11px] font-mono text-[#3D5A45]/60">
                        0{idx + 1} / 03
                      </span>
                    </div>

                    <h3 className="font-playfair text-xl sm:text-2xl font-bold text-[#183D2B] leading-snug">
                      {b.name}
                    </h3>

                    <div className="space-y-1 text-xs text-[#2D5038]">
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#183D2B] flex-shrink-0" />
                        <span className="truncate">{b.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#183D2B] flex-shrink-0" />
                        <span>{b.hours}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(b.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-[8px] bg-[#183D2B] hover:bg-[#0E261A] text-white text-xs font-semibold tracking-wide transition-colors"
                      >
                        <span>Directions</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => {
                          setSelectedBranch(b);
                          setVisitedBranchModal(b);
                        }}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-[8px] bg-white/70 hover:bg-white text-[#183D2B] border border-[#183D2B]/20 text-xs font-semibold tracking-wide transition-all cursor-pointer"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Large Regional Map Area Showing Branch Locations */}
          <div className="rounded-[24px] bg-[#cad6c0]/45 border border-[#183D2B]/15 p-6 sm:p-10 shadow-[0_8px_32px_rgba(24,61,43,0.06)] space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#183D2B]/15 pb-5">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#3D5A45] font-bold block">
                  Regional Sanctuary Map
                </span>
                <h3 className="font-playfair text-2xl font-bold text-[#183D2B] mt-1">
                  Active Conservatory: {selectedBranch.name}
                </h3>
              </div>

              {/* Branch Selector Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {BRANCHES.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBranch(b)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      selectedBranch.id === b.id
                        ? 'bg-[#183D2B] text-white shadow-xs'
                        : 'bg-white/50 text-[#183D2B] hover:bg-white/80 border border-[#183D2B]/15'
                    }`}
                  >
                    {b.city.split(',')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Stylized Botanical Map Surface */}
            <div className="relative w-full h-80 sm:h-96 rounded-[18px] overflow-hidden bg-[#9fb292]/40 border border-[#183D2B]/15 flex items-center justify-center">
              {/* Subtle map topography grid */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#183D2B_1px,transparent_1px)] [background-size:16px_16px]" />

              {/* Map Display & Interactive Pins */}
              <div className="relative z-10 w-full h-full p-6 sm:p-12 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-mono text-[#183D2B]/70">
                  <span>LAT: {selectedBranch.lat}° N</span>
                  <span>LNG: {Math.abs(selectedBranch.lng)}° W</span>
                </div>

                {/* Central Location Pin Callout */}
                <div className="max-w-md mx-auto text-center space-y-3 bg-white/90 backdrop-blur-md p-6 rounded-[18px] border border-[#183D2B]/20 shadow-[0_12px_28px_rgba(24,61,43,0.12)]">
                  <div className="w-10 h-10 rounded-full bg-[#183D2B] text-white flex items-center justify-center mx-auto shadow-md">
                    <MapPin className="w-5 h-5 text-[#b8c5ae]" />
                  </div>
                  <div>
                    <h4 className="font-playfair text-lg font-bold text-[#183D2B]">
                      {selectedBranch.name}
                    </h4>
                    <p className="text-xs text-[#2D5038] mt-1 leading-snug">
                      {selectedBranch.address}
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(selectedBranch.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#183D2B] hover:bg-[#0E261A] text-white text-xs font-semibold tracking-wide transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Navigate via Google Maps</span>
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#3D5A45]">
                  <span>Conservatory Operating Hours: {selectedBranch.hours.split('|')[0]}</span>
                  <span className="hidden sm:inline">Ready for live Google Maps API integration</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CONTACT US SECTION — Completely Redesigned Premium Botanical Layout (#b8c5ae) */}
      <section
        id="contact"
        className="relative z-30 bg-[#b8c5ae] text-[#183D2B] py-28 sm:py-36 px-4 sm:px-8 lg:px-12 border-t border-[#183D2B]/10 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto space-y-16">
          {/* Header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#183D2B]/10 border border-[#183D2B]/15 text-[11px] font-semibold text-[#183D2B] uppercase tracking-widest">
              <Mail className="w-3.5 h-3.5 text-[#183D2B]" />
              <span>Direct Horticultural Advisory</span>
            </div>
            <h2 className="font-playfair text-4xl sm:text-5xl md:text-6xl font-normal text-[#183D2B] tracking-tight leading-[1.08]">
              Let&apos;s Grow Something Together.
            </h2>
            <p className="font-sans text-sm sm:text-base text-[#3D5A45] font-light leading-relaxed">
              Have a question, need help choosing a plant, or want to bring a little more green into your life? We&apos;d love to hear from you.
            </p>
          </div>

          {/* Two-Column Contact Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-stretch">
            {/* Left Side: Contact Information */}
            <div className="lg:col-span-5 p-8 sm:p-10 rounded-[20px] bg-[#cad6c0]/70 border border-[#183D2B]/15 shadow-[0_4px_24px_rgba(24,61,43,0.06)] flex flex-col justify-between space-y-8">
              <div className="space-y-6">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#3D5A45] font-bold block">
                    Sanctuary HQ & Advisory
                  </span>
                  <h3 className="font-playfair text-2xl sm:text-3xl font-bold text-[#183D2B] mt-1">
                    Conservatory Concierge
                  </h3>
                  <p className="text-xs text-[#24422E]/85 font-light leading-relaxed mt-2">
                    Our master botanists are available for custom specimen recommendations, peat-free repotting diagnostics, and interior landscape consultations.
                  </p>
                </div>

                {/* Structured Contact Details */}
                <div className="space-y-4 text-xs text-[#2D5038] pt-4 border-t border-[#183D2B]/15">
                  {/* Visit Us */}
                  <div className="flex items-start gap-3.5 group">
                    <div className="w-9 h-9 rounded-[10px] bg-[#183D2B]/10 text-[#183D2B] flex items-center justify-center flex-shrink-0 group-hover:bg-[#183D2B] group-hover:text-white transition-colors">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-[#183D2B] block">Visit Us</span>
                      <span className="text-[#24422E] leading-snug">
                        428 Botanical Way, Conservatory Park<br />San Francisco, CA 94117
                      </span>
                    </div>
                  </div>

                  {/* Call Us */}
                  <div className="flex items-start gap-3.5 group">
                    <div className="w-9 h-9 rounded-[10px] bg-[#183D2B]/10 text-[#183D2B] flex items-center justify-center flex-shrink-0 group-hover:bg-[#183D2B] group-hover:text-white transition-colors">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-[#183D2B] block">Call Us</span>
                      <a href="tel:+14158904420" className="text-[#24422E] hover:underline">
                        +1 (415) 890-4420
                      </a>
                    </div>
                  </div>

                  {/* Email Us */}
                  <div className="flex items-start gap-3.5 group">
                    <div className="w-9 h-9 rounded-[10px] bg-[#183D2B]/10 text-[#183D2B] flex items-center justify-center flex-shrink-0 group-hover:bg-[#183D2B] group-hover:text-white transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-[#183D2B] block">Email Us</span>
                      <a href="mailto:conservatory@verdant-botanicals.com" className="text-[#24422E] hover:underline">
                        conservatory@verdant-botanicals.com
                      </a>
                    </div>
                  </div>

                  {/* Opening Hours */}
                  <div className="flex items-start gap-3.5 group">
                    <div className="w-9 h-9 rounded-[10px] bg-[#183D2B]/10 text-[#183D2B] flex items-center justify-center flex-shrink-0 group-hover:bg-[#183D2B] group-hover:text-white transition-colors">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-[#183D2B] block">Opening Hours</span>
                      <span className="text-[#24422E] leading-snug">
                        Mon – Sat: 9:00 AM – 7:00 PM<br />Sun: 10:00 AM – 6:00 PM PST
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botanical Trust Badge */}
              <div className="p-4 rounded-[14px] bg-[#183D2B]/8 border border-[#183D2B]/10 text-xs text-[#24422E] flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-[#183D2B] flex-shrink-0" />
                <span className="leading-snug">
                  All plant selections arrive with a 30-day botanical acclimation warranty.
                </span>
              </div>
            </div>

            {/* Right Side: Premium Functional Contact Form */}
            <div className="lg:col-span-7 p-8 sm:p-10 rounded-[20px] bg-[#c3cfb9]/60 border border-[#183D2B]/15 shadow-[0_8px_32px_rgba(24,61,43,0.06)] flex flex-col justify-between">
              {formStatus === 'success' ? (
                <div className="py-12 text-center space-y-4 animate-fade-in">
                  <div className="w-14 h-14 rounded-full bg-[#183D2B] text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-8 h-8 text-[#b8c5ae]" />
                  </div>
                  <h3 className="font-playfair text-3xl font-bold text-[#183D2B]">
                    Inquiry Dispatched
                  </h3>
                  <p className="text-sm text-[#2D5038] max-w-sm mx-auto leading-relaxed">
                    Thank you! Your message has been received by our resident horticulturalists at the San Francisco Flagship. We will reply to your email shortly.
                  </p>
                  <button
                    onClick={() => setFormStatus('idle')}
                    className="mt-4 px-6 py-2.5 rounded-full bg-[#183D2B] hover:bg-[#0E261A] text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer"
                  >
                    Send another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-5">
                  <div className="border-b border-[#183D2B]/15 pb-4">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#3D5A45] font-bold block">
                      Direct Advisory Form
                    </span>
                    <h3 className="font-playfair text-2xl font-bold text-[#183D2B] mt-1">
                      Send a Message
                    </h3>
                  </div>

                  {/* Error Notification */}
                  {formStatus === 'error' && (
                    <div className="p-3.5 rounded-[12px] bg-red-100/80 border border-red-300 text-red-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Input Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#183D2B]">
                        Full Name <span className="text-red-700">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Evelyn Thorne"
                        className="w-full px-4 py-2.5 rounded-[12px] bg-white/70 border border-[#183D2B]/15 focus:border-[#183D2B] focus:bg-white focus:outline-hidden text-xs text-[#183D2B] placeholder-[#183D2B]/40 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#183D2B]">
                        Email Address <span className="text-red-700">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="evelyn@example.com"
                        className="w-full px-4 py-2.5 rounded-[12px] bg-white/70 border border-[#183D2B]/15 focus:border-[#183D2B] focus:bg-white focus:outline-hidden text-xs text-[#183D2B] placeholder-[#183D2B]/40 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#183D2B]">
                        Phone Number <span className="text-[#3D5A45]/70 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1 (415) 000-0000"
                        className="w-full px-4 py-2.5 rounded-[12px] bg-white/70 border border-[#183D2B]/15 focus:border-[#183D2B] focus:bg-white focus:outline-hidden text-xs text-[#183D2B] placeholder-[#183D2B]/40 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#183D2B]">
                        Inquiry Subject
                      </label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-[12px] bg-white/70 border border-[#183D2B]/15 focus:border-[#183D2B] focus:bg-white focus:outline-hidden text-xs text-[#183D2B] transition-colors"
                      >
                        <option value="Plant Care & Light Diagnostic">Plant Care & Light Diagnostic</option>
                        <option value="Peat-Free Custom Repotting">Peat-Free Custom Repotting</option>
                        <option value="Architectural Specimen Selection">Architectural Specimen Selection</option>
                        <option value="Corporate / Interior Design">Corporate / Interior Design</option>
                        <option value="Order & Delivery Tracking">Order & Delivery Tracking</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#183D2B]">
                      Message <span className="text-red-700">*</span>
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us about your space, ambient sunlight exposure, ceiling height, or the botanical specimen you have in mind..."
                      className="w-full px-4 py-2.5 rounded-[12px] bg-white/70 border border-[#183D2B]/15 focus:border-[#183D2B] focus:bg-white focus:outline-hidden text-xs text-[#183D2B] placeholder-[#183D2B]/40 transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={formStatus === 'loading'}
                    className="w-full py-3.5 rounded-[12px] bg-[#183D2B] hover:bg-[#0E261A] text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(24,61,43,0.2)] hover:shadow-[0_8px_24px_rgba(24,61,43,0.3)] transition-all duration-300 disabled:opacity-70 cursor-pointer"
                  >
                    {formStatus === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Dispatching Botanical Inquiry...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Message</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-30 bg-[#183D2B] text-white/80 py-16 px-4 sm:px-8 border-t border-[#183D2B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-2 text-white">
            <Sprout className="w-5 h-5 text-[#b8c5ae]" />
            <span className="font-playfair text-lg font-bold tracking-widest leading-none">VERDANT</span>
          </div>

          <div className="flex items-center gap-6 text-white/70">
            <a href="#home" className="hover:text-white transition-colors">Home</a>
            <a href="#about" className="hover:text-white transition-colors">About Us</a>
            <a href="#branches" className="hover:text-white transition-colors">Branches</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact Us</a>
          </div>

          <p className="text-white/50 text-[11px]">
            &copy; {new Date().getFullYear()} VERDANT Botanicals Sanctuary. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Branch Detail Modal */}
      <AnimatePresence>
        {visitedBranchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[#cad6c0] text-[#183D2B] rounded-[24px] p-8 border border-[#183D2B]/20 shadow-2xl space-y-6"
            >
              <button
                onClick={() => setVisitedBranchModal(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#183D2B]/10 hover:bg-[#183D2B] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#3D5A45] font-bold">
                  {visitedBranchModal.city}
                </span>
                <h3 className="font-playfair text-2xl font-bold text-[#183D2B]">
                  {visitedBranchModal.name}
                </h3>
                <p className="text-xs text-[#24422E] leading-relaxed">
                  {visitedBranchModal.highlight}
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-[#2D5038] bg-white/50 p-4 rounded-[14px] border border-[#183D2B]/10">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#183D2B]" />
                  <span>{visitedBranchModal.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#183D2B]" />
                  <span>{visitedBranchModal.hours}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#183D2B]" />
                  <span>{visitedBranchModal.phone}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#183D2B] block">Conservatory Amenities:</span>
                <div className="flex flex-wrap gap-2">
                  {visitedBranchModal.features.map((feat, i) => (
                    <span key={i} className="text-[11px] px-3 py-1 rounded-full bg-[#183D2B]/10 text-[#183D2B]">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(visitedBranchModal.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-[12px] bg-[#183D2B] hover:bg-[#0E261A] text-white text-xs font-semibold text-center transition-colors shadow-sm"
                >
                  Directions to Branch
                </a>
                <button
                  onClick={() => setVisitedBranchModal(null)}
                  className="px-5 py-3 rounded-[12px] bg-white/70 hover:bg-white text-[#183D2B] text-xs font-semibold transition-colors border border-[#183D2B]/20 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useRef, useEffect, useState, useMemo, Children } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface CarouselProps {
  children: React.ReactNode;
  autoPlay?: boolean;
  intervalMs?: number;
}

export function Carousel({ children, autoPlay = true, intervalMs = 3200 }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isResetting = useRef(false);

  const rawItems = useMemo(() => Children.toArray(children), [children]);
  const totalItems = rawItems.length;

  // Clone items (3 sets) to create a seamless infinite loop
  const displayItems = useMemo(() => {
    if (totalItems <= 1) return rawItems;
    return [
      ...rawItems.map((child, i) => ({ child, key: `clone-prev-${i}` })),
      ...rawItems.map((child, i) => ({ child, key: `main-${i}` })),
      ...rawItems.map((child, i) => ({ child, key: `clone-next-${i}` })),
    ];
  }, [rawItems, totalItems]);

  // Initial centering to the middle set
  useEffect(() => {
    if (totalItems <= 1 || !scrollRef.current) return;
    const el = scrollRef.current;
    
    // Wait for elements to be laid out
    const timeout = setTimeout(() => {
      if (!el || !el.firstElementChild) return;
      const firstItem = el.firstElementChild as HTMLElement;
      const gap = 20;
      const itemWidth = firstItem.offsetWidth + gap;
      const oneSetWidth = itemWidth * totalItems;
      
      // Center in middle set
      el.scrollLeft = -oneSetWidth;
    }, 50);

    return () => clearTimeout(timeout);
  }, [totalItems]);

  // Infinite boundary wrap detection
  const handleScroll = () => {
    if (totalItems <= 1 || !scrollRef.current || isResetting.current) return;
    const el = scrollRef.current;
    const firstItem = el.firstElementChild as HTMLElement | null;
    if (!firstItem) return;

    const gap = 20;
    const itemWidth = firstItem.offsetWidth + gap;
    const oneSetWidth = itemWidth * totalItems;
    
    const currentScroll = Math.abs(el.scrollLeft);

    // If scrolled past the second set into third set
    if (currentScroll >= oneSetWidth * 2 - 20) {
      isResetting.current = true;
      el.style.scrollBehavior = 'auto';
      el.scrollLeft = -(currentScroll - oneSetWidth);
      requestAnimationFrame(() => {
        if (el) el.style.scrollBehavior = 'smooth';
        isResetting.current = false;
      });
    }
    // If scrolled back past the second set into first set
    else if (currentScroll <= 20) {
      isResetting.current = true;
      el.style.scrollBehavior = 'auto';
      el.scrollLeft = -(currentScroll + oneSetWidth);
      requestAnimationFrame(() => {
        if (el) el.style.scrollBehavior = 'smooth';
        isResetting.current = false;
      });
    }
  };

  // Auto-play continuous smooth stepping
  useEffect(() => {
    if (!autoPlay || isHovered || totalItems <= 1) return;

    const timer = setInterval(() => {
      if (!scrollRef.current || isResetting.current) return;
      const el = scrollRef.current;
      const firstItem = el.firstElementChild as HTMLElement | null;
      if (!firstItem) return;

      const gap = 20;
      const scrollStep = firstItem.offsetWidth + gap;
      
      // Scroll forward in RTL (negative left)
      el.scrollBy({ left: -scrollStep, behavior: 'smooth' });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoPlay, isHovered, intervalMs, totalItems]);

  const scroll = (direction: 'next' | 'prev') => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const firstItem = el.firstElementChild as HTMLElement | null;
    if (!firstItem) return;

    const gap = 20;
    const scrollStep = firstItem.offsetWidth + gap;
    
    // In RTL: 'next' moves left (negative), 'prev' moves right (positive)
    const delta = direction === 'next' ? -scrollStep : scrollStep;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  if (totalItems === 0) return null;

  return (
    <div 
      className="carousel-wrapper" 
      style={{ position: 'relative', width: '100%' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {/* Right Arrow (Previous in Arabic reading order) */}
      {totalItems > 1 && (
        <button 
          onClick={() => scroll('prev')} 
          className="btn btn--icon carousel-nav-btn carousel-nav-btn--prev" 
          aria-label="السابق"
          type="button"
        >
          <ChevronRight size={22} />
        </button>
      )}
      
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="carousel-track"
      >
        <style>{`
          .carousel-track {
            display: flex;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            scroll-behavior: smooth;
            gap: 20px;
            padding: 16px 4px;
            scrollbar-width: none;
            -ms-overflow-style: none;
            -webkit-overflow-scrolling: touch;
          }
          .carousel-track::-webkit-scrollbar {
            display: none;
          }
          .carousel-item-wrapper {
            scroll-snap-align: start;
            flex: 0 0 auto;
            width: 320px;
            max-width: 85vw;
          }
          .carousel-nav-btn {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            z-index: 10;
            background: color-mix(in srgb, var(--bg-card) 85%, var(--accent) 15%);
            border: 1px solid var(--border);
            color: var(--text);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 50%;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }
          .carousel-nav-btn:hover {
            background: var(--accent);
            color: #fff;
            border-color: var(--accent);
            box-shadow: 0 8px 24px var(--accent-glow);
            transform: translateY(-50%) scale(1.08);
          }
          .carousel-nav-btn--prev {
            right: -16px;
          }
          .carousel-nav-btn--next {
            left: -16px;
          }
          @media (max-width: 768px) {
            .carousel-nav-btn {
              display: none !important;
            }
          }
        `}</style>
        
        {totalItems > 1 ? (
          (displayItems as Array<{ child: React.ReactNode; key: string }>).map(item => (
            <div key={item.key} style={{ display: 'contents' }}>
              {item.child}
            </div>
          ))
        ) : (
          rawItems
        )}
      </div>

      {/* Left Arrow (Next in Arabic reading order) */}
      {totalItems > 1 && (
        <button 
          onClick={() => scroll('next')} 
          className="btn btn--icon carousel-nav-btn carousel-nav-btn--next" 
          aria-label="التالي"
          type="button"
        >
          <ChevronLeft size={22} />
        </button>
      )}
    </div>
  );
}

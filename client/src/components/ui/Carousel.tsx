import { useRef, useEffect, useState, useMemo, Children, useCallback } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface CarouselProps {
  children: React.ReactNode;
  autoPlay?: boolean;
  intervalMs?: number;
}

export function Carousel({ children, autoPlay = true, intervalMs = 3800 }: CarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const [containerWidth, setContainerWidth] = useState(1100);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const items = useMemo(() => Children.toArray(children), [children]);
  const total = items.length;

  // Responsive visible count calculation
  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.offsetWidth;
    setContainerWidth(width);

    if (width < 640) {
      setVisibleCount(1);
    } else if (width < 960) {
      setVisibleCount(Math.min(2, total));
    } else {
      setVisibleCount(Math.min(3, total));
    }
  }, [total]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  const gap = 20;
  const itemWidth = visibleCount > 0 
    ? (containerWidth - (visibleCount - 1) * gap) / visibleCount 
    : 320;

  // Handle slide transition
  const slide = useCallback((dir: 'next' | 'prev') => {
    if (isAnimating || total <= 1) return;
    setIsAnimating(true);
    setDirection(dir);
  }, [isAnimating, total]);

  const handleNext = useCallback(() => slide('next'), [slide]);
  const handlePrev = useCallback(() => slide('prev'), [slide]);

  // Handle transition end to seamlessly update the index
  const handleTransitionEnd = () => {
    if (!isAnimating) return;
    
    if (direction === 'next') {
      setCurrentIndex(prev => (prev + 1) % total);
    } else if (direction === 'prev') {
      setCurrentIndex(prev => (prev - 1 + total) % total);
    }

    setIsAnimating(false);
    setDirection(null);
  };

  // Auto-play timer
  useEffect(() => {
    if (!autoPlay || isHovered || isAnimating || total <= visibleCount) return;

    const timer = setInterval(() => {
      handleNext();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoPlay, isHovered, isAnimating, total, visibleCount, intervalMs, handleNext]);

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsHovered(true);
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsHovered(false);
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    
    // In RTL: dragging left (positive distance) goes Next
    if (distance > 45) {
      handleNext();
    } else if (distance < -45) {
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (total === 0) return null;

  // Build the circular visible window with 1 buffer on left and right
  // Order: [Left Buffer, Card 0, Card 1, ... Card N-1, Right Buffer]
  const bufferCount = 1;
  const renderItems = [];
  const renderIndices: number[] = [];

  if (total > 1) {
    // Left buffer (1 item before currentIndex)
    const leftIndex = (currentIndex - bufferCount + total) % total;
    renderIndices.push(leftIndex);

    // Main visible items + 1 extra right buffer
    for (let i = 0; i < visibleCount + bufferCount; i++) {
      const idx = (currentIndex + i) % total;
      renderIndices.push(idx);
    }
  } else {
    renderIndices.push(0);
  }

  for (let i = 0; i < renderIndices.length; i++) {
    const idx = renderIndices[i];
    renderItems.push({
      element: items[idx],
      key: `carousel-slot-${i}-${idx}`,
    });
  }

  // Calculate track transform offset
  // In RTL, standard offset is -1 * (itemWidth + gap) (to show Card 0, not Left Buffer)
  const baseOffset = total > 1 ? (itemWidth + gap) : 0;
  let currentOffset = baseOffset;

  if (isAnimating && direction === 'next') {
    // Moving next: slide by 1 card
    currentOffset = baseOffset + (itemWidth + gap);
  } else if (isAnimating && direction === 'prev') {
    // Moving prev: slide backward by 1 card
    currentOffset = baseOffset - (itemWidth + gap);
  }

  return (
    <div 
      className="carousel-container" 
      ref={containerRef}
      style={{ position: 'relative', width: '100%', overflow: 'visible', margin: '0 auto' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Right Arrow (Prev in RTL reading flow) */}
      {total > visibleCount && (
        <button 
          onClick={handlePrev} 
          disabled={isAnimating}
          className="carousel-btn carousel-btn--prev" 
          aria-label="العنصر السابق"
          type="button"
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Overflow Hidden Viewport */}
      <div 
        className="carousel-viewport" 
        style={{ 
          width: '100%', 
          overflow: 'hidden', 
          borderRadius: 'var(--radius)',
          padding: '12px 0 16px',
        }}
      >
        <div 
          className="carousel-motion-track"
          onTransitionEnd={handleTransitionEnd}
          style={{
            display: 'flex',
            gap: `${gap}px`,
            width: 'max-content',
            transform: `translateX(${currentOffset}px)`,
            transition: isAnimating ? 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
            willChange: 'transform',
          }}
        >
          {renderItems.map(item => (
            <div 
              key={item.key} 
              className="carousel-slot" 
              style={{ 
                width: `${itemWidth}px`, 
                flex: `0 0 ${itemWidth}px`,
                maxWidth: `${itemWidth}px`,
              }}
            >
              {item.element}
            </div>
          ))}
        </div>
      </div>

      {/* Left Arrow (Next in RTL reading flow) */}
      {total > visibleCount && (
        <button 
          onClick={handleNext} 
          disabled={isAnimating}
          className="carousel-btn carousel-btn--next" 
          aria-label="العنصر التالي"
          type="button"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Modern Slide Indicator Dots */}
      {total > 1 && (
        <div className="carousel-dots-row">
          {items.map((_, i) => (
            <button
              key={i}
              className={`carousel-dot ${i === currentIndex ? 'carousel-dot--active' : ''}`}
              onClick={() => {
                if (isAnimating || i === currentIndex) return;
                setCurrentIndex(i);
              }}
              aria-label={`انتقل إلى العنصر رقم ${i + 1}`}
              type="button"
            />
          ))}
        </div>
      )}

      <style>{`
        .carousel-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          background: color-mix(in srgb, var(--bg-card) 90%, var(--accent) 10%);
          border: 1px solid var(--border);
          color: var(--text);
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-radius: 50%;
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .carousel-btn:hover:not(:disabled) {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
          box-shadow: 0 10px 30px var(--accent-glow);
          transform: translateY(-50%) scale(1.1);
        }
        .carousel-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .carousel-btn--prev {
          right: -22px;
        }
        .carousel-btn--next {
          left: -22px;
        }
        .carousel-dots-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-top: 14px;
        }
        .carousel-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--border);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .carousel-dot--active {
          width: 24px;
          background: var(--accent);
          box-shadow: 0 0 12px var(--accent-glow);
        }
        @media (max-width: 900px) {
          .carousel-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

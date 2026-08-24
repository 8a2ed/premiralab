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
  const [direction, setDirection] = useState<'next' | 'prev' | 'reset' | null>(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const [containerWidth, setContainerWidth] = useState(1100);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startX = useRef<number | null>(null);
  const startTime = useRef<number>(0);
  const currentDrag = useRef<number>(0);

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

    setDragOffset(0);
    currentDrag.current = 0;
    setIsAnimating(false);
    setDirection(null);
  };

  // Auto-play timer
  useEffect(() => {
    if (!autoPlay || isHovered || isAnimating || isDragging || total <= visibleCount) return;

    const timer = setInterval(() => {
      handleNext();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoPlay, isHovered, isAnimating, isDragging, total, visibleCount, intervalMs, handleNext]);

  // Touch & Pointer Drag Handlers (Unified & Responsive)
  const onDragStart = (clientX: number) => {
    if (isAnimating || total <= 1) return;
    setIsDragging(true);
    setIsHovered(true);
    startX.current = clientX;
    startTime.current = Date.now();
    currentDrag.current = 0;
    setDragOffset(0);
  };

  const onDragMove = (clientX: number) => {
    if (!isDragging || startX.current === null) return;
    const delta = clientX - startX.current;
    currentDrag.current = delta;
    setDragOffset(delta);
  };

  const onDragEnd = () => {
    if (!isDragging || startX.current === null) return;
    setIsDragging(false);
    setIsHovered(false);

    const delta = currentDrag.current;
    const elapsed = Math.max(1, Date.now() - startTime.current);
    const velocity = Math.abs(delta) / elapsed; // px per ms

    startX.current = null;

    // In RTL:
    // Dragging Right (delta > 0) pulls the next cards from left into view
    // Dragging Left (delta < 0) pulls previous cards from right into view
    const isQuickSwipe = velocity > 0.35 && Math.abs(delta) > 20;
    const isPastThreshold = Math.abs(delta) > 45;

    if (delta > 0 && (isPastThreshold || isQuickSwipe)) {
      setIsAnimating(true);
      setDirection('next');
    } else if (delta < 0 && (isPastThreshold || isQuickSwipe)) {
      setIsAnimating(true);
      setDirection('prev');
    } else {
      // Snap back to current
      if (Math.abs(delta) > 0) {
        setIsAnimating(true);
        setDirection('reset');
      } else {
        setDragOffset(0);
        currentDrag.current = 0;
      }
    }
  };

  // Touch Events
  const handleTouchStart = (e: React.TouchEvent) => {
    onDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    onDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    onDragEnd();
  };

  // Mouse / Pointer Events
  const handleMouseDown = (e: React.MouseEvent) => {
    onDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    onDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    onDragEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      onDragEnd();
    }
    setIsHovered(false);
  };

  if (total === 0) return null;

  // Build the circular visible window with 1 buffer on left and right
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
  const baseOffset = total > 1 ? (itemWidth + gap) : 0;
  let currentOffset = baseOffset + dragOffset;

  if (isAnimating) {
    if (direction === 'next') {
      currentOffset = baseOffset + (itemWidth + gap);
    } else if (direction === 'prev') {
      currentOffset = baseOffset - (itemWidth + gap);
    } else if (direction === 'reset') {
      currentOffset = baseOffset;
    }
  }

  return (
    <div 
      className="carousel-container" 
      ref={containerRef}
      style={{ 
        position: 'relative', 
        width: '100%', 
        overflow: 'visible', 
        margin: '0 auto',
        userSelect: isDragging ? 'none' : 'auto',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
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
          cursor: total > visibleCount ? (isDragging ? 'grabbing' : 'grab') : 'default',
          touchAction: 'pan-y',
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
            transition: isAnimating ? 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
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

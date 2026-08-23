import { useRef, useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface CarouselProps {
  children: React.ReactNode;
  autoPlay?: boolean;
  intervalMs?: number;
}

export function Carousel({ children, autoPlay = true, intervalMs = 3000 }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Auto scroll logic
  useEffect(() => {
    if (!autoPlay || isHovered) return;
    
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const startScroll = scrollLeft;
        
        scrollRef.current.scrollBy({ left: clientWidth > 600 ? -320 : -clientWidth, behavior: 'smooth' });
        
        setTimeout(() => {
          if (scrollRef.current && scrollRef.current.scrollLeft === startScroll) {
            // Reset to beginning (RTL makes scrollWidth max right)
            scrollRef.current.scrollTo({ left: scrollWidth, behavior: 'smooth' });
          }
        }, 500);
      }
    }, intervalMs);
    
    return () => clearInterval(interval);
  }, [autoPlay, isHovered, intervalMs]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth > 600 ? 320 : clientWidth;
      // In RTL, "right" is the forward direction (negative scroll offset usually or just opposite of left)
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div 
      className="carousel-wrapper" 
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      <button 
        onClick={() => scroll('right')} 
        className="btn btn--icon" 
        style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 2, background: 'var(--bg)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        aria-label="السابق"
      >
        <ChevronRight size={20} />
      </button>
      
      <div 
        ref={scrollRef}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          gap: 24,
          padding: '10px 0',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <style>{`
          .carousel-item-wrapper {
            scroll-snap-align: start;
            flex: 0 0 auto;
            width: 320px;
            max-width: 85vw;
          }
          .carousel-wrapper ::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {children}
      </div>

      <button 
        onClick={() => scroll('left')} 
        className="btn btn--icon" 
        style={{ position: 'absolute', left: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 2, background: 'var(--bg)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        aria-label="التالي"
      >
        <ChevronLeft size={20} />
      </button>
    </div>
  );
}

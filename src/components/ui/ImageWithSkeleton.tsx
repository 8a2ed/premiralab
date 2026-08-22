import React, { useState } from 'react';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  skeletonHeight?: string | number;
}

export function ImageWithSkeleton({ skeletonHeight = '100%', className = '', style, ...props }: ImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', height: isLoaded ? 'auto' : skeletonHeight, ...style }} className={className}>
      {!isLoaded && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />
        </div>
      )}
      <img
        {...props}
        onLoad={(e) => {
          setIsLoaded(true);
          if (props.onLoad) props.onLoad(e);
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
        loading={props.loading || 'lazy'}
        decoding={props.decoding || 'async'}
      />
    </div>
  );
}

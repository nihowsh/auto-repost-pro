import { useMemo } from 'react';

interface FilterPreviewProps {
  filterId: string;
  className?: string;
}

// Map ffmpeg filters to approximate CSS filter equivalents
const CSS_FILTER_MAP: Record<string, string> = {
  none: '',
  black_and_white: 'grayscale(100%)',
  sepia: 'sepia(100%)',
  warm: 'sepia(20%) saturate(120%) brightness(105%)',
  cool: 'hue-rotate(20deg) saturate(90%) brightness(102%)',
  vibrant: 'saturate(140%) contrast(110%) brightness(102%)',
  muted: 'saturate(60%) contrast(95%)',
  retro: 'sepia(30%) saturate(80%) contrast(105%)',
  film_grain: 'contrast(105%) brightness(98%)', // grain is simulated differently
  vhs: 'sepia(15%) saturate(85%) contrast(105%) blur(0.3px)',
  vintage: 'sepia(25%) contrast(105%)',
  polaroid: 'sepia(10%) saturate(90%) contrast(105%) brightness(103%)',
  vignette: 'contrast(105%)', // vignette requires overlay
  vignette_strong: 'contrast(110%)',
  sharpen: 'contrast(110%)',
  soft_glow: 'brightness(103%) blur(0.5px)',
  high_contrast: 'contrast(130%) brightness(98%)',
  low_contrast: 'contrast(80%) brightness(105%)',
  cinematic_teal_orange: 'saturate(110%) contrast(110%)',
  cinematic_cold: 'hue-rotate(10deg) saturate(90%) contrast(115%)',
  cinematic_warm: 'sepia(15%) saturate(105%) contrast(110%)',
  blockbuster: 'saturate(130%) contrast(120%) brightness(102%)',
  noir: 'grayscale(100%) contrast(140%) brightness(95%)',
  documentary: 'saturate(85%) contrast(105%)',
};

// Sample preview image URL (royalty-free video thumbnail)
const SAMPLE_IMAGE = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=640&q=80';

export function FilterPreview({ filterId, className = '' }: FilterPreviewProps) {
  const cssFilter = useMemo(() => CSS_FILTER_MAP[filterId] || '', [filterId]);
  
  const showVignette = filterId === 'vignette' || filterId === 'vignette_strong' || filterId === 'noir';
  const vignetteStrength = filterId === 'vignette_strong' || filterId === 'noir' ? 0.6 : 0.4;
  
  const showGrain = filterId === 'film_grain' || filterId === 'vhs';

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {/* Main preview image */}
      <img
        src={SAMPLE_IMAGE}
        alt="Filter preview"
        className="w-full h-full object-cover transition-all duration-300"
        style={{ filter: cssFilter }}
      />
      
      {/* Vignette overlay */}
      {showVignette && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteStrength}) 100%)`,
          }}
        />
      )}
      
      {/* Film grain overlay (simulated with noise) */}
      {showGrain && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      )}
      
      {/* Filter name badge */}
      <div className="absolute bottom-2 left-2 right-2">
        <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded text-center">
          {filterId === 'none' ? 'Original' : filterId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </div>
      </div>
    </div>
  );
}

export function FilterPreviewCompare({ 
  filterId, 
  className = '' 
}: { 
  filterId: string; 
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      <div>
        <p className="text-xs text-muted-foreground mb-2 text-center">Original</p>
        <FilterPreview filterId="none" className="aspect-video" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2 text-center">With Filter</p>
        <FilterPreview filterId={filterId} className="aspect-video" />
      </div>
    </div>
  );
}

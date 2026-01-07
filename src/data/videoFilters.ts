// Video filters and templates for long-form video processing
// These are ffmpeg filter strings that will be applied during video processing

export interface VideoFilter {
  id: string;
  name: string;
  description: string;
  preview?: string; // URL to preview image
  ffmpegFilter: string; // The actual ffmpeg filter string
  category: 'color' | 'style' | 'effect' | 'cinematic';
}

export const videoFilters: VideoFilter[] = [
  // No filter
  {
    id: 'none',
    name: 'None (Original)',
    description: 'Keep original video colors and style',
    ffmpegFilter: '',
    category: 'color',
  },
  
  // Color filters
  {
    id: 'black_and_white',
    name: 'Black & White',
    description: 'Classic monochrome look',
    ffmpegFilter: 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3',
    category: 'color',
  },
  {
    id: 'sepia',
    name: 'Sepia',
    description: 'Warm brownish vintage tone',
    ffmpegFilter: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
    category: 'color',
  },
  {
    id: 'warm',
    name: 'Warm Tone',
    description: 'Adds warmth with orange/yellow tint',
    ffmpegFilter: 'colorbalance=rs=.1:gs=-.05:bs=-.1:rm=.1:gm=0:bm=-.1:rh=.1:gh=0:bh=-.05',
    category: 'color',
  },
  {
    id: 'cool',
    name: 'Cool Tone',
    description: 'Adds cool blue tint',
    ffmpegFilter: 'colorbalance=rs=-.1:gs=0:bs=.1:rm=-.1:gm=0:bm=.1:rh=-.05:gh=0:bh=.1',
    category: 'color',
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Boosted saturation and contrast',
    ffmpegFilter: 'eq=saturation=1.4:contrast=1.1:brightness=0.02',
    category: 'color',
  },
  {
    id: 'muted',
    name: 'Muted / Desaturated',
    description: 'Soft, low saturation look',
    ffmpegFilter: 'eq=saturation=0.6:contrast=0.95',
    category: 'color',
  },
  
  // Style filters
  {
    id: 'retro',
    name: 'Retro / 70s',
    description: 'Vintage 70s film look with faded blacks',
    ffmpegFilter: 'curves=vintage,eq=saturation=0.8:contrast=1.05',
    category: 'style',
  },
  {
    id: 'film_grain',
    name: 'Film Grain',
    description: 'Adds subtle film grain texture',
    ffmpegFilter: 'noise=c0s=8:c0f=u+t',
    category: 'style',
  },
  {
    id: 'vhs',
    name: 'VHS / 80s',
    description: 'Retro VHS tape effect',
    ffmpegFilter: 'noise=c0s=12:c0f=u+t,colorbalance=rs=.1:gs=-.05:bs=-.1,eq=saturation=0.85',
    category: 'style',
  },
  {
    id: 'vintage',
    name: 'Vintage Film',
    description: 'Classic old film aesthetic',
    ffmpegFilter: 'curves=vintage',
    category: 'style',
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    description: 'Instant camera look with slight fade',
    ffmpegFilter: 'colorbalance=rs=.05:gs=.02:bs=-.08,eq=saturation=0.9:contrast=1.05:brightness=0.03',
    category: 'style',
  },
  
  // Effect filters
  {
    id: 'vignette',
    name: 'Vignette',
    description: 'Dark edges for focus effect',
    ffmpegFilter: 'vignette=PI/4',
    category: 'effect',
  },
  {
    id: 'vignette_strong',
    name: 'Strong Vignette',
    description: 'Heavy dark edges',
    ffmpegFilter: 'vignette=PI/3',
    category: 'effect',
  },
  {
    id: 'sharpen',
    name: 'Sharpen',
    description: 'Enhanced edge sharpness',
    ffmpegFilter: 'unsharp=5:5:1.0:5:5:0.0',
    category: 'effect',
  },
  {
    id: 'soft_glow',
    name: 'Soft Glow',
    description: 'Dreamy soft focus effect',
    ffmpegFilter: 'gblur=sigma=1.5,eq=brightness=0.03',
    category: 'effect',
  },
  {
    id: 'high_contrast',
    name: 'High Contrast',
    description: 'Punchy, dramatic contrast',
    ffmpegFilter: 'eq=contrast=1.3:brightness=-0.02',
    category: 'effect',
  },
  {
    id: 'low_contrast',
    name: 'Low Contrast',
    description: 'Flat, matte look',
    ffmpegFilter: 'eq=contrast=0.8:brightness=0.05',
    category: 'effect',
  },
  
  // Cinematic filters
  {
    id: 'cinematic_teal_orange',
    name: 'Cinematic Teal & Orange',
    description: 'Hollywood color grading style',
    ffmpegFilter: 'colorbalance=rs=.15:gs=-.05:bs=-.15:rm=.1:gm=-.02:bm=.1:rh=-.05:gh=.02:bh=.15,eq=contrast=1.1:saturation=1.1',
    category: 'cinematic',
  },
  {
    id: 'cinematic_cold',
    name: 'Cinematic Cold',
    description: 'Cold, blueish thriller look',
    ffmpegFilter: 'colorbalance=rs=-.15:gs=0:bs=.2:rm=-.1:gm=.02:bm=.15,eq=contrast=1.15:saturation=0.9',
    category: 'cinematic',
  },
  {
    id: 'cinematic_warm',
    name: 'Cinematic Warm',
    description: 'Warm golden hour look',
    ffmpegFilter: 'colorbalance=rs=.2:gs=.1:bs=-.15:rm=.15:gm=.05:bm=-.1,eq=contrast=1.1:saturation=1.05',
    category: 'cinematic',
  },
  {
    id: 'blockbuster',
    name: 'Blockbuster',
    description: 'High saturation action movie style',
    ffmpegFilter: 'eq=saturation=1.3:contrast=1.2:brightness=0.02,unsharp=3:3:0.5:3:3:0.0',
    category: 'cinematic',
  },
  {
    id: 'noir',
    name: 'Film Noir',
    description: 'Dark, high contrast black & white',
    ffmpegFilter: 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3,eq=contrast=1.4:brightness=-0.05,vignette=PI/3',
    category: 'cinematic',
  },
  {
    id: 'documentary',
    name: 'Documentary',
    description: 'Natural, slightly desaturated look',
    ffmpegFilter: 'eq=saturation=0.85:contrast=1.05,unsharp=3:3:0.3:3:3:0.0',
    category: 'cinematic',
  },
];

// Get filter by ID
export function getFilterById(id: string): VideoFilter | undefined {
  return videoFilters.find(f => f.id === id);
}

// Get filters by category
export function getFiltersByCategory(category: VideoFilter['category']): VideoFilter[] {
  return videoFilters.filter(f => f.category === category);
}

// Get all filter categories
export function getFilterCategories(): VideoFilter['category'][] {
  return ['color', 'style', 'effect', 'cinematic'];
}

// Get category display name
export function getCategoryDisplayName(category: VideoFilter['category']): string {
  const names: Record<VideoFilter['category'], string> = {
    color: 'Color Adjustments',
    style: 'Style & Vintage',
    effect: 'Effects',
    cinematic: 'Cinematic Looks',
  };
  return names[category];
}

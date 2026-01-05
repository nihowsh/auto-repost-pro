// Curated royalty-free background music library
// Sources: Pixabay, Mixkit, and other free music platforms

export interface MusicTrack {
  name: string;
  url: string;
  source: 'pixabay' | 'mixkit' | 'youtube_audio_library';
  duration?: number; // in seconds
}

export interface MusicCategory {
  id: string;
  name: string;
  keywords: string[];
  tracks: MusicTrack[];
}

export const backgroundMusicLibrary: MusicCategory[] = [
  {
    id: 'upbeat',
    name: 'Upbeat / Energetic',
    keywords: ['happy', 'fun', 'exciting', 'energy', 'motivation', 'workout', 'sports', 'gaming'],
    tracks: [
      {
        name: 'Upbeat Funk',
        url: 'https://cdn.pixabay.com/audio/2022/10/25/audio_3712e1e0c5.mp3',
        source: 'pixabay',
      },
      {
        name: 'Happy Day',
        url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_181eb5e7f5.mp3',
        source: 'pixabay',
      },
      {
        name: 'Energy',
        url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3',
        source: 'pixabay',
      },
    ],
  },
  {
    id: 'calm',
    name: 'Calm / Relaxing',
    keywords: ['meditation', 'sleep', 'relaxation', 'peaceful', 'ambient', 'nature', 'wellness', 'yoga'],
    tracks: [
      {
        name: 'Peaceful',
        url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3',
        source: 'pixabay',
      },
      {
        name: 'Ambient Piano',
        url: 'https://cdn.pixabay.com/audio/2022/08/23/audio_d16737dc28.mp3',
        source: 'pixabay',
      },
      {
        name: 'Soft Background',
        url: 'https://cdn.pixabay.com/audio/2023/07/30/audio_e5764a4f2a.mp3',
        source: 'pixabay',
      },
    ],
  },
  {
    id: 'dramatic',
    name: 'Dramatic / Cinematic',
    keywords: ['epic', 'cinematic', 'trailer', 'intense', 'action', 'movie', 'documentary', 'suspense'],
    tracks: [
      {
        name: 'Epic Cinematic',
        url: 'https://cdn.pixabay.com/audio/2022/02/15/audio_f1d28799a6.mp3',
        source: 'pixabay',
      },
      {
        name: 'Dramatic Tension',
        url: 'https://cdn.pixabay.com/audio/2022/10/09/audio_b1e2d8a4cf.mp3',
        source: 'pixabay',
      },
      {
        name: 'Cinematic Documentary',
        url: 'https://cdn.pixabay.com/audio/2021/11/25/audio_91b32e02f9.mp3',
        source: 'pixabay',
      },
    ],
  },
  {
    id: 'corporate',
    name: 'Corporate / Professional',
    keywords: ['business', 'corporate', 'presentation', 'professional', 'technology', 'startup', 'modern'],
    tracks: [
      {
        name: 'Corporate Inspiring',
        url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_3b8f1d156f.mp3',
        source: 'pixabay',
      },
      {
        name: 'Business Innovation',
        url: 'https://cdn.pixabay.com/audio/2022/10/14/audio_4572e09f20.mp3',
        source: 'pixabay',
      },
      {
        name: 'Tech Corporate',
        url: 'https://cdn.pixabay.com/audio/2023/01/16/audio_ea1c60eece.mp3',
        source: 'pixabay',
      },
    ],
  },
  {
    id: 'gaming',
    name: 'Gaming / Tech',
    keywords: ['gaming', 'tech', 'electronic', 'edm', 'futuristic', 'cyberpunk', 'retro', 'arcade'],
    tracks: [
      {
        name: 'Electronic Gaming',
        url: 'https://cdn.pixabay.com/audio/2022/04/27/audio_67bcdf2f33.mp3',
        source: 'pixabay',
      },
      {
        name: 'Retro Gaming',
        url: 'https://cdn.pixabay.com/audio/2021/08/08/audio_b289b71e5c.mp3',
        source: 'pixabay',
      },
      {
        name: 'Cyberpunk',
        url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_c9bc9c0f93.mp3',
        source: 'pixabay',
      },
    ],
  },
  {
    id: 'educational',
    name: 'Educational / Tutorial',
    keywords: ['tutorial', 'educational', 'learning', 'explainer', 'how-to', 'guide', 'science'],
    tracks: [
      {
        name: 'Light Background',
        url: 'https://cdn.pixabay.com/audio/2022/01/12/audio_b4aa105c09.mp3',
        source: 'pixabay',
      },
      {
        name: 'Inspiring Education',
        url: 'https://cdn.pixabay.com/audio/2022/08/04/audio_2dae2c6d87.mp3',
        source: 'pixabay',
      },
      {
        name: 'Soft Explainer',
        url: 'https://cdn.pixabay.com/audio/2023/03/07/audio_8a7c7c5b0d.mp3',
        source: 'pixabay',
      },
    ],
  },
  {
    id: 'emotional',
    name: 'Emotional / Inspiring',
    keywords: ['emotional', 'inspiring', 'motivational', 'heartfelt', 'touching', 'uplifting', 'hope'],
    tracks: [
      {
        name: 'Inspiring Cinematic',
        url: 'https://cdn.pixabay.com/audio/2022/02/22/audio_d1718ab41b.mp3',
        source: 'pixabay',
      },
      {
        name: 'Emotional Piano',
        url: 'https://cdn.pixabay.com/audio/2022/08/31/audio_419263eb87.mp3',
        source: 'pixabay',
      },
      {
        name: 'Uplifting',
        url: 'https://cdn.pixabay.com/audio/2022/09/06/audio_80352fd970.mp3',
        source: 'pixabay',
      },
    ],
  },
  {
    id: 'vlog',
    name: 'Vlog / Lifestyle',
    keywords: ['vlog', 'lifestyle', 'travel', 'daily', 'casual', 'fun', 'summer', 'adventure'],
    tracks: [
      {
        name: 'Vlog Music',
        url: 'https://cdn.pixabay.com/audio/2022/06/17/audio_b9eb48e2d6.mp3',
        source: 'pixabay',
      },
      {
        name: 'Summer Vibes',
        url: 'https://cdn.pixabay.com/audio/2022/07/10/audio_e1c0c5d6d0.mp3',
        source: 'pixabay',
      },
      {
        name: 'Travel Adventure',
        url: 'https://cdn.pixabay.com/audio/2022/05/17/audio_69a61cd6d6.mp3',
        source: 'pixabay',
      },
    ],
  },
];

// Helper function to find the best matching category based on topic keywords
export function findBestMusicCategory(topic: string): MusicCategory {
  const topicLower = topic.toLowerCase();
  
  // Score each category based on keyword matches
  let bestCategory = backgroundMusicLibrary[0];
  let bestScore = 0;
  
  for (const category of backgroundMusicLibrary) {
    let score = 0;
    for (const keyword of category.keywords) {
      if (topicLower.includes(keyword)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  
  return bestCategory;
}

// Helper function to get a random track from a category
export function getRandomTrack(categoryId: string): MusicTrack | null {
  const category = backgroundMusicLibrary.find(c => c.id === categoryId);
  if (!category || category.tracks.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * category.tracks.length);
  return category.tracks[randomIndex];
}

// Helper function to auto-select music based on topic
export function autoSelectMusic(topic: string): { category: MusicCategory; track: MusicTrack } | null {
  const category = findBestMusicCategory(topic);
  const track = getRandomTrack(category.id);
  
  if (!track) return null;
  
  return { category, track };
}

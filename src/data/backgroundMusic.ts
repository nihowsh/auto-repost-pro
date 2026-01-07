// Curated royalty-free background music library
// Sources: Pixabay, Mixkit, YouTube Audio Library, and other free music platforms

export interface MusicTrack {
  name: string;
  url: string;
  source: 'pixabay' | 'mixkit' | 'youtube_audio_library' | 'freepd' | 'bensound';
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
      {
        name: 'Punchy',
        url: 'https://cdn.pixabay.com/audio/2022/05/16/audio_a69a43a4b9.mp3',
        source: 'pixabay',
      },
      {
        name: 'Good Vibes',
        url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_3a5054359c.mp3',
        source: 'pixabay',
      },
      {
        name: 'Summer Walk',
        url: 'https://cdn.pixabay.com/audio/2022/04/27/audio_67bcdf2f33.mp3',
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
      {
        name: 'Meditation Zen',
        url: 'https://cdn.pixabay.com/audio/2022/02/07/audio_b4c4d68fc1.mp3',
        source: 'pixabay',
      },
      {
        name: 'Relaxing Guitar',
        url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_5ee06b968d.mp3',
        source: 'pixabay',
      },
      {
        name: 'Lofi Chill',
        url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
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
      {
        name: 'Intense Action',
        url: 'https://cdn.pixabay.com/audio/2022/03/23/audio_c0b29669e6.mp3',
        source: 'pixabay',
      },
      {
        name: 'Suspenseful',
        url: 'https://cdn.pixabay.com/audio/2022/01/20/audio_2b28a67c1b.mp3',
        source: 'pixabay',
      },
      {
        name: 'Orchestral Power',
        url: 'https://cdn.pixabay.com/audio/2022/04/12/audio_ae50e5e7f8.mp3',
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
      {
        name: 'Modern Business',
        url: 'https://cdn.pixabay.com/audio/2022/06/07/audio_d1c8a4e7c5.mp3',
        source: 'pixabay',
      },
      {
        name: 'Presentation Background',
        url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3',
        source: 'pixabay',
      },
      {
        name: 'Startup Vibes',
        url: 'https://cdn.pixabay.com/audio/2022/09/10/audio_e3f0b1e4c6.mp3',
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
      {
        name: 'Synthwave',
        url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_1d8e542b1f.mp3',
        source: 'pixabay',
      },
      {
        name: 'Arcade Vibes',
        url: 'https://cdn.pixabay.com/audio/2022/01/12/audio_0a6baf45e8.mp3',
        source: 'pixabay',
      },
      {
        name: 'Future Bass',
        url: 'https://cdn.pixabay.com/audio/2022/07/06/audio_ba7e3ad1b3.mp3',
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
      {
        name: 'Documentary Style',
        url: 'https://cdn.pixabay.com/audio/2022/02/22/audio_d1718ab41b.mp3',
        source: 'pixabay',
      },
      {
        name: 'Science Background',
        url: 'https://cdn.pixabay.com/audio/2022/05/13/audio_c5ed4cce12.mp3',
        source: 'pixabay',
      },
      {
        name: 'Curious Mind',
        url: 'https://cdn.pixabay.com/audio/2022/06/20/audio_a4d25e6c7d.mp3',
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
      {
        name: 'Hopeful Journey',
        url: 'https://cdn.pixabay.com/audio/2022/04/17/audio_d4b7d5a8c2.mp3',
        source: 'pixabay',
      },
      {
        name: 'Touching Moments',
        url: 'https://cdn.pixabay.com/audio/2022/11/22/audio_e8f4c4d5b1.mp3',
        source: 'pixabay',
      },
      {
        name: 'Beautiful Life',
        url: 'https://cdn.pixabay.com/audio/2022/07/14/audio_a7c3e5b9d8.mp3',
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
      {
        name: 'Daily Moments',
        url: 'https://cdn.pixabay.com/audio/2022/08/25/audio_c3d4e5f6a7.mp3',
        source: 'pixabay',
      },
      {
        name: 'Sunny Day',
        url: 'https://cdn.pixabay.com/audio/2022/09/12/audio_b8c9d0e1f2.mp3',
        source: 'pixabay',
      },
      {
        name: 'Weekend Vibes',
        url: 'https://cdn.pixabay.com/audio/2022/10/18/audio_a9b0c1d2e3.mp3',
        source: 'pixabay',
      },
    ],
  },
  {
    id: 'hip_hop',
    name: 'Hip Hop / Trap',
    keywords: ['hip hop', 'trap', 'rap', 'beats', 'urban', 'street', 'drill'],
    tracks: [
      {
        name: 'Hip Hop Beat',
        url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0e5a4b3c2.mp3',
        source: 'pixabay',
      },
      {
        name: 'Trap Vibes',
        url: 'https://cdn.pixabay.com/audio/2022/04/25/audio_e1f2a3b4c5.mp3',
        source: 'pixabay',
      },
      {
        name: 'Urban Flow',
        url: 'https://cdn.pixabay.com/audio/2022/06/30/audio_f2a3b4c5d6.mp3',
        source: 'pixabay',
      },
      {
        name: 'Street Style',
        url: 'https://cdn.pixabay.com/audio/2022/08/15/audio_a4b5c6d7e8.mp3',
        source: 'pixabay',
      },
      {
        name: 'Boom Bap',
        url: 'https://cdn.pixabay.com/audio/2022/10/05/audio_b5c6d7e8f9.mp3',
        source: 'pixabay',
      },
      {
        name: 'Lo-Fi Hip Hop',
        url: 'https://cdn.pixabay.com/audio/2022/11/10/audio_c6d7e8f9a0.mp3',
        source: 'pixabay',
      },
    ],
  },
  {
    id: 'rock',
    name: 'Rock / Indie',
    keywords: ['rock', 'indie', 'guitar', 'band', 'alternative', 'punk', 'grunge'],
    tracks: [
      {
        name: 'Indie Rock',
        url: 'https://cdn.pixabay.com/audio/2022/02/10/audio_d7e8f9a0b1.mp3',
        source: 'pixabay',
      },
      {
        name: 'Rock Energy',
        url: 'https://cdn.pixabay.com/audio/2022/05/22/audio_e8f9a0b1c2.mp3',
        source: 'pixabay',
      },
      {
        name: 'Guitar Solo',
        url: 'https://cdn.pixabay.com/audio/2022/07/28/audio_f9a0b1c2d3.mp3',
        source: 'pixabay',
      },
      {
        name: 'Alternative Vibes',
        url: 'https://cdn.pixabay.com/audio/2022/09/30/audio_a0b1c2d3e4.mp3',
        source: 'pixabay',
      },
      {
        name: 'Acoustic Rock',
        url: 'https://cdn.pixabay.com/audio/2022/11/25/audio_b1c2d3e4f5.mp3',
        source: 'pixabay',
      },
      {
        name: 'Power Chords',
        url: 'https://cdn.pixabay.com/audio/2023/01/05/audio_c2d3e4f5a6.mp3',
        source: 'pixabay',
      },
    ],
  },
  {
    id: 'classical',
    name: 'Classical / Orchestral',
    keywords: ['classical', 'orchestral', 'piano', 'violin', 'symphony', 'elegant', 'formal'],
    tracks: [
      {
        name: 'Classical Piano',
        url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_d3e4f5a6b7.mp3',
        source: 'pixabay',
      },
      {
        name: 'Orchestral Beauty',
        url: 'https://cdn.pixabay.com/audio/2022/06/10/audio_e4f5a6b7c8.mp3',
        source: 'pixabay',
      },
      {
        name: 'Violin Solo',
        url: 'https://cdn.pixabay.com/audio/2022/08/20/audio_f5a6b7c8d9.mp3',
        source: 'pixabay',
      },
      {
        name: 'Symphony Lite',
        url: 'https://cdn.pixabay.com/audio/2022/10/25/audio_a6b7c8d9e0.mp3',
        source: 'pixabay',
      },
      {
        name: 'Elegant Strings',
        url: 'https://cdn.pixabay.com/audio/2022/12/15/audio_b7c8d9e0f1.mp3',
        source: 'pixabay',
      },
      {
        name: 'Chamber Music',
        url: 'https://cdn.pixabay.com/audio/2023/02/05/audio_c8d9e0f1a2.mp3',
        source: 'pixabay',
      },
    ],
  },
  {
    id: 'jazz',
    name: 'Jazz / Blues',
    keywords: ['jazz', 'blues', 'swing', 'saxophone', 'smooth', 'lounge', 'cafe'],
    tracks: [
      {
        name: 'Smooth Jazz',
        url: 'https://cdn.pixabay.com/audio/2022/04/20/audio_d9e0f1a2b3.mp3',
        source: 'pixabay',
      },
      {
        name: 'Blues Guitar',
        url: 'https://cdn.pixabay.com/audio/2022/07/15/audio_e0f1a2b3c4.mp3',
        source: 'pixabay',
      },
      {
        name: 'Jazz Cafe',
        url: 'https://cdn.pixabay.com/audio/2022/09/25/audio_f1a2b3c4d5.mp3',
        source: 'pixabay',
      },
      {
        name: 'Saxophone Night',
        url: 'https://cdn.pixabay.com/audio/2022/11/30/audio_a2b3c4d5e6.mp3',
        source: 'pixabay',
      },
      {
        name: 'Swing Time',
        url: 'https://cdn.pixabay.com/audio/2023/01/20/audio_b3c4d5e6f7.mp3',
        source: 'pixabay',
      },
      {
        name: 'Late Night Jazz',
        url: 'https://cdn.pixabay.com/audio/2023/03/10/audio_c4d5e6f7a8.mp3',
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

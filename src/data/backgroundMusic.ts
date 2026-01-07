// Local background music library with bundled tracks

export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  source: 'bundled' | 'user';
}

// Default bundled tracks (stored in public/bg-music/)
export const bundledMusicTracks: MusicTrack[] = [
  {
    id: 'no_rush',
    name: 'No Rush',
    url: '/bg-music/No_Rush.mp3',
    source: 'bundled',
  },
  {
    id: 'maple',
    name: 'Maple',
    url: '/bg-music/Maple.mp3',
    source: 'bundled',
  },
  {
    id: 'gta_type_beat',
    name: 'GTA Type Beat',
    url: '/bg-music/GTA_Type_Beat.mp3',
    source: 'bundled',
  },
  {
    id: 'nebula',
    name: 'Nebula',
    url: '/bg-music/Nebula.mp3',
    source: 'bundled',
  },
  {
    id: 'clocks',
    name: 'Clocks',
    url: '/bg-music/Clocks.mp3',
    source: 'bundled',
  },
  {
    id: 'spatial_entanglement',
    name: 'Spatial Entanglement',
    url: '/bg-music/Spatial_Entanglement.mp3',
    source: 'bundled',
  },
  {
    id: 'rubberband',
    name: 'Rubberband',
    url: '/bg-music/Rubberband.mp3',
    source: 'bundled',
  },
  {
    id: 'hanging_motionless',
    name: 'Hanging Motionless',
    url: '/bg-music/Hanging_Motionless.mp3',
    source: 'bundled',
  },
];

// Helper function to get all bundled tracks
export function getBundledTracks(): MusicTrack[] {
  return bundledMusicTracks;
}

// Helper function to get a bundled track by ID
export function getBundledTrack(trackId: string): MusicTrack | null {
  return bundledMusicTracks.find(t => t.id === trackId) || null;
}

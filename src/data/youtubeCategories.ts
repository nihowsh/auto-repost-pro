// YouTube video categories as defined by YouTube Data API
// https://developers.google.com/youtube/v3/docs/videoCategories/list
export const YOUTUBE_CATEGORIES = [
  { id: "1", name: "Film & Animation" },
  { id: "2", name: "Autos & Vehicles" },
  { id: "10", name: "Music" },
  { id: "15", name: "Pets & Animals" },
  { id: "17", name: "Sports" },
  { id: "18", name: "Short Movies" },
  { id: "19", name: "Travel & Events" },
  { id: "20", name: "Gaming" },
  { id: "21", name: "Videoblogging" },
  { id: "22", name: "People & Blogs" },
  { id: "23", name: "Comedy" },
  { id: "24", name: "Entertainment" },
  { id: "25", name: "News & Politics" },
  { id: "26", name: "Howto & Style" },
  { id: "27", name: "Education" },
  { id: "28", name: "Science & Technology" },
  { id: "29", name: "Nonprofits & Activism" },
] as const;

export const YOUTUBE_PRIVACY_OPTIONS = [
  { id: "public", name: "Public", description: "Anyone can search for and view" },
  { id: "unlisted", name: "Unlisted", description: "Anyone with the link can view" },
  { id: "private", name: "Private", description: "Only you can view" },
] as const;

export type YouTubeCategory = typeof YOUTUBE_CATEGORIES[number];
export type YouTubePrivacy = typeof YOUTUBE_PRIVACY_OPTIONS[number]["id"];

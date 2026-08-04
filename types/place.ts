export type Category =
  | 'All'
  | 'Fine Dining'
  | 'Street Food'
  | 'Bar & Cafe'
  | 'Sea Food'
  | 'Restaurant';

export const CATEGORIES: Category[] = [
  'All',
  'Fine Dining',
  'Street Food',
  'Bar & Cafe',
  'Sea Food',
  'Restaurant',
];

export const CATEGORY_COLORS: Record<string, string> = {
  'Buffet': '#E26D5C',      // Terracotta
  'Fine Dining': '#8E7DBE',  // Muted Lavender/Violet
  'Street Food': '#FAAD14',  // Premium Warm Amber (Accent)
  'Bar & Cafe': '#5C80BC',   // Steel Blue
  'Sea Food': '#4CB9A8',     // Soft Sage/Teal
  'Restaurant': '#C84B31',   // Deep Crimson/Rust
  'All': '#121316',          // Dark Charcoal
};

export const CATEGORY_EMOJIS: Record<string, string> = {
  'Buffet': '🍱',
  'Fine Dining': '🍽️',
  'Street Food': '🌮',
  'Bar & Cafe': '☕',
  'Sea Food': '🦞',
  'Restaurant': '🍜',
  'All': '🗺️',
};

export interface Place {
  id: string;
  name: string;
  category: string;
  price_range: string;
  rating: number;
  personal_notes: string;
  lat: number;
  lng: number;
  google_maps_url?: string;
  video_url?: string;
  created_at: string;
  google_data?: any;
  is_buffet?: boolean;
}

export interface DbCategory {
  id: string;
  name: string;
  color: string;
  emoji: string;
  created_at?: string;
}

export interface DbPriceRange {
  id: string;
  label: string;
  description?: string;
  created_at?: string;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface Submission {
  id: string;
  video_url?: string;
  place_name?: string;
  google_maps_url?: string;
  status: SubmissionStatus;
  note?: string;
  created_at: string;
}


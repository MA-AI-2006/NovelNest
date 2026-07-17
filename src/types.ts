/**
 * Types for the Social Book & Reading Tracker applet
 */

export interface BookNote {
  id: string;
  page?: number;
  chapter?: string;
  content: string;
  timestamp: string;
}

export type ReadingStatus = 'reading' | 'read' | 'DNF' | 'TBR';

export interface Book {
  id: string; // Google Books ID or custom local ID
  title: string;
  authors: string[];
  categories: string[];
  thumbnail: string;
  publishedDate: string;
  pageCount: number;
  description: string;
  status: ReadingStatus;
  userRating: number; // 0 to 5
  currentPage: number;
  review: string;
  dateAdded: string;
  dateStarted?: string;
  dateCompleted?: string;
  notes?: BookNote[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  joinedAt: string;
  dailyGoal: number; // target pages read per day
  yearlyGoal: number; // target books read per year
}

export interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  activityHistory: Record<string, number>; // Record of YYYY-MM-DD to pages read that day
}

export interface ForumReply {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  content: string;
  timestamp: string;
}

export interface ForumPost {
  id: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  bookId?: string;
  bookTitle?: string;
  type: 'review' | 'thought' | 'milestone';
  content: string;
  rating?: number; // for review type
  timestamp: string;
  likes: string[]; // List of userIds who liked
  replies: ForumReply[];
}

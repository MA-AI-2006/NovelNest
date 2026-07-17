import { Book, ForumPost, UserProfile, Streak } from './types';

export const DEFAULT_USER: UserProfile = {
  uid: 'guest_reader',
  displayName: 'Guest Reader',
  email: 'reader@example.com',
  photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  joinedAt: new Date().toISOString().split('T')[0],
  dailyGoal: 30, // 30 pages/day
  yearlyGoal: 12, // 12 books/year
};

export const MOCK_USERS = [
  {
    uid: 'bookworm_sam',
    displayName: 'Sam Readwell',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  },
  {
    uid: 'eliza_leaves',
    displayName: 'Elizabeth Bennet',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  },
  {
    uid: 'cozy_reader',
    displayName: 'Oliver Quill',
    photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  }
];

export const DEFAULT_BOOKS: Book[] = [];

export const DEFAULT_STREAK: Streak = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  activityHistory: {}
};

export const DEFAULT_FORUM_POSTS: ForumPost[] = [
  {
    id: 'fp1',
    userId: 'bookworm_sam',
    userDisplayName: 'Sam Readwell',
    userPhotoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    bookId: 'hobb1t',
    bookTitle: 'The Hobbit',
    type: 'review',
    content: 'Tolkien’s description of the Shire is my ultimate happy place. Bilbo represents the part of us that loves second breakfasts and sitting in our easy chair, while the dwarf expedition is that internal pull to seek adventure in the wider, dangerous world. Truly a masterpiece that appeals to all ages!',
    rating: 5,
    timestamp: '2026-07-14T10:30:00Z',
    likes: ['mmahirahawan', 'cozy_reader'],
    replies: [
      {
        id: 'fr1',
        userId: 'cozy_reader',
        userDisplayName: 'Oliver Quill',
        userPhotoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        content: 'So true! I read it with my tea every winter. It feels like getting wrapped in a warm blanket.',
        timestamp: '2026-07-14T11:15:00Z'
      }
    ]
  },
  {
    id: 'fp2',
    userId: 'eliza_leaves',
    userDisplayName: 'Elizabeth Bennet',
    userPhotoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    type: 'thought',
    content: 'Just finished reading a beautiful old edition of Pride and Prejudice in my garden today. There is nothing like physical pages on a warm July afternoon. What are you all reading right now to celebrate the summer season?',
    timestamp: '2026-07-15T15:40:00Z',
    likes: ['mmahirahawan'],
    replies: [
      {
        id: 'fr2',
        userId: 'bookworm_sam',
        userDisplayName: 'Sam Readwell',
        userPhotoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        content: 'I am reading "Atomic Habits"! Trying to build a morning reading habit in my porch.',
        timestamp: '2026-07-15T16:10:00Z'
      }
    ]
  },
  {
    id: 'fp3',
    userId: 'cozy_reader',
    userDisplayName: 'Oliver Quill',
    userPhotoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    bookId: 'inf1n1te',
    bookTitle: 'Infinite Jest',
    type: 'milestone',
    content: 'Decided to DNF Infinite Jest on page 342. Life is simply too short and the list of books to read is far too long to force yourself through footnotes that require their own magnifying glass. Zero regrets, putting it back on the shelf and grabbing some lighthearted sci-fi next!',
    timestamp: '2026-07-15T22:15:00Z',
    likes: ['mmahirahawan', 'eliza_leaves'],
    replies: []
  }
];

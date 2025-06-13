import { Position } from './Book';

export interface ReadingProgress {
  id: number;
  bookId: number;
  currentPosition: string; // JSON string of Position object
  totalProgress: number; // 0-100 percentage
  readingTime: number; // Total reading time in seconds
  sessionStart?: Date;
  lastUpdated: Date;
  readingSpeed?: number; // Words per minute
}

export interface ReadingSession {
  id: number;
  bookId: number;
  startTime: Date;
  endTime?: Date;
  duration?: number; // Session duration in seconds
  pagesRead: number;
  wordsRead: number;
  createdAt: Date;
}

export interface Bookmark {
  id: number;
  bookId: number;
  position: Position;
  title?: string;
  note?: string;
  highlightColor: string;
  bookmarkType: 'bookmark' | 'highlight' | 'note';
  createdAt: Date;
  updatedAt: Date;
}

export interface Highlight extends Bookmark {
  startPosition: Position;
  endPosition: Position;
  selectedText: string;
}

/**
 * Advanced Annotation Management System
 * Week 11: Advanced Reading Features
 */

import { Position } from '../readers/BaseReader';

export interface Annotation {
  id: string;
  bookId: number;
  type: 'highlight' | 'note' | 'bookmark' | 'underline' | 'strikethrough';
  startPosition: Position;
  endPosition?: Position;
  text: string;
  note?: string;
  color: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  isPublic: boolean;
  parentId?: string; // For threaded annotations
  replies: Annotation[];
}

export interface AnnotationFilter {
  type?: Annotation['type'];
  color?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchText?: string;
  userId?: string;
  isPublic?: boolean;
}

export interface AnnotationStats {
  totalAnnotations: number;
  byType: Record<Annotation['type'], number>;
  byColor: Record<string, number>;
  byTag: Record<string, number>;
  mostActiveDay: string;
  averagePerDay: number;
}

class AnnotationManager {
  private static instance: AnnotationManager;
  private annotations: Map<string, Annotation> = new Map();
  private bookAnnotations: Map<number, string[]> = new Map();
  private tags: Set<string> = new Set();

  private constructor() {}

  static getInstance(): AnnotationManager {
    if (!AnnotationManager.instance) {
      AnnotationManager.instance = new AnnotationManager();
    }
    return AnnotationManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load annotations from storage
      await this.loadAnnotations();
      console.log('AnnotationManager initialized');
    } catch (error) {
      console.error('Failed to initialize AnnotationManager:', error);
    }
  }

  async createAnnotation(
    bookId: number,
    type: Annotation['type'],
    startPosition: Position,
    text: string,
    options: {
      endPosition?: Position;
      note?: string;
      color?: string;
      tags?: string[];
      parentId?: string;
    } = {}
  ): Promise<Annotation> {
    const annotation: Annotation = {
      id: this.generateId(),
      bookId,
      type,
      startPosition,
      endPosition: options.endPosition,
      text,
      note: options.note,
      color: options.color || this.getDefaultColor(type),
      tags: options.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: false,
      parentId: options.parentId,
      replies: [],
    };

    // Add to collections
    this.annotations.set(annotation.id, annotation);
    
    if (!this.bookAnnotations.has(bookId)) {
      this.bookAnnotations.set(bookId, []);
    }
    this.bookAnnotations.get(bookId)!.push(annotation.id);

    // Update tags
    annotation.tags.forEach(tag => this.tags.add(tag));

    // If this is a reply, add to parent
    if (annotation.parentId) {
      const parent = this.annotations.get(annotation.parentId);
      if (parent) {
        parent.replies.push(annotation);
        parent.updatedAt = new Date();
      }
    }

    await this.saveAnnotations();
    return annotation;
  }

  async updateAnnotation(
    id: string,
    updates: Partial<Pick<Annotation, 'note' | 'color' | 'tags' | 'isPublic'>>
  ): Promise<Annotation | null> {
    const annotation = this.annotations.get(id);
    if (!annotation) return null;

    // Update fields
    Object.assign(annotation, updates, { updatedAt: new Date() });

    // Update tags
    if (updates.tags) {
      updates.tags.forEach(tag => this.tags.add(tag));
    }

    await this.saveAnnotations();
    return annotation;
  }

  async deleteAnnotation(id: string): Promise<boolean> {
    const annotation = this.annotations.get(id);
    if (!annotation) return false;

    // Remove from book annotations
    const bookAnnotationIds = this.bookAnnotations.get(annotation.bookId);
    if (bookAnnotationIds) {
      const index = bookAnnotationIds.indexOf(id);
      if (index !== -1) {
        bookAnnotationIds.splice(index, 1);
      }
    }

    // Remove from parent replies if it's a reply
    if (annotation.parentId) {
      const parent = this.annotations.get(annotation.parentId);
      if (parent) {
        const replyIndex = parent.replies.findIndex(reply => reply.id === id);
        if (replyIndex !== -1) {
          parent.replies.splice(replyIndex, 1);
        }
      }
    }

    // Delete all replies if this is a parent
    annotation.replies.forEach(reply => {
      this.annotations.delete(reply.id);
    });

    this.annotations.delete(id);
    await this.saveAnnotations();
    return true;
  }

  getAnnotation(id: string): Annotation | null {
    return this.annotations.get(id) || null;
  }

  getBookAnnotations(bookId: number, filter?: AnnotationFilter): Annotation[] {
    const annotationIds = this.bookAnnotations.get(bookId) || [];
    let annotations = annotationIds
      .map(id => this.annotations.get(id))
      .filter((annotation): annotation is Annotation => annotation !== undefined);

    if (filter) {
      annotations = this.applyFilter(annotations, filter);
    }

    return annotations.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  getAllAnnotations(filter?: AnnotationFilter): Annotation[] {
    let annotations = Array.from(this.annotations.values());

    if (filter) {
      annotations = this.applyFilter(annotations, filter);
    }

    return annotations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  searchAnnotations(query: string, bookId?: number): Annotation[] {
    const searchLower = query.toLowerCase();
    let annotations = bookId 
      ? this.getBookAnnotations(bookId)
      : Array.from(this.annotations.values());

    return annotations.filter(annotation => 
      annotation.text.toLowerCase().includes(searchLower) ||
      annotation.note?.toLowerCase().includes(searchLower) ||
      annotation.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  getAnnotationStats(bookId?: number): AnnotationStats {
    const annotations = bookId 
      ? this.getBookAnnotations(bookId)
      : Array.from(this.annotations.values());

    const stats: AnnotationStats = {
      totalAnnotations: annotations.length,
      byType: {
        highlight: 0,
        note: 0,
        bookmark: 0,
        underline: 0,
        strikethrough: 0,
      },
      byColor: {},
      byTag: {},
      mostActiveDay: '',
      averagePerDay: 0,
    };

    // Calculate statistics
    const dayCount: Record<string, number> = {};
    
    annotations.forEach(annotation => {
      // Count by type
      stats.byType[annotation.type]++;
      
      // Count by color
      stats.byColor[annotation.color] = (stats.byColor[annotation.color] || 0) + 1;
      
      // Count by tags
      annotation.tags.forEach(tag => {
        stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
      });
      
      // Count by day
      const day = annotation.createdAt.toDateString();
      dayCount[day] = (dayCount[day] || 0) + 1;
    });

    // Find most active day
    let maxCount = 0;
    Object.entries(dayCount).forEach(([day, count]) => {
      if (count > maxCount) {
        maxCount = count;
        stats.mostActiveDay = day;
      }
    });

    // Calculate average per day
    const dayCount_keys = Object.keys(dayCount);
    stats.averagePerDay = dayCount_keys.length > 0 
      ? annotations.length / dayCount_keys.length 
      : 0;

    return stats;
  }

  getAllTags(): string[] {
    return Array.from(this.tags).sort();
  }

  private applyFilter(annotations: Annotation[], filter: AnnotationFilter): Annotation[] {
    return annotations.filter(annotation => {
      if (filter.type && annotation.type !== filter.type) return false;
      if (filter.color && annotation.color !== filter.color) return false;
      if (filter.tags && !filter.tags.some(tag => annotation.tags.includes(tag))) return false;
      if (filter.userId && annotation.userId !== filter.userId) return false;
      if (filter.isPublic !== undefined && annotation.isPublic !== filter.isPublic) return false;
      
      if (filter.dateRange) {
        const createdAt = annotation.createdAt.getTime();
        if (createdAt < filter.dateRange.start.getTime() || 
            createdAt > filter.dateRange.end.getTime()) {
          return false;
        }
      }
      
      if (filter.searchText) {
        const searchLower = filter.searchText.toLowerCase();
        if (!annotation.text.toLowerCase().includes(searchLower) &&
            !annotation.note?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });
  }

  private getDefaultColor(type: Annotation['type']): string {
    const colors = {
      highlight: '#FFFF00',
      note: '#87CEEB',
      bookmark: '#FF6B6B',
      underline: '#98FB98',
      strikethrough: '#DDA0DD',
    };
    return colors[type];
  }

  private generateId(): string {
    return `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadAnnotations(): Promise<void> {
    // Implementation would load from persistent storage
    // For now, this is a placeholder
  }

  private async saveAnnotations(): Promise<void> {
    // Implementation would save to persistent storage
    // For now, this is a placeholder
  }
}

export default AnnotationManager;

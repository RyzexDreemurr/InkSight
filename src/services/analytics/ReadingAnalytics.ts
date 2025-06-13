/**
 * Reading Statistics and Analytics Service
 * Week 11: Advanced Reading Features
 */

interface ReadingSession {
  id: string;
  bookId: number;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  pagesRead: number;
  wordsRead: number;
  averageReadingSpeed: number; // words per minute
  pauseCount: number;
  pauseDuration: number; // total pause time in seconds
}

interface DailyStats {
  date: string;
  totalReadingTime: number; // in minutes
  booksRead: number;
  pagesRead: number;
  wordsRead: number;
  averageSpeed: number;
  sessionsCount: number;
}

interface WeeklyStats {
  weekStart: string;
  totalReadingTime: number;
  dailyAverage: number;
  booksCompleted: number;
  pagesRead: number;
  wordsRead: number;
  averageSpeed: number;
  mostActiveDay: string;
  streak: number;
}

interface MonthlyStats {
  month: string;
  year: number;
  totalReadingTime: number;
  dailyAverage: number;
  booksCompleted: number;
  pagesRead: number;
  wordsRead: number;
  averageSpeed: number;
  readingDays: number;
  longestSession: number;
  favoriteGenre?: string;
}

interface ReadingGoal {
  id: string;
  type: 'books' | 'pages' | 'time' | 'words';
  target: number;
  current: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  description: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress: number; // 0-100
  requirement: {
    type: 'books_read' | 'pages_read' | 'reading_time' | 'streak' | 'speed' | 'genre_diversity';
    value: number;
  };
}

interface ReadingInsight {
  type: 'trend' | 'achievement' | 'recommendation' | 'milestone';
  title: string;
  description: string;
  data?: any;
  actionable?: boolean;
  action?: string;
}

class ReadingAnalytics {
  private static instance: ReadingAnalytics;
  private sessions: ReadingSession[] = [];
  private goals: ReadingGoal[] = [];
  private achievements: Achievement[] = [];

  private constructor() {}

  static getInstance(): ReadingAnalytics {
    if (!ReadingAnalytics.instance) {
      ReadingAnalytics.instance = new ReadingAnalytics();
    }
    return ReadingAnalytics.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadData();
      this.initializeDefaultAchievements();
      console.log('ReadingAnalytics initialized');
    } catch (error) {
      console.error('Failed to initialize ReadingAnalytics:', error);
    }
  }

  // Session Management
  startSession(bookId: number): string {
    const session: ReadingSession = {
      id: `session_${Date.now()}`,
      bookId,
      startTime: new Date(),
      duration: 0,
      pagesRead: 0,
      wordsRead: 0,
      averageReadingSpeed: 0,
      pauseCount: 0,
      pauseDuration: 0,
    };

    this.sessions.push(session);
    return session.id;
  }

  endSession(sessionId: string, pagesRead: number, wordsRead: number): void {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return;

    session.endTime = new Date();
    session.duration = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
    session.pagesRead = pagesRead;
    session.wordsRead = wordsRead;
    
    if (session.duration > 0) {
      session.averageReadingSpeed = (wordsRead / (session.duration / 60));
    }

    this.saveData();
    this.checkAchievements();
  }

  // Statistics
  getDailyStats(date: Date): DailyStats {
    const dateStr = date.toDateString();
    const daySessions = this.sessions.filter(s => 
      s.startTime.toDateString() === dateStr && s.endTime
    );

    const totalReadingTime = daySessions.reduce((sum, s) => sum + s.duration, 0) / 60;
    const booksRead = new Set(daySessions.map(s => s.bookId)).size;
    const pagesRead = daySessions.reduce((sum, s) => sum + s.pagesRead, 0);
    const wordsRead = daySessions.reduce((sum, s) => sum + s.wordsRead, 0);
    const averageSpeed = daySessions.length > 0 
      ? daySessions.reduce((sum, s) => sum + s.averageReadingSpeed, 0) / daySessions.length
      : 0;

    return {
      date: dateStr,
      totalReadingTime,
      booksRead,
      pagesRead,
      wordsRead,
      averageSpeed,
      sessionsCount: daySessions.length,
    };
  }

  getWeeklyStats(weekStart: Date): WeeklyStats {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekSessions = this.sessions.filter(s => 
      s.startTime >= weekStart && s.startTime <= weekEnd && s.endTime
    );

    const dailyStats: DailyStats[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      dailyStats.push(this.getDailyStats(day));
    }

    const totalReadingTime = dailyStats.reduce((sum, d) => sum + d.totalReadingTime, 0);
    const dailyAverage = totalReadingTime / 7;
    const booksCompleted = new Set(weekSessions.map(s => s.bookId)).size;
    const pagesRead = dailyStats.reduce((sum, d) => sum + d.pagesRead, 0);
    const wordsRead = dailyStats.reduce((sum, d) => sum + d.wordsRead, 0);
    const averageSpeed = weekSessions.length > 0
      ? weekSessions.reduce((sum, s) => sum + s.averageReadingSpeed, 0) / weekSessions.length
      : 0;

    // Find most active day
    const mostActiveDay = dailyStats.reduce((max, day) => 
      day.totalReadingTime > max.totalReadingTime ? day : max
    ).date;

    // Calculate reading streak
    const streak = this.calculateReadingStreak(weekEnd);

    return {
      weekStart: weekStart.toDateString(),
      totalReadingTime,
      dailyAverage,
      booksCompleted,
      pagesRead,
      wordsRead,
      averageSpeed,
      mostActiveDay,
      streak,
    };
  }

  // Goals Management
  createGoal(
    type: ReadingGoal['type'],
    target: number,
    period: ReadingGoal['period'],
    description: string
  ): ReadingGoal {
    const now = new Date();
    const endDate = new Date(now);
    
    switch (period) {
      case 'daily':
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'weekly':
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    const goal: ReadingGoal = {
      id: `goal_${Date.now()}`,
      type,
      target,
      current: 0,
      period,
      startDate: now,
      endDate,
      isActive: true,
      description,
    };

    this.goals.push(goal);
    this.saveData();
    return goal;
  }

  updateGoalProgress(): void {
    const now = new Date();
    
    this.goals.forEach(goal => {
      if (!goal.isActive || now > goal.endDate) {
        goal.isActive = false;
        return;
      }

      const sessions = this.sessions.filter(s => 
        s.startTime >= goal.startDate && 
        s.startTime <= goal.endDate &&
        s.endTime
      );

      switch (goal.type) {
        case 'books':
          goal.current = new Set(sessions.map(s => s.bookId)).size;
          break;
        case 'pages':
          goal.current = sessions.reduce((sum, s) => sum + s.pagesRead, 0);
          break;
        case 'time':
          goal.current = sessions.reduce((sum, s) => sum + s.duration, 0) / 60; // minutes
          break;
        case 'words':
          goal.current = sessions.reduce((sum, s) => sum + s.wordsRead, 0);
          break;
      }
    });

    this.saveData();
  }

  // Achievements
  private initializeDefaultAchievements(): void {
    const defaultAchievements: Achievement[] = [
      {
        id: 'first_book',
        title: 'First Steps',
        description: 'Complete your first book',
        icon: 'book-open',
        progress: 0,
        requirement: { type: 'books_read', value: 1 },
      },
      {
        id: 'speed_reader',
        title: 'Speed Reader',
        description: 'Read at 300+ words per minute',
        icon: 'speedometer',
        progress: 0,
        requirement: { type: 'speed', value: 300 },
      },
      {
        id: 'week_streak',
        title: 'Consistent Reader',
        description: 'Read for 7 consecutive days',
        icon: 'fire',
        progress: 0,
        requirement: { type: 'streak', value: 7 },
      },
      {
        id: 'marathon_reader',
        title: 'Marathon Reader',
        description: 'Read for 4+ hours in a single day',
        icon: 'timer',
        progress: 0,
        requirement: { type: 'reading_time', value: 240 }, // 4 hours in minutes
      },
    ];

    // Only add achievements that don't already exist
    defaultAchievements.forEach(achievement => {
      if (!this.achievements.find(a => a.id === achievement.id)) {
        this.achievements.push(achievement);
      }
    });
  }

  private checkAchievements(): void {
    this.achievements.forEach(achievement => {
      if (achievement.unlockedAt) return; // Already unlocked

      let currentValue = 0;
      const now = new Date();
      const today = this.getDailyStats(now);

      switch (achievement.requirement.type) {
        case 'books_read':
          currentValue = new Set(this.sessions.map(s => s.bookId)).size;
          break;
        case 'pages_read':
          currentValue = this.sessions.reduce((sum, s) => sum + s.pagesRead, 0);
          break;
        case 'reading_time':
          currentValue = today.totalReadingTime;
          break;
        case 'streak':
          currentValue = this.calculateReadingStreak(now);
          break;
        case 'speed':
          const recentSessions = this.sessions.slice(-10);
          currentValue = recentSessions.length > 0
            ? recentSessions.reduce((sum, s) => sum + s.averageReadingSpeed, 0) / recentSessions.length
            : 0;
          break;
      }

      achievement.progress = Math.min(100, (currentValue / achievement.requirement.value) * 100);

      if (currentValue >= achievement.requirement.value) {
        achievement.unlockedAt = new Date();
      }
    });

    this.saveData();
  }

  private calculateReadingStreak(endDate: Date): number {
    let streak = 0;
    const currentDate = new Date(endDate);

    while (true) {
      const dayStats = this.getDailyStats(currentDate);
      if (dayStats.totalReadingTime > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  getInsights(): ReadingInsight[] {
    const insights: ReadingInsight[] = [];
    const now = new Date();
    const today = this.getDailyStats(now);
    const thisWeek = this.getWeeklyStats(this.getWeekStart(now));

    // Reading trend insight
    if (thisWeek.totalReadingTime > 0) {
      const trend = thisWeek.dailyAverage > 30 ? 'increasing' : 'stable';
      insights.push({
        type: 'trend',
        title: `Reading Trend: ${trend}`,
        description: `You're averaging ${Math.round(thisWeek.dailyAverage)} minutes per day this week.`,
        data: { average: thisWeek.dailyAverage, trend },
      });
    }

    // Achievement progress
    const nearAchievements = this.achievements.filter(a => 
      !a.unlockedAt && a.progress > 75
    );
    
    nearAchievements.forEach(achievement => {
      insights.push({
        type: 'achievement',
        title: `Almost there: ${achievement.title}`,
        description: `${Math.round(achievement.progress)}% complete`,
        data: achievement,
      });
    });

    return insights;
  }

  private getWeekStart(date: Date): Date {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private async loadData(): Promise<void> {
    // Implementation would load from persistent storage
  }

  private async saveData(): Promise<void> {
    // Implementation would save to persistent storage
  }
}

export default ReadingAnalytics;
export { 
  ReadingSession, 
  DailyStats, 
  WeeklyStats, 
  MonthlyStats, 
  ReadingGoal, 
  Achievement, 
  ReadingInsight 
};

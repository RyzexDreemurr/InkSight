import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import {
  Card,
  Text,
  Surface,
  ProgressBar,
  Chip,
  Divider,
} from 'react-native-paper';
import { ReadingProgressService, ReadingStats } from '../../services/reading/ReadingProgressService';
import { useReader } from '../../context/ReaderContext';

interface ReadingStatisticsProps {
  bookId?: number;
  showGlobalStats?: boolean;
}

const ReadingStatistics: React.FC<ReadingStatisticsProps> = ({ 
  bookId, 
  showGlobalStats = false 
}) => {
  const { state } = useReader();
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatistics();
  }, [bookId, showGlobalStats]);

  const loadStatistics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const progressService = ReadingProgressService.getInstance();
      await progressService.initialize();
      
      const readingStats = await progressService.getReadingStats(
        showGlobalStats ? undefined : bookId
      );
      
      setStats(readingStats);
    } catch (err) {
      console.error('Failed to load reading statistics:', err);
      setError('Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatSpeed = (wordsPerMinute: number): string => {
    return `${Math.round(wordsPerMinute)} WPM`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getReadingLevel = (wordsPerMinute: number): { level: string; color: string } => {
    if (wordsPerMinute >= 300) return { level: 'Expert', color: '#4CAF50' };
    if (wordsPerMinute >= 250) return { level: 'Advanced', color: '#2196F3' };
    if (wordsPerMinute >= 200) return { level: 'Good', color: '#FF9800' };
    if (wordsPerMinute >= 150) return { level: 'Average', color: '#FFC107' };
    return { level: 'Beginner', color: '#9E9E9E' };
  };

  if (isLoading) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Loading statistics...</Text>
        </Card.Content>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Statistics unavailable</Text>
          <Text variant="bodySmall">{error || 'No data available'}</Text>
        </Card.Content>
      </Card>
    );
  }

  const readingLevel = getReadingLevel(stats.averageReadingSpeed);

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Title 
          title={showGlobalStats ? "Overall Reading Statistics" : "Book Statistics"}
          subtitle={stats.lastReadingDate ? `Last read: ${stats.lastReadingDate.toLocaleDateString()}` : undefined}
        />
        <Card.Content>
          {/* Reading Speed and Level */}
          <View style={styles.speedSection}>
            <View style={styles.speedInfo}>
              <Text variant="headlineMedium" style={styles.speedValue}>
                {formatSpeed(stats.averageReadingSpeed)}
              </Text>
              <Text variant="bodyMedium" style={styles.speedLabel}>Reading Speed</Text>
            </View>
            <Chip 
              mode="outlined" 
              style={[styles.levelChip, { borderColor: readingLevel.color }]}
              textStyle={{ color: readingLevel.color }}
            >
              {readingLevel.level}
            </Chip>
          </View>

          <Divider style={styles.divider} />

          {/* Statistics Grid */}
          <View style={styles.statsGrid}>
            <Surface style={styles.statItem} elevation={1}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {formatTime(stats.totalReadingTime)}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Total Time</Text>
            </Surface>

            <Surface style={styles.statItem} elevation={1}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {formatNumber(stats.totalPagesRead)}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Pages Read</Text>
            </Surface>

            <Surface style={styles.statItem} elevation={1}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {formatNumber(stats.totalWordsRead)}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Words Read</Text>
            </Surface>

            <Surface style={styles.statItem} elevation={1}>
              <Text variant="headlineSmall" style={styles.statValue}>
                {stats.booksCompleted}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>Books Done</Text>
            </Surface>
          </View>

          {/* Reading Streaks */}
          {showGlobalStats && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.streakSection}>
                <Text variant="titleMedium" style={styles.sectionTitle}>Reading Streaks</Text>
                <View style={styles.streakRow}>
                  <View style={styles.streakItem}>
                    <Text variant="headlineSmall" style={styles.streakValue}>
                      {stats.currentStreak}
                    </Text>
                    <Text variant="bodySmall" style={styles.streakLabel}>Current Streak</Text>
                  </View>
                  <View style={styles.streakItem}>
                    <Text variant="headlineSmall" style={styles.streakValue}>
                      {stats.longestStreak}
                    </Text>
                    <Text variant="bodySmall" style={styles.streakLabel}>Best Streak</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Current Session Progress */}
          {state.currentBook && !showGlobalStats && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.progressSection}>
                <Text variant="titleMedium" style={styles.sectionTitle}>Current Progress</Text>
                <View style={styles.progressInfo}>
                  <Text variant="bodyMedium">
                    {Math.round(state.currentPosition.percentage || 0)}% complete
                  </Text>
                  <ProgressBar 
                    progress={(state.currentPosition.percentage || 0) / 100} 
                    style={styles.progressBar}
                  />
                </View>
              </View>
            </>
          )}
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  speedSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  speedInfo: {
    alignItems: 'flex-start',
  },
  speedValue: {
    fontWeight: 'bold',
    color: '#6750A4',
  },
  speedLabel: {
    color: '#666',
    marginTop: 4,
  },
  levelChip: {
    backgroundColor: 'transparent',
  },
  divider: {
    marginVertical: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#6750A4',
    textAlign: 'center',
  },
  statLabel: {
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  streakSection: {
    marginTop: 8,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 16,
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  streakValue: {
    fontWeight: 'bold',
    color: '#FF9800',
  },
  streakLabel: {
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  progressSection: {
    marginTop: 8,
  },
  progressInfo: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
});

export default ReadingStatistics;

/**
 * Reading Goals and Achievements Screen
 * Week 11: Advanced Reading Features
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  useTheme,
  Card,
  Title,
  Paragraph,
  Button,
  IconButton,
  ProgressBar,
  Chip,
  FAB,
  Surface,
  Divider,
} from 'react-native-paper';
import ReadingAnalytics, { ReadingGoal, Achievement, ReadingInsight } from '../../services/analytics/ReadingAnalytics';

interface ReadingGoalsScreenProps {
  navigation: any;
}

export default function ReadingGoalsScreen({ navigation }: ReadingGoalsScreenProps) {
  const theme = useTheme();
  const [analytics] = useState(() => ReadingAnalytics.getInstance());
  const [goals, setGoals] = useState<ReadingGoal[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [insights, setInsights] = useState<ReadingInsight[]>([]);
  const [activeTab, setActiveTab] = useState<'goals' | 'achievements' | 'insights'>('goals');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // In a real implementation, these would be loaded from the analytics service
      setGoals([
        {
          id: 'goal_1',
          type: 'books',
          target: 12,
          current: 8,
          period: 'yearly',
          startDate: new Date(2024, 0, 1),
          endDate: new Date(2024, 11, 31),
          isActive: true,
          description: 'Read 12 books this year',
        },
        {
          id: 'goal_2',
          type: 'time',
          target: 30,
          current: 22,
          period: 'daily',
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isActive: true,
          description: 'Read 30 minutes daily',
        },
      ]);

      setAchievements([
        {
          id: 'first_book',
          title: 'First Steps',
          description: 'Complete your first book',
          icon: 'book-open',
          progress: 100,
          unlockedAt: new Date(2024, 2, 15),
          requirement: { type: 'books_read', value: 1 },
        },
        {
          id: 'speed_reader',
          title: 'Speed Reader',
          description: 'Read at 300+ words per minute',
          icon: 'speedometer',
          progress: 85,
          requirement: { type: 'speed', value: 300 },
        },
        {
          id: 'week_streak',
          title: 'Consistent Reader',
          description: 'Read for 7 consecutive days',
          icon: 'fire',
          progress: 57,
          requirement: { type: 'streak', value: 7 },
        },
      ]);

      setInsights([
        {
          type: 'trend',
          title: 'Reading Trend: Increasing',
          description: "You're averaging 35 minutes per day this week.",
          data: { average: 35, trend: 'increasing' },
        },
        {
          type: 'achievement',
          title: 'Almost there: Speed Reader',
          description: '85% complete',
          data: achievements.find(a => a.id === 'speed_reader'),
        },
      ]);
    } catch (error) {
      console.error('Failed to load goals data:', error);
    }
  };

  const createNewGoal = () => {
    Alert.alert(
      'Create New Goal',
      'Choose a goal type:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Books', onPress: () => showGoalDialog('books') },
        { text: 'Pages', onPress: () => showGoalDialog('pages') },
        { text: 'Time', onPress: () => showGoalDialog('time') },
        { text: 'Words', onPress: () => showGoalDialog('words') },
      ]
    );
  };

  const showGoalDialog = (type: ReadingGoal['type']) => {
    // In a real implementation, this would show a proper goal creation dialog
    Alert.alert(
      'Goal Details',
      `Create a new ${type} goal`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create', onPress: () => console.log(`Creating ${type} goal`) },
      ]
    );
  };

  const deleteGoal = (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setGoals(goals.filter(g => g.id !== goalId));
          },
        },
      ]
    );
  };

  const renderGoalCard = (goal: ReadingGoal) => {
    const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
    const isCompleted = progress >= 100;
    const daysLeft = Math.ceil((goal.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return (
      <Card key={goal.id} style={styles.goalCard}>
        <Card.Content>
          <View style={styles.goalHeader}>
            <View style={styles.goalInfo}>
              <Title style={styles.goalTitle}>{goal.description}</Title>
              <Paragraph style={styles.goalDetails}>
                {goal.current} / {goal.target} {goal.type}
              </Paragraph>
              <Chip
                icon={goal.period === 'daily' ? 'calendar-today' : 
                      goal.period === 'weekly' ? 'calendar-week' :
                      goal.period === 'monthly' ? 'calendar-month' : 'calendar-year'}
                style={styles.periodChip}
              >
                {goal.period}
              </Chip>
            </View>
            <IconButton
              icon="delete"
              onPress={() => deleteGoal(goal.id)}
              iconColor={theme.colors.error}
            />
          </View>

          <ProgressBar
            progress={progress / 100}
            color={isCompleted ? theme.colors.primary : theme.colors.outline}
            style={styles.progressBar}
          />

          <View style={styles.goalFooter}>
            <Paragraph style={styles.progressText}>
              {Math.round(progress)}% complete
            </Paragraph>
            {!isCompleted && daysLeft > 0 && (
              <Paragraph style={styles.daysLeft}>
                {daysLeft} days left
              </Paragraph>
            )}
            {isCompleted && (
              <Chip icon="check" style={styles.completedChip}>
                Completed!
              </Chip>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderAchievementCard = (achievement: Achievement) => {
    const isUnlocked = !!achievement.unlockedAt;

    return (
      <Card key={achievement.id} style={[
        styles.achievementCard,
        isUnlocked && styles.unlockedAchievement
      ]}>
        <Card.Content>
          <View style={styles.achievementHeader}>
            <IconButton
              icon={achievement.icon}
              size={32}
              iconColor={isUnlocked ? theme.colors.primary : theme.colors.outline}
            />
            <View style={styles.achievementInfo}>
              <Title style={[
                styles.achievementTitle,
                !isUnlocked && styles.lockedText
              ]}>
                {achievement.title}
              </Title>
              <Paragraph style={[
                styles.achievementDescription,
                !isUnlocked && styles.lockedText
              ]}>
                {achievement.description}
              </Paragraph>
            </View>
          </View>

          {!isUnlocked && (
            <ProgressBar
              progress={achievement.progress / 100}
              style={styles.achievementProgress}
            />
          )}

          <View style={styles.achievementFooter}>
            {isUnlocked ? (
              <Chip icon="trophy" style={styles.unlockedChip}>
                Unlocked {achievement.unlockedAt?.toLocaleDateString()}
              </Chip>
            ) : (
              <Paragraph style={styles.progressText}>
                {Math.round(achievement.progress)}% complete
              </Paragraph>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderInsightCard = (insight: ReadingInsight) => {
    const getInsightIcon = () => {
      switch (insight.type) {
        case 'trend': return 'trending-up';
        case 'achievement': return 'trophy';
        case 'recommendation': return 'lightbulb';
        case 'milestone': return 'flag';
        default: return 'information';
      }
    };

    return (
      <Card key={`${insight.type}_${insight.title}`} style={styles.insightCard}>
        <Card.Content>
          <View style={styles.insightHeader}>
            <IconButton
              icon={getInsightIcon()}
              size={24}
              iconColor={theme.colors.primary}
            />
            <View style={styles.insightInfo}>
              <Title style={styles.insightTitle}>{insight.title}</Title>
              <Paragraph style={styles.insightDescription}>
                {insight.description}
              </Paragraph>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'goals':
        return (
          <View>
            {goals.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Title>No Goals Set</Title>
                  <Paragraph>Create your first reading goal to get started!</Paragraph>
                  <Button mode="contained" onPress={createNewGoal} style={styles.createButton}>
                    Create Goal
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              goals.map(renderGoalCard)
            )}
          </View>
        );

      case 'achievements':
        return (
          <View>
            {achievements.map(renderAchievementCard)}
          </View>
        );

      case 'insights':
        return (
          <View>
            {insights.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Title>No Insights Available</Title>
                  <Paragraph>Start reading to generate personalized insights!</Paragraph>
                </Card.Content>
              </Card>
            ) : (
              insights.map(renderInsightCard)
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <Surface style={styles.tabContainer}>
        <Button
          mode={activeTab === 'goals' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('goals')}
          style={styles.tabButton}
        >
          Goals
        </Button>
        <Button
          mode={activeTab === 'achievements' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('achievements')}
          style={styles.tabButton}
        >
          Achievements
        </Button>
        <Button
          mode={activeTab === 'insights' ? 'contained' : 'outlined'}
          onPress={() => setActiveTab('insights')}
          style={styles.tabButton}
        >
          Insights
        </Button>
      </Surface>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>

      {/* FAB for creating new goals */}
      {activeTab === 'goals' && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={createNewGoal}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  goalCard: {
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  goalDetails: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  periodChip: {
    alignSelf: 'flex-start',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    opacity: 0.7,
  },
  daysLeft: {
    fontSize: 12,
    opacity: 0.7,
  },
  completedChip: {
    backgroundColor: '#4CAF50',
  },
  achievementCard: {
    marginBottom: 16,
    opacity: 0.7,
  },
  unlockedAchievement: {
    opacity: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementInfo: {
    flex: 1,
    marginLeft: 8,
  },
  achievementTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
  },
  lockedText: {
    opacity: 0.5,
  },
  achievementProgress: {
    height: 6,
    borderRadius: 3,
    marginBottom: 12,
  },
  achievementFooter: {
    alignItems: 'flex-start',
  },
  unlockedChip: {
    backgroundColor: '#FFD700',
  },
  insightCard: {
    marginBottom: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightInfo: {
    flex: 1,
    marginLeft: 8,
  },
  insightTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
  },
  emptyCard: {
    marginBottom: 16,
    alignItems: 'center',
    padding: 24,
  },
  createButton: {
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

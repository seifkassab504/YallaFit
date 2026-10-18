import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { useAuth } from '../../features/auth/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type AssessmentRow = Database['public']['Tables']['inbody_assessments']['Row'];
type SessionRow = Database['public']['Tables']['workout_sessions']['Row'] & {
  day?: Database['public']['Tables']['workout_days']['Row'];
  plan?: Database['public']['Tables']['workout_plans']['Row'];
};

export default function ProgressScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'trends' | 'assessments' | 'sessions'>('trends');
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [completedSessions, setCompletedSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchProgressData = async () => {
    if (!user?.id) return;

    try {
      // 1. Fetch Verified Assessments
      const { data: aData } = await (supabase
        .from('inbody_assessments') as any)
        .select('*')
        .eq('member_id', user.id)
        .eq('verification_status', 'verified')
        .order('assessment_date', { ascending: false });

      if (aData) setAssessments(aData);

      // 2. Fetch Completed Workout Sessions
      const { data: sData } = await (supabase
        .from('workout_sessions') as any)
        .select(`
          *,
          day:workout_days (*),
          plan:workout_plans (*)
        `)
        .eq('member_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (sData) setCompletedSessions(sData);
    } catch (err) {
      console.error('Error fetching progress data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProgressData();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProgressData();
  };

  // Simple, lightweight historical bar visualization for trend metrics
  const renderTrendBars = (title: string, metricKey: keyof AssessmentRow, unit: string) => {
    const validData = assessments
      .filter((a) => a[metricKey] != null)
      .slice(0, 5)
      .reverse();

    if (validData.length === 0) {
      return (
        <View style={styles.trendCard}>
          <Text style={styles.trendTitle}>{title}</Text>
          <Text style={styles.trendEmptyText}>
            No verified assessments with this metric yet.
          </Text>
        </View>
      );
    }

    const values = validData.map((d) => Number(d[metricKey]));
    const maxVal = Math.max(...values, 1);

    return (
      <View style={styles.trendCard}>
        <View style={styles.trendHeader}>
          <Text style={styles.trendTitle}>{title}</Text>
          <Text style={styles.trendLatest}>
            Latest: {values[values.length - 1]} {unit}
          </Text>
        </View>

        <View style={styles.barsContainer}>
          {validData.map((d, index) => {
            const val = Number(d[metricKey]);
            const heightPercent = Math.max(15, Math.round((val / maxVal) * 100));
            const dateStr = new Date(d.assessment_date).toLocaleDateString(undefined, {
              month: 'numeric',
              day: 'numeric',
            });

            return (
              <View key={d.id} style={styles.barColumn}>
                <Text style={styles.barValue}>{val}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${heightPercent}%` }]} />
                </View>
                <Text style={styles.barDate}>{dateStr}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderAssessmentItem = ({ item }: { item: AssessmentRow }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push(`/(member)/inbody/${item.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>
          {new Date(item.assessment_date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Weight</Text>
          <Text style={styles.statVal}>{item.weight_kg ? `${item.weight_kg}kg` : '--'}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Muscle (SMM)</Text>
          <Text style={styles.statVal}>
            {item.skeletal_muscle_mass_kg ? `${item.skeletal_muscle_mass_kg}kg` : '--'}
          </Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Body Fat</Text>
          <Text style={styles.statVal}>
            {item.percent_body_fat ? `${item.percent_body_fat}%` : '--'}
          </Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Score</Text>
          <Text style={styles.statVal}>{item.total_body_score ?? '--'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSessionItem = ({ item }: { item: SessionRow }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>
          {item.completed_at
            ? new Date(item.completed_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Completed'}
        </Text>
        <View style={styles.completedBadge}>
          <Text style={styles.completedBadgeText}>COMPLETED</Text>
        </View>
      </View>
      <Text style={styles.sessionName}>{item.day?.name || 'Workout Session'}</Text>
      <Text style={styles.sessionPlan}>{item.plan?.title || 'Personalized Workout Plan'}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress & History</Text>
        <Text style={styles.subtitle}>
          Verified InBody body composition trends and completed workout history.
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trends' && styles.tabActive]}
          onPress={() => setActiveTab('trends')}
        >
          <Text style={[styles.tabText, activeTab === 'trends' && styles.tabTextActive]}>
            Trend Charts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'assessments' && styles.tabActive]}
          onPress={() => setActiveTab('assessments')}
        >
          <Text style={[styles.tabText, activeTab === 'assessments' && styles.tabTextActive]}>
            InBody ({assessments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sessions' && styles.tabActive]}
          onPress={() => setActiveTab('sessions')}
        >
          <Text style={[styles.tabText, activeTab === 'sessions' && styles.tabTextActive]}>
            Workouts ({completedSessions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Contents */}
      {activeTab === 'trends' ? (
        <ScrollView
          contentContainerStyle={styles.scrollList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {assessments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Verified Data Yet</Text>
              <Text style={styles.emptyText}>
                Trend analytics rely strictly on verified InBody assessments. Once your trainer verifies your scans, your trends will appear here.
              </Text>
            </View>
          ) : (
            <>
              {renderTrendBars('Weight Trend', 'weight_kg', 'kg')}
              {renderTrendBars('Skeletal Muscle Mass (SMM)', 'skeletal_muscle_mass_kg', 'kg')}
              {renderTrendBars('Percent Body Fat (PBF)', 'percent_body_fat', '%')}
              {renderTrendBars('Total Body Score', 'total_body_score', 'pts')}
            </>
          )}
        </ScrollView>
      ) : activeTab === 'assessments' ? (
        <FlatList
          data={assessments}
          keyExtractor={(item) => item.id}
          renderItem={renderAssessmentItem}
          contentContainerStyle={styles.scrollList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      ) : (
        <FlatList
          data={completedSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSessionItem}
          contentContainerStyle={styles.scrollList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Spacing.xxl,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  scrollList: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  trendCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  trendTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  trendLatest: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  trendEmptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginVertical: Spacing.md,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: Spacing.md,
  },
  barColumn: {
    alignItems: 'center',
    width: 44,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  barTrack: {
    width: 14,
    height: 80,
    backgroundColor: Colors.surface,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 7,
  },
  barDate: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardDate: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  verifiedBadge: {
    backgroundColor: Colors.successGlow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    color: Colors.success,
    fontSize: 10,
    fontWeight: '800',
  },
  completedBadge: {
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  completedBadgeText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  sessionPlan: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyBox: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

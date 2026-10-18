import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { BorderRadius, Colors, Spacing } from '../../../constants/theme';
import { useAuth } from '../../../features/auth/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Database } from '../../../types/database';

type PlanRow = Database['public']['Tables']['workout_plans']['Row'];
type DayWithExercises = Database['public']['Tables']['workout_days']['Row'] & {
  exercises: (Database['public']['Tables']['workout_exercises']['Row'] & {
    catalog?: Database['public']['Tables']['exercise_catalog']['Row'];
  })[];
};

export default function ApprovedWorkoutsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [approvedPlan, setApprovedPlan] = useState<PlanRow | null>(null);
  const [days, setDays] = useState<DayWithExercises[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchApprovedWorkouts = async () => {
    if (!user?.id) return;

    try {
      // 1. Fetch latest approved plan for the member (RLS ensures only approved plans are returned)
      const { data: planData, error: pError } = await (supabase
        .from('workout_plans') as any)
        .select('*')
        .eq('member_id', user.id)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!pError && planData) {
        setApprovedPlan(planData);

        // 2. Fetch days and exercises
        const { data: daysData } = await (supabase
          .from('workout_days') as any)
          .select(`
            *,
            exercises:workout_exercises (
              *,
              catalog:exercise_catalog (*)
            )
          `)
          .eq('plan_id', planData.id)
          .order('day_number', { ascending: true });

        if (daysData) {
          const sorted = daysData.map((d: DayWithExercises) => ({
            ...d,
            exercises: (d.exercises || []).sort((a, b) => a.order_index - b.order_index),
          }));
          setDays(sorted);
        }
      } else {
        setApprovedPlan(null);
        setDays([]);
      }
    } catch (err) {
      console.error('Error fetching approved workout plan:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApprovedWorkouts();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchApprovedWorkouts();
  };

  const renderDayCard = ({ item }: { item: DayWithExercises }) => {
    return (
      <View style={styles.dayCard}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{item.name}</Text>
          {item.is_rest_day ? (
            <View style={styles.restPill}>
              <Text style={styles.restPillText}>REST & RECOVER</Text>
            </View>
          ) : (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>{item.exercises.length} Exercises</Text>
            </View>
          )}
        </View>

        {item.is_rest_day ? (
          <Text style={styles.restDescription}>
            Active recovery day. Prioritize mobility, hydration, and restful sleep.
          </Text>
        ) : (
          <>
            <View style={styles.exercisePreviewList}>
              {item.exercises.slice(0, 3).map((ex) => (
                <Text key={ex.id} style={styles.exercisePreviewItem}>
                  • {ex.catalog?.name} ({ex.prescribed_sets} sets × {ex.prescribed_reps} reps)
                </Text>
              ))}
              {item.exercises.length > 3 ? (
                <Text style={styles.moreExercisesText}>
                  + {item.exercises.length - 3} more exercises
                </Text>
              ) : null}
            </View>

            <Button
              title="Start Workout Session"
              onPress={() => router.push(`/(member)/workouts/session/${item.id}` as any)}
              style={styles.startBtn}
            />
          </>
        )}
      </View>
    );
  };

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
        <View>
          <Text style={styles.title}>My Workout Plan</Text>
          <Text style={styles.subtitle}>
            {approvedPlan ? approvedPlan.title : 'No active approved plan'}
          </Text>
        </View>
        <Button
          title="New Request"
          onPress={() => router.push('/(member)/workouts/generate' as any)}
          variant="secondary"
          style={styles.newRequestBtn}
        />
      </View>

      {!approvedPlan ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Approved Plan Found</Text>
          <Text style={styles.emptySubtitle}>
            If you have submitted a workout request, your trainer is currently reviewing it. Plans must be approved by your trainer before they can be accessed.
          </Text>
          <Button
            title="Generate Workout Request"
            onPress={() => router.push('/(member)/workouts/generate' as any)}
            style={styles.generateBtn}
          />
        </View>
      ) : (
        <FlatList
          data={days}
          keyExtractor={(item) => item.id}
          renderItem={renderDayCard}
          contentContainerStyle={styles.listContent}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  newRequestBtn: {
    height: 38,
    paddingHorizontal: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  dayCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    flex: 1,
  },
  activePill: {
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  restPill: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  restPillText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  restDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
  exercisePreviewList: {
    marginVertical: Spacing.sm,
    gap: 4,
  },
  exercisePreviewItem: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  moreExercisesText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  startBtn: {
    marginTop: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  generateBtn: {
    minWidth: 240,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { BorderRadius, Colors, Spacing } from '../../../constants/theme';
import { useAuth } from '../../../features/auth/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Database } from '../../../types/database';

type PlanRow = Database['public']['Tables']['workout_plans']['Row'] & {
  member?: Database['public']['Tables']['profiles']['Row'];
  request?: Database['public']['Tables']['workout_requests']['Row'];
};

type DayWithExercises = Database['public']['Tables']['workout_days']['Row'] & {
  exercises: (Database['public']['Tables']['workout_exercises']['Row'] & {
    catalog?: Database['public']['Tables']['exercise_catalog']['Row'];
  })[];
};

export default function TrainerPlanReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [days, setDays] = useState<DayWithExercises[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Editable sets and reps state map: exerciseId -> { sets, reps }
  const [exerciseEdits, setExerciseEdits] = useState<
    Record<string, { sets: string; reps: string; rest: string }>
  >({});

  useEffect(() => {
    if (!id) return;

    const loadPlanDetails = async () => {
      try {
        // 1. Fetch Plan & Request & Member Profile
        const { data: planData, error: pError } = await (supabase
          .from('workout_plans') as any)
          .select(`
            *,
            member:profiles!workout_plans_member_id_fkey (*),
            request:workout_requests!workout_plans_request_id_fkey (*)
          `)
          .eq('id', id)
          .single();

        if (pError || !planData) throw new Error('Workout plan not found');
        setPlan(planData);
        setFeedback(planData.trainer_feedback || '');

        // 2. Fetch Days and Exercises
        const { data: daysData, error: dError } = await (supabase
          .from('workout_days') as any)
          .select(`
            *,
            exercises:workout_exercises (
              *,
              catalog:exercise_catalog (*)
            )
          `)
          .eq('plan_id', id)
          .order('day_number', { ascending: true });

        if (dError || !daysData) throw new Error('Failed to load plan schedule days');

        // Sort exercises by order_index
        const sortedDays = daysData.map((d: DayWithExercises) => ({
          ...d,
          exercises: (d.exercises || []).sort((a, b) => a.order_index - b.order_index),
        }));

        setDays(sortedDays);

        // Populate initial edits
        const edits: Record<string, { sets: string; reps: string; rest: string }> = {};
        sortedDays.forEach((d: DayWithExercises) => {
          d.exercises.forEach((ex) => {
            edits[ex.id] = {
              sets: String(ex.prescribed_sets),
              reps: ex.prescribed_reps,
              rest: String(ex.rest_seconds),
            };
          });
        });
        setExerciseEdits(edits);
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPlanDetails();
  }, [id]);

  const handleUpdateExercise = (
    exerciseRowId: string,
    field: 'sets' | 'reps' | 'rest',
    value: string
  ) => {
    setExerciseEdits((prev) => ({
      ...prev,
      [exerciseRowId]: {
        ...prev[exerciseRowId],
        [field]: value,
      },
    }));
  };

  const handleDecision = async (decision: 'approve' | 'reject' | 'request_revision') => {
    if (!plan || !user?.id) return;

    if (decision === 'reject' && !feedback.trim()) {
      Alert.alert('Feedback Required', 'Please provide feedback explaining the reason for rejection.');
      return;
    }

    setActionLoading(true);

    try {
      // 1. Save any trainer exercise edits first
      for (const [exId, edit] of Object.entries(exerciseEdits)) {
        await (supabase
          .from('workout_exercises') as any)
          .update({
            prescribed_sets: parseInt(edit.sets) || 3,
            prescribed_reps: edit.reps.trim() || '10',
            rest_seconds: parseInt(edit.rest) || 90,
          })
          .eq('id', exId);
      }

      // 2. Update Plan Status and Feedback
      const newStatus =
        decision === 'approve'
          ? 'approved'
          : decision === 'reject'
          ? 'rejected'
          : 'revision_requested';

      const updatePayload: any = {
        status: newStatus,
        trainer_id: user.id,
        trainer_feedback: feedback.trim() || null,
        revision_number:
          decision === 'approve' ? plan.revision_number : plan.revision_number + 1,
      };

      if (decision === 'approve') {
        updatePayload.approved_at = new Date().toISOString();
      }

      const { error: planUpdateError } = await (supabase
        .from('workout_plans') as any)
        .update(updatePayload)
        .eq('id', plan.id);

      if (planUpdateError) throw planUpdateError;

      Alert.alert(
        'Success',
        decision === 'approve'
          ? 'Workout plan officially approved! The member can now view and start their workout sessions.'
          : 'Plan status updated with your feedback.'
      );

      router.replace('/(trainer)/dashboard');
    } catch (err: any) {
      Alert.alert('Decision Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Review Workout Plan</Text>
          <Text style={styles.subtitle}>
            Review exercises, customize sets/reps/rest, and approve or request revision.
          </Text>
        </View>

        {/* Member & Request Snapshot Card */}
        <View style={styles.memberCard}>
          <Text style={styles.memberName}>{plan?.member?.full_name}</Text>
          <Text style={styles.planTitle}>{plan?.title}</Text>
          <Text style={styles.metaText}>
            Goal: {plan?.request?.goal?.replace('_', ' ').toUpperCase()} • {plan?.request?.days_per_week} Days/Week • {plan?.request?.session_duration_minutes} Mins/Session
          </Text>
          {plan?.request?.limitations_or_injuries ? (
            <View style={styles.limitationNotice}>
              <Text style={styles.limitationTitle}>⚠️ Declared Restrictions:</Text>
              <Text style={styles.limitationText}>
                {plan.request.limitations_or_injuries}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Day Schedule & Exercise List with Inline Editing */}
        {days.map((day) => (
          <View key={day.id} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{day.name}</Text>
              {day.is_rest_day ? (
                <View style={styles.restBadge}>
                  <Text style={styles.restBadgeText}>REST DAY</Text>
                </View>
              ) : null}
            </View>

            {day.exercises.map((ex, index) => {
              const edit = exerciseEdits[ex.id] || {
                sets: String(ex.prescribed_sets),
                reps: ex.prescribed_reps,
                rest: String(ex.rest_seconds),
              };

              return (
                <View key={ex.id} style={styles.exerciseItem}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseOrder}>#{index + 1}</Text>
                    <Text style={styles.exerciseName}>
                      {ex.catalog?.name || 'Exercise'}
                    </Text>
                  </View>
                  <Text style={styles.exerciseEquipment}>
                    Equipment: {ex.catalog?.equipment} • Target: {ex.catalog?.primary_muscle}
                  </Text>

                  {/* Inline Trainer Adjustment Controls */}
                  <View style={styles.inputsRow}>
                    <View style={styles.inputCol}>
                      <Text style={styles.miniLabel}>Sets</Text>
                      <TextInput
                        value={edit.sets}
                        onChangeText={(v) => handleUpdateExercise(ex.id, 'sets', v)}
                        keyboardType="numeric"
                        style={styles.miniInput}
                      />
                    </View>
                    <View style={styles.inputCol}>
                      <Text style={styles.miniLabel}>Reps Target</Text>
                      <TextInput
                        value={edit.reps}
                        onChangeText={(v) => handleUpdateExercise(ex.id, 'reps', v)}
                        style={styles.miniInput}
                      />
                    </View>
                    <View style={styles.inputCol}>
                      <Text style={styles.miniLabel}>Rest (sec)</Text>
                      <TextInput
                        value={edit.rest}
                        onChangeText={(v) => handleUpdateExercise(ex.id, 'rest', v)}
                        keyboardType="numeric"
                        style={styles.miniInput}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {/* Trainer Feedback / Revision Instructions */}
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackTitle}>Trainer Notes & Feedback</Text>
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Add notes, cues, form advice, or reasons if requesting revision..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            style={styles.feedbackInput}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="✓ Approve Workout Plan"
            onPress={() => handleDecision('approve')}
            loading={actionLoading}
            style={styles.approveBtn}
          />

          <View style={styles.buttonRow}>
            <Button
              title="Request Revisions"
              onPress={() => handleDecision('request_revision')}
              variant="secondary"
              disabled={actionLoading}
              style={styles.secondaryBtn}
            />
            <Button
              title="Reject Plan"
              onPress={() => handleDecision('reject')}
              variant="danger"
              disabled={actionLoading}
              style={styles.secondaryBtn}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  memberCard: {
    backgroundColor: Colors.surfaceCard,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  limitationNotice: {
    marginTop: Spacing.md,
    backgroundColor: Colors.warningGlow,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  limitationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.warning,
  },
  limitationText: {
    fontSize: 12,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  dayCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  restBadge: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  restBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  exerciseItem: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  exerciseOrder: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  exerciseEquipment: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  inputCol: {
    flex: 1,
  },
  miniLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  miniInput: {
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 6,
    height: 38,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.sm,
    fontSize: 13,
    textAlign: 'center',
  },
  feedbackSection: {
    marginBottom: Spacing.xl,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  feedbackInput: {
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    gap: Spacing.md,
  },
  approveBtn: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  secondaryBtn: {
    flex: 1,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

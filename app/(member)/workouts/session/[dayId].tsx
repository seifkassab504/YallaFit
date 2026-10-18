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
import { Button } from '../../../../components/ui/Button';
import { BorderRadius, Colors, Spacing } from '../../../../constants/theme';
import { useAuth } from '../../../../features/auth/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { Database } from '../../../../types/database';

type DayRow = Database['public']['Tables']['workout_days']['Row'];
type ExerciseRow = Database['public']['Tables']['workout_exercises']['Row'] & {
  catalog?: Database['public']['Tables']['exercise_catalog']['Row'];
};

interface SetLogInput {
  setNumber: number;
  repsCompleted: string;
  weightKg: string;
  isWarmup: boolean;
  completed: boolean;
}

export default function WorkoutSessionScreen() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [day, setDay] = useState<DayRow | null>(null);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [finishing, setFinishing] = useState<boolean>(false);

  // Set logging matrix: exerciseId -> array of SetLogInput
  const [setLogs, setSetLogs] = useState<Record<string, SetLogInput[]>>({});

  useEffect(() => {
    if (!dayId || !user?.id) return;

    const startOrResumeSession = async () => {
      try {
        // 1. Fetch Day information
        const { data: dayData, error: dError } = await (supabase
          .from('workout_days') as any)
          .select('*')
          .eq('id', dayId)
          .single();

        if (dError || !dayData) throw new Error('Workout day not found');
        setDay(dayData);

        // 2. Fetch Exercises for this day
        const { data: exData, error: exError } = await (supabase
          .from('workout_exercises') as any)
          .select(`
            *,
            catalog:exercise_catalog (*)
          `)
          .eq('day_id', dayId)
          .order('order_index', { ascending: true });

        if (exError || !exData) throw new Error('Failed to load workout exercises');
        setExercises(exData);

        // 3. Check for an existing in_progress session to resume
        const { data: existingSession } = await (supabase
          .from('workout_sessions') as any)
          .select('*')
          .eq('member_id', user.id)
          .eq('day_id', dayId)
          .eq('status', 'in_progress')
          .maybeSingle();

        let activeSessionId = existingSession?.id;

        if (!activeSessionId) {
          // Create new in_progress session
          const { data: newSession, error: sError } = await (supabase
            .from('workout_sessions') as any)
            .insert({
              member_id: user.id,
              day_id: dayId,
              plan_id: dayData.plan_id,
              status: 'in_progress',
              started_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (sError) throw sError;
          activeSessionId = newSession.id;
        }

        setSessionId(activeSessionId);

        // 4. Fetch any existing set logs for this session
        const { data: existingLogs } = await (supabase
          .from('workout_set_logs') as any)
          .select('*')
          .eq('session_id', activeSessionId);

        // Initialize state structure for all exercises
        const logsMap: Record<string, SetLogInput[]> = {};
        exData.forEach((ex: ExerciseRow) => {
          const setsCount = ex.prescribed_sets || 3;
          const rows: SetLogInput[] = [];

          for (let i = 1; i <= setsCount; i++) {
            const logged = existingLogs?.find(
              (l: any) => l.exercise_id === ex.exercise_id && l.set_number === i
            );

            rows.push({
              setNumber: i,
              repsCompleted: logged ? String(logged.reps_completed) : '',
              weightKg: logged?.weight_kg != null ? String(logged.weight_kg) : '',
              isWarmup: logged ? logged.is_warmup : false,
              completed: logged != null,
            });
          }
          logsMap[ex.exercise_id] = rows;
        });

        setSetLogs(logsMap);
      } catch (err: any) {
        Alert.alert('Session Error', err.message);
      } finally {
        setLoading(false);
      }
    };

    startOrResumeSession();
  }, [dayId, user?.id]);

  const handleUpdateSet = (
    exerciseId: string,
    setIndex: number,
    field: keyof SetLogInput,
    value: any
  ) => {
    setSetLogs((prev) => {
      const exerciseSets = [...(prev[exerciseId] || [])];
      exerciseSets[setIndex] = {
        ...exerciseSets[setIndex],
        [field]: value,
      };
      return { ...prev, [exerciseId]: exerciseSets };
    });
  };

  const handleSaveSet = async (exerciseId: string, setIndex: number) => {
    if (!sessionId) return;
    const item = setLogs[exerciseId]?.[setIndex];
    if (!item) return;

    const reps = parseInt(item.repsCompleted);
    if (isNaN(reps) || reps < 0) {
      Alert.alert('Invalid Reps', 'Please enter a valid completed repetition count.');
      return;
    }

    const weight = item.weightKg ? parseFloat(item.weightKg) : null;

    try {
      const { error } = await (supabase.from('workout_set_logs') as any).upsert(
        {
          session_id: sessionId,
          exercise_id: exerciseId,
          set_number: item.setNumber,
          reps_completed: reps,
          weight_kg: weight,
          is_warmup: item.isWarmup,
        },
        { onConflict: 'session_id,exercise_id,set_number' }
      );

      if (error) throw error;

      handleUpdateSet(exerciseId, setIndex, 'completed', true);
    } catch (err: any) {
      Alert.alert('Error Saving Set', err.message);
    }
  };

  const handleFinishWorkout = async () => {
    if (!sessionId) return;

    Alert.alert(
      'Finish Workout',
      'Are you sure you want to complete this workout session and save your progress?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish Workout',
          style: 'default',
          onPress: async () => {
            setFinishing(true);
            try {
              const { error } = await (supabase
                .from('workout_sessions') as any)
                .update({
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                })
                .eq('id', sessionId);

              if (error) throw error;

              Alert.alert(
                'Great Job! 🏆',
                'Your workout session has been logged and recorded in your progress history.',
                [{ text: 'View Progress', onPress: () => router.replace('/(member)/progress') }]
              );
            } catch (err: any) {
              Alert.alert('Error Finishing Session', err.message);
            } finally {
              setFinishing(false);
            }
          },
        },
      ]
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Session Header */}
        <View style={styles.header}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>WORKOUT IN PROGRESS</Text>
          </View>
          <Text style={styles.title}>{day?.name}</Text>
          <Text style={styles.subtitle}>
            Enter weight and completed repetitions for each prescribed set.
          </Text>
        </View>

        {/* Exercises & Set Logging Table */}
        {exercises.map((ex, exIdx) => {
          const sets = setLogs[ex.exercise_id] || [];

          return (
            <View key={ex.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseIndex}>#{exIdx + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseName}>{ex.catalog?.name}</Text>
                  <Text style={styles.exercisePrescription}>
                    Prescribed: {ex.prescribed_sets} sets × {ex.prescribed_reps} reps • Rest: {ex.rest_seconds}s
                  </Text>
                </View>
              </View>

              {/* Sets Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.colHeader, { width: 44 }]}>SET</Text>
                <Text style={[styles.colHeader, { flex: 1 }]}>KG</Text>
                <Text style={[styles.colHeader, { flex: 1 }]}>REPS</Text>
                <Text style={[styles.colHeader, { width: 50, textAlign: 'center' }]}>DONE</Text>
              </View>

              {/* Set Rows */}
              {sets.map((set, setIdx) => (
                <View
                  key={set.setNumber}
                  style={[
                    styles.setRow,
                    set.completed && styles.setRowCompleted,
                  ]}
                >
                  <Text style={[styles.setNumberText, { width: 44 }]}>
                    {set.setNumber}
                  </Text>

                  <TextInput
                    value={set.weightKg}
                    onChangeText={(v) => handleUpdateSet(ex.exercise_id, setIdx, 'weightKg', v)}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    style={[styles.inputBox, { flex: 1 }]}
                  />

                  <TextInput
                    value={set.repsCompleted}
                    onChangeText={(v) => handleUpdateSet(ex.exercise_id, setIdx, 'repsCompleted', v)}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    style={[styles.inputBox, { flex: 1 }]}
                  />

                  <TouchableOpacity
                    style={[
                      styles.checkBtn,
                      set.completed && styles.checkBtnCompleted,
                    ]}
                    onPress={() => handleSaveSet(ex.exercise_id, setIdx)}
                  >
                    <Text
                      style={[
                        styles.checkBtnText,
                        set.completed && styles.checkBtnTextCompleted,
                      ]}
                    >
                      ✓
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}

        {/* Action Button */}
        <Button
          title="Complete Workout Session"
          onPress={handleFinishWorkout}
          loading={finishing}
          style={styles.finishBtn}
        />
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
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  exerciseCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  exerciseIndex: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  exercisePrescription: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  setRowCompleted: {
    backgroundColor: 'rgba(204, 255, 0, 0.05)',
  },
  setNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  inputBox: {
    height: 40,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 6,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  checkBtn: {
    width: 44,
    height: 40,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkBtnCompleted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textSecondary,
  },
  checkBtnTextCompleted: {
    color: Colors.primaryText,
  },
  finishBtn: {
    marginTop: Spacing.lg,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

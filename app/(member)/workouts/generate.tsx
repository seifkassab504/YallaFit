import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { BorderRadius, Colors, Spacing } from '../../../constants/theme';
import { useAuth } from '../../../features/auth/AuthContext';
import { supabase } from '../../../lib/supabase';
import { SPLIT_TEMPLATES } from '../../../services/workout-generator/splitTemplates';
import { WorkoutGeneratorEngine } from '../../../services/workout-generator/WorkoutGeneratorEngine';
import { Database, FitnessGoal, SplitTemplateKey } from '../../../types/database';

type AssessmentRow = Database['public']['Tables']['inbody_assessments']['Row'];

export default function WorkoutRequestScreen() {
  const router = useRouter();
  const { user, fitnessProfile } = useAuth();

  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [selectedSplit, setSelectedSplit] = useState<SplitTemplateKey>('ppl');
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4);
  const [sessionDuration, setSessionDuration] = useState<number>(60);
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.id) return;

    const fetchVerifiedAssessments = async () => {
      try {
        const { data, error } = await (supabase
          .from('inbody_assessments') as any)
          .select('*')
          .eq('member_id', user.id)
          .order('assessment_date', { ascending: false });

        if (error) {
          console.warn('Error loading assessments:', error.message);
        } else {
          setAssessments(data || []);
          // Automatically pick the latest verified assessment if present
          const verified = data?.find((a: AssessmentRow) => a.verification_status === 'verified');
          if (verified) {
            setSelectedAssessmentId(verified.id);
          } else if (data && data.length > 0) {
            setSelectedAssessmentId(data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (fitnessProfile) {
      setDaysPerWeek(fitnessProfile.available_days_per_week || 4);
      setSessionDuration(fitnessProfile.session_duration_minutes || 60);
    }

    fetchVerifiedAssessments();
  }, [user?.id, fitnessProfile]);

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);
  const isVerified = selectedAssessment?.verification_status === 'verified';

  const handleGenerateAndSubmit = async () => {
    if (!user?.id) return;
    if (!selectedAssessmentId) {
      Alert.alert('Assessment Required', 'Please select an InBody assessment first.');
      return;
    }

    if (!isVerified) {
      Alert.alert(
        'Trainer Verification Required',
        'Your selected InBody assessment must be verified by your assigned trainer before an assessment-informed workout plan can be generated.'
      );
      return;
    }

    setGenerating(true);

    try {
      // 1. Fetch Exercise Catalog
      const { data: catalog, error: catError } = await (supabase
        .from('exercise_catalog') as any)
        .select('*')
        .eq('is_active', true);

      if (catError || !catalog || catalog.length === 0) {
        throw new Error('Exercise catalog could not be loaded.');
      }

      // 2. Fetch Assigned Trainer (if any)
      const { data: assignment } = await (supabase
        .from('trainer_member_assignments') as any)
        .select('trainer_id')
        .eq('member_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      const trainerId = assignment?.trainer_id || null;

      // 3. Deterministically Generate Plan via Engine
      const generated = WorkoutGeneratorEngine.generatePlan({
        memberId: user.id,
        assessmentId: selectedAssessmentId,
        isAssessmentVerified: true,
        goal: fitnessProfile?.fitness_goal || 'muscle_gain',
        experienceLevel: fitnessProfile?.experience_level || 'beginner',
        daysPerWeek,
        splitTemplate: selectedSplit,
        sessionDurationMinutes: sessionDuration,
        availableEquipment: fitnessProfile?.available_equipment || ['Full Gym'],
        limitationsOrInjuries: fitnessProfile?.limitations_or_injuries,
        exerciseCatalog: catalog,
      });

      // 4. Insert Workout Request
      const { data: reqData, error: reqError } = await (supabase
        .from('workout_requests') as any)
        .insert({
          member_id: user.id,
          assessment_id: selectedAssessmentId,
          goal: fitnessProfile?.fitness_goal || 'muscle_gain',
          experience_level: fitnessProfile?.experience_level || 'beginner',
          days_per_week: daysPerWeek,
          split_template: selectedSplit,
          session_duration_minutes: sessionDuration,
          equipment_available: fitnessProfile?.available_equipment || ['Full Gym'],
          limitations_or_injuries: fitnessProfile?.limitations_or_injuries,
          member_notes: notes.trim() || null,
          status: 'pending',
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // 5. Insert Workout Plan in 'pending_approval' status
      // (Member RLS policy enforces that member can ONLY see status='approved', so it remains locked to member until trainer acts!)
      const { data: planData, error: planError } = await (supabase
        .from('workout_plans') as any)
        .insert({
          member_id: user.id,
          request_id: reqData.id,
          trainer_id: trainerId,
          title: generated.title,
          split_template: selectedSplit,
          status: 'pending_approval',
          revision_number: 1,
        })
        .select()
        .single();

      if (planError) throw planError;

      // 6. Insert Days and Exercises
      for (const day of generated.days) {
        const { data: dayRow, error: dayError } = await (supabase
          .from('workout_days') as any)
          .insert({
            plan_id: planData.id,
            day_number: day.dayNumber,
            name: day.name,
            focus_muscles: day.focusMuscles,
            is_rest_day: day.isRestDay,
          })
          .select()
          .single();

        if (dayError) throw dayError;

        if (day.exercises.length > 0) {
          const exerciseRows = day.exercises.map((ex) => ({
            day_id: dayRow.id,
            exercise_id: ex.exerciseId,
            order_index: ex.orderIndex,
            prescribed_sets: ex.prescribedSets,
            prescribed_reps: ex.prescribedReps,
            rest_seconds: ex.restSeconds,
            notes: ex.notes,
          }));

          await (supabase.from('workout_exercises') as any).insert(exerciseRows);
        }
      }

      Alert.alert(
        'Plan Generated & Submitted!',
        'Your personalized workout plan has been generated and sent to your trainer for approval. Once approved, it will immediately unlock on your dashboard.',
        [{ text: 'OK', onPress: () => router.replace('/(member)/dashboard') }]
      );
    } catch (err: any) {
      Alert.alert('Generation Error', err.message);
    } finally {
      setGenerating(false);
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout Generator</Text>
        <Text style={styles.subtitle}>
          Personalized training plan tailored to your verified InBody assessment and training split.
        </Text>
      </View>

      {/* InBody Assessment Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Select InBody Assessment</Text>
        {assessments.length === 0 ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              No assessments found. You must upload and verify an InBody report first.
            </Text>
            <Button
              title="Upload InBody Report"
              onPress={() => router.push('/(member)/inbody/upload' as any)}
              style={styles.actionBtn}
            />
          </View>
        ) : (
          <View style={styles.assessmentList}>
            {assessments.map((a) => {
              const isSelected = selectedAssessmentId === a.id;
              const isItemVerified = a.verification_status === 'verified';
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    styles.assessmentOption,
                    isSelected && styles.assessmentOptionSelected,
                  ]}
                  onPress={() => setSelectedAssessmentId(a.id)}
                >
                  <View style={styles.assessmentInfo}>
                    <Text style={styles.assessmentDate}>
                      {new Date(a.assessment_date).toLocaleDateString()}
                    </Text>
                    <Text style={styles.assessmentSub}>
                      Weight: {a.weight_kg ? `${a.weight_kg}kg` : '--'} • SMM: {a.skeletal_muscle_mass_kg ? `${a.skeletal_muscle_mass_kg}kg` : '--'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: isItemVerified ? Colors.successGlow : Colors.warningGlow },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: isItemVerified ? Colors.success : Colors.warning },
                      ]}
                    >
                      {isItemVerified ? 'Verified' : 'Unverified'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Split Template Selector (All 6 Templates) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Choose Training Split</Text>
        {(Object.keys(SPLIT_TEMPLATES) as SplitTemplateKey[]).map((key) => {
          const t = SPLIT_TEMPLATES[key];
          const isSelected = selectedSplit === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.splitCard, isSelected && styles.splitCardSelected]}
              onPress={() => setSelectedSplit(key)}
            >
              <View style={styles.splitHeader}>
                <Text style={[styles.splitName, isSelected && styles.splitNameSelected]}>
                  {t.name}
                </Text>
                <Text style={styles.splitRange}>{t.minDays}–{t.maxDays} Days</Text>
              </View>
              <Text style={styles.splitDesc}>{t.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Frequency & Duration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Weekly Frequency & Duration</Text>
        <Text style={styles.subLabel}>Training Days: {daysPerWeek} days / week</Text>
        <View style={styles.daysRow}>
          {[2, 3, 4, 5, 6].map((days) => (
            <TouchableOpacity
              key={days}
              style={[styles.dayBtn, daysPerWeek === days && styles.dayBtnSelected]}
              onPress={() => setDaysPerWeek(days)}
            >
              <Text
                style={[
                  styles.dayBtnText,
                  daysPerWeek === days && styles.dayBtnTextSelected,
                ]}
              >
                {days}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Session Duration (Minutes)"
          value={String(sessionDuration)}
          onChangeText={(val) => setSessionDuration(Number(val) || 60)}
          keyboardType="numeric"
          containerStyle={{ marginTop: Spacing.md }}
        />
      </View>

      {/* Notes to Trainer */}
      <Input
        label="Notes for Trainer (Optional)"
        placeholder="e.g. Focus on chest development, preferred gym equipment"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={2}
      />

      <Button
        title="Generate Plan & Submit to Trainer"
        onPress={handleGenerateAndSubmit}
        loading={generating}
        disabled={!isVerified}
        style={styles.submitBtn}
      />

      {!isVerified && assessments.length > 0 ? (
        <Text style={styles.noticeText}>
          ⚠️ Plan generation is locked until your assigned trainer verifies your selected InBody assessment.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
    backgroundColor: Colors.background,
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  warningBox: {
    backgroundColor: Colors.warningGlow,
    borderColor: Colors.warning,
    borderWidth: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  warningText: {
    color: Colors.warning,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  assessmentList: {
    gap: Spacing.sm,
  },
  assessmentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  assessmentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  assessmentInfo: {
    flex: 1,
  },
  assessmentDate: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  assessmentSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  splitCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  splitCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  splitName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  splitNameSelected: {
    color: Colors.primary,
  },
  splitRange: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  splitDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  subLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  daysRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dayBtn: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dayBtnSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayBtnText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  dayBtnTextSelected: {
    color: Colors.primaryText,
  },
  actionBtn: {
    marginTop: Spacing.xs,
  },
  submitBtn: {
    marginTop: Spacing.md,
  },
  noticeText: {
    fontSize: 12,
    color: Colors.warning,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 16,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

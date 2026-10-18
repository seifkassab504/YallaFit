import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BorderRadius, Colors, Spacing } from '../constants/theme';
import { useAuth } from '../features/auth/AuthContext';
import { supabase } from '../lib/supabase';
import {
  FitnessProfileFormValues,
  fitnessProfileSchema,
} from '../lib/validation/authSchemas';
import { FitnessGoal, ExperienceLevel } from '../types/database';

const GOAL_OPTIONS: { label: string; value: FitnessGoal }[] = [
  { label: 'Muscle Gain', value: 'muscle_gain' },
  { label: 'Fat Loss', value: 'fat_loss' },
  { label: 'Strength', value: 'strength' },
  { label: 'General Fitness', value: 'general_fitness' },
  { label: 'Endurance', value: 'endurance' },
];

const EXPERIENCE_OPTIONS: { label: string; value: ExperienceLevel }[] = [
  { label: 'Beginner (< 1 yr)', value: 'beginner' },
  { label: 'Intermediate (1–3 yrs)', value: 'intermediate' },
  { label: 'Advanced (3+ yrs)', value: 'advanced' },
];

const EQUIPMENT_OPTIONS = [
  'Full Gym (Barbell, Dumbbells, Cables, Machines)',
  'Dumbbells Only',
  'Barbell & Plates',
  'Bodyweight / Calisthenics',
  'Resistance Bands',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FitnessProfileFormValues>({
    resolver: zodResolver(fitnessProfileSchema),
    defaultValues: {
      height_cm: 175,
      fitness_goal: 'muscle_gain',
      experience_level: 'beginner',
      available_days_per_week: 4,
      session_duration_minutes: 60,
      available_equipment: ['Full Gym (Barbell, Dumbbells, Cables, Machines)'],
      exercise_preferences: [],
      limitations_or_injuries: '',
    },
  });

  const selectedGoal = watch('fitness_goal');
  const selectedExp = watch('experience_level');
  const selectedDays = watch('available_days_per_week');
  const selectedEquipment = watch('available_equipment');

  const toggleEquipment = (item: string) => {
    if (selectedEquipment.includes(item)) {
      if (selectedEquipment.length > 1) {
        setValue(
          'available_equipment',
          selectedEquipment.filter((eq) => eq !== item)
        );
      }
    } else {
      setValue('available_equipment', [...selectedEquipment, item]);
    }
  };

  const onSubmit = async (values: FitnessProfileFormValues) => {
    if (!user?.id) return;
    setSubmitError(null);
    setLoading(true);

    try {
      const { error } = await supabase.from('fitness_profiles').upsert({
        user_id: user.id,
        height_cm: values.height_cm,
        fitness_goal: values.fitness_goal,
        experience_level: values.experience_level,
        available_days_per_week: values.available_days_per_week,
        session_duration_minutes: values.session_duration_minutes,
        available_equipment: values.available_equipment,
        exercise_preferences: values.exercise_preferences || [],
        limitations_or_injuries: values.limitations_or_injuries?.trim() || null,
      } as any);

      if (error) {
        setSubmitError(error.message);
      } else {
        await refreshProfile();
        router.replace('/(member)/dashboard');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save fitness profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Fitness Profile</Text>
          <Text style={styles.subtitle}>
            Personalize your parameters for tailored training & InBody analysis
          </Text>
        </View>

        {submitError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{submitError}</Text>
          </View>
        ) : null}

        {/* Height in cm */}
        <Controller
          control={control}
          name="height_cm"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Height (cm)"
              placeholder="175"
              keyboardType="numeric"
              value={value ? String(value) : ''}
              onBlur={onBlur}
              onChangeText={(text) => onChange(Number(text) || 0)}
              error={errors.height_cm?.message}
            />
          )}
        />

        {/* Primary Fitness Goal */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Primary Fitness Goal</Text>
          <View style={styles.chipsContainer}>
            {GOAL_OPTIONS.map((goal) => {
              const isSelected = selectedGoal === goal.value;
              return (
                <TouchableOpacity
                  key={goal.value}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setValue('fitness_goal', goal.value)}
                >
                  <Text
                    style={[styles.chipText, isSelected && styles.chipTextSelected]}
                  >
                    {goal.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.fitness_goal ? (
            <Text style={styles.errorText}>{errors.fitness_goal.message}</Text>
          ) : null}
        </View>

        {/* Experience Level */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Experience Level</Text>
          <View style={styles.chipsContainer}>
            {EXPERIENCE_OPTIONS.map((exp) => {
              const isSelected = selectedExp === exp.value;
              return (
                <TouchableOpacity
                  key={exp.value}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setValue('experience_level', exp.value)}
                >
                  <Text
                    style={[styles.chipText, isSelected && styles.chipTextSelected]}
                  >
                    {exp.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.experience_level ? (
            <Text style={styles.errorText}>{errors.experience_level.message}</Text>
          ) : null}
        </View>

        {/* Available Days Per Week */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>
            Available Training Days: {selectedDays} days / week
          </Text>
          <View style={styles.daysRow}>
            {[2, 3, 4, 5, 6].map((days) => {
              const isSelected = selectedDays === days;
              return (
                <TouchableOpacity
                  key={days}
                  style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                  onPress={() => setValue('available_days_per_week', days)}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      isSelected && styles.dayButtonTextSelected,
                    ]}
                  >
                    {days}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Session Duration */}
        <Controller
          control={control}
          name="session_duration_minutes"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Session Duration (Minutes)"
              placeholder="60"
              keyboardType="numeric"
              value={value ? String(value) : ''}
              onBlur={onBlur}
              onChangeText={(text) => onChange(Number(text) || 0)}
              error={errors.session_duration_minutes?.message}
            />
          )}
        />

        {/* Available Equipment */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Available Equipment</Text>
          {EQUIPMENT_OPTIONS.map((item) => {
            const isChecked = selectedEquipment.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[styles.checkboxRow, isChecked && styles.checkboxRowSelected]}
                onPress={() => toggleEquipment(item)}
              >
                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                  {isChecked ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={styles.checkboxLabel}>{item}</Text>
              </TouchableOpacity>
            );
          })}
          {errors.available_equipment ? (
            <Text style={styles.errorText}>
              {errors.available_equipment.message}
            </Text>
          ) : null}
        </View>

        {/* Limitations & Injuries */}
        <Controller
          control={control}
          name="limitations_or_injuries"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Limitations, Pain, or Injuries (Optional)"
              placeholder="e.g. Mild lower back tightness, right shoulder impingement"
              multiline
              numberOfLines={3}
              inputStyle={styles.textArea}
              value={value || ''}
              onBlur={onBlur}
              onChangeText={onChange}
              helperText="Treated with strict trainer confidentiality."
            />
          )}
        />

        <Button
          title="Save & Continue to Dashboard"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.submitBtn}
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
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: Colors.dangerGlow,
    borderColor: Colors.danger,
    borderWidth: 1,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  errorBannerText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
  },
  chipSelected: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  daysRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dayButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayButtonText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  dayButtonTextSelected: {
    color: Colors.primaryText,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  checkboxRowSelected: {
    borderColor: Colors.primary,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: Colors.primaryText,
    fontSize: 12,
    fontWeight: '900',
  },
  checkboxLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
  submitBtn: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
});

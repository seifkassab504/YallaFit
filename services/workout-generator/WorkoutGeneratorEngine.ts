import {
  Database,
  ExperienceLevel,
  FitnessGoal,
  SplitTemplateKey,
} from '../../types/database';
import { SPLIT_TEMPLATES } from './splitTemplates';

type ExerciseRow = Database['public']['Tables']['exercise_catalog']['Row'];

export interface WorkoutGeneratorInput {
  memberId: string;
  assessmentId: string;
  isAssessmentVerified: boolean;
  goal: FitnessGoal;
  experienceLevel: ExperienceLevel;
  daysPerWeek: number;
  splitTemplate: SplitTemplateKey;
  sessionDurationMinutes: number;
  availableEquipment: string[];
  limitationsOrInjuries?: string | null;
  exerciseCatalog: ExerciseRow[];
}

export interface GeneratedExerciseItem {
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  prescribedSets: number;
  prescribedReps: string;
  restSeconds: number;
  notes: string | null;
  equipment: string;
  primaryMuscle: string;
}

export interface GeneratedDayPlan {
  dayNumber: number;
  name: string;
  focusMuscles: string[];
  isRestDay: boolean;
  exercises: GeneratedExerciseItem[];
}

export interface GeneratedWorkoutPlan {
  title: string;
  splitTemplate: SplitTemplateKey;
  days: GeneratedDayPlan[];
  progressionNote: string;
  warnings: string[];
}

export class WorkoutGeneratorEngine {
  /**
   * Deterministic workout plan generation matching user constraints,
   * frequency availability, equipment, limitations, and exercise catalog.
   */
  static generatePlan(input: WorkoutGeneratorInput): GeneratedWorkoutPlan {
    const warnings: string[] = [];

    // 1. Mandatory Assessment Verification Check
    if (!input.isAssessmentVerified) {
      throw new Error(
        'InBody assessment must be verified by an assigned trainer before generating an assessment-informed workout plan.'
      );
    }

    // 2. Validate Template and Days Compatibility
    const templateDef = SPLIT_TEMPLATES[input.splitTemplate];
    if (!templateDef) {
      throw new Error(`Unknown split template: ${input.splitTemplate}`);
    }

    let effectiveDays = input.daysPerWeek;
    if (effectiveDays < templateDef.minDays) {
      warnings.push(
        `Selected split ${templateDef.name} recommends at least ${templateDef.minDays} days. Schedule adjusted to ${templateDef.minDays} days.`
      );
      effectiveDays = templateDef.minDays;
    } else if (effectiveDays > templateDef.maxDays) {
      warnings.push(
        `Selected split ${templateDef.name} supports maximum ${templateDef.maxDays} days. Schedule adjusted.`
      );
      effectiveDays = templateDef.maxDays;
    }

    // 3. Filter Exercise Catalog by Equipment & Limitations
    const availableEquipLower = input.availableEquipment.map((e) => e.toLowerCase());
    const isFullGym = availableEquipLower.some((e) => e.includes('full gym'));

    const eligibleExercises = input.exerciseCatalog.filter((ex) => {
      if (!ex.is_active) return false;

      // Equipment match
      if (!isFullGym) {
        const eqLower = ex.equipment.toLowerCase();
        const matchesEquipment = availableEquipLower.some(
          (userEq) =>
            userEq.includes(eqLower) ||
            (eqLower === 'bodyweight' && userEq.includes('bodyweight')) ||
            (eqLower === 'dumbbells' && userEq.includes('dumbbell')) ||
            (eqLower === 'barbell' && userEq.includes('barbell'))
        );
        if (!matchesEquipment) return false;
      }

      // Limitations check (exclude exercises that explicitly mention user injuries in contraindications)
      if (input.limitationsOrInjuries && ex.contraindications) {
        const limLower = input.limitationsOrInjuries.toLowerCase();
        const contraLower = ex.contraindications.toLowerCase();

        if (
          (limLower.includes('shoulder') && contraLower.includes('shoulder')) ||
          (limLower.includes('knee') && contraLower.includes('knee')) ||
          (limLower.includes('back') && (contraLower.includes('back') || contraLower.includes('lumbar'))) ||
          (limLower.includes('wrist') && contraLower.includes('wrist')) ||
          (limLower.includes('elbow') && contraLower.includes('elbow'))
        ) {
          return false;
        }
      }

      return true;
    });

    if (eligibleExercises.length === 0) {
      throw new Error(
        'No matching exercises found for the selected equipment and limitation criteria.'
      );
    }

    // 4. Sets and Reps Defaults based on Goal and Experience
    const { sets, reps, restSeconds } = this.getPrescriptionParameters(
      input.goal,
      input.experienceLevel
    );

    // 5. Build Days Schedule
    const scheduleDays = templateDef.buildSchedule(effectiveDays);
    const targetExercisesPerDay = input.sessionDurationMinutes <= 45 ? 4 : input.sessionDurationMinutes <= 60 ? 5 : 6;

    const generatedDays: GeneratedDayPlan[] = scheduleDays.map((day) => {
      if (day.isRestDay) {
        return {
          dayNumber: day.dayNumber,
          name: day.name,
          focusMuscles: day.focusMuscles,
          isRestDay: true,
          exercises: [],
        };
      }

      // Match exercises that target focus muscles
      const matchedExercises = eligibleExercises.filter((ex) =>
        day.focusMuscles.some(
          (muscle) =>
            ex.primary_muscle.toLowerCase().includes(muscle.toLowerCase()) ||
            muscle.toLowerCase().includes(ex.primary_muscle.toLowerCase()) ||
            ex.secondary_muscles.some((sm) => sm.toLowerCase().includes(muscle.toLowerCase()))
        )
      );

      // Deterministic sort: compound movements first, then by name
      const sortedExercises = matchedExercises.sort((a, b) => {
        const isACompound = a.movement_pattern.includes('Push') || a.movement_pattern.includes('Pull') || a.movement_pattern.includes('Squat') || a.movement_pattern.includes('Hinge');
        const isBCompound = b.movement_pattern.includes('Push') || b.movement_pattern.includes('Pull') || b.movement_pattern.includes('Squat') || b.movement_pattern.includes('Hinge');
        if (isACompound && !isBCompound) return -1;
        if (!isACompound && isBCompound) return 1;
        return a.name.localeCompare(b.name);
      });

      // Pick top N exercises for the session
      const selectedForDay = sortedExercises.slice(0, targetExercisesPerDay);

      const exerciseItems: GeneratedExerciseItem[] = selectedForDay.map((ex, idx) => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        orderIndex: idx + 1,
        prescribedSets: input.experienceLevel === 'beginner' ? Math.min(sets, 3) : sets,
        prescribedReps: reps,
        restSeconds,
        notes: ex.instructions.slice(0, 100) + (ex.instructions.length > 100 ? '...' : ''),
        equipment: ex.equipment,
        primaryMuscle: ex.primary_muscle,
      }));

      return {
        dayNumber: day.dayNumber,
        name: day.name,
        focusMuscles: day.focusMuscles,
        isRestDay: false,
        exercises: exerciseItems,
      };
    });

    const progressionNote =
      'Double Progression Model: When you complete all sets at the upper rep target with good form, increase the load by 2.5 kg (upper body) or 5 kg (lower body) in your next session.';

    return {
      title: `${templateDef.name} (${effectiveDays} Days - ${input.goal.replace('_', ' ').toUpperCase()})`,
      splitTemplate: input.splitTemplate,
      days: generatedDays,
      progressionNote,
      warnings,
    };
  }

  private static getPrescriptionParameters(
    goal: FitnessGoal,
    experience: ExperienceLevel
  ): { sets: number; reps: string; restSeconds: number } {
    switch (goal) {
      case 'strength':
        return {
          sets: experience === 'advanced' ? 5 : 4,
          reps: '4–6',
          restSeconds: 150,
        };
      case 'muscle_gain':
        return {
          sets: experience === 'beginner' ? 3 : 4,
          reps: '8–12',
          restSeconds: 90,
        };
      case 'fat_loss':
        return {
          sets: 3,
          reps: '12–15',
          restSeconds: 60,
        };
      case 'endurance':
        return {
          sets: 3,
          reps: '15–20',
          restSeconds: 45,
        };
      case 'general_fitness':
      default:
        return {
          sets: 3,
          reps: '10–12',
          restSeconds: 75,
        };
    }
  }
}

import { ExperienceLevel, FitnessGoal, SplitTemplateKey } from '../../types/database';

export interface SplitDayDefinition {
  dayNumber: number;
  name: string;
  focusMuscles: string[];
  isRestDay: boolean;
}

export interface SplitTemplateDefinition {
  key: SplitTemplateKey;
  name: string;
  description: string;
  minDays: number;
  maxDays: number;
  recommendedDays: number[];
  buildSchedule: (daysCount: number) => SplitDayDefinition[];
}

export const SPLIT_TEMPLATES: Record<SplitTemplateKey, SplitTemplateDefinition> = {
  ppl: {
    key: 'ppl',
    name: 'Push / Pull / Legs (PPL)',
    description: 'High-frequency split targeting chest/shoulders/triceps, back/biceps, and lower body.',
    minDays: 3,
    maxDays: 6,
    recommendedDays: [3, 6],
    buildSchedule: (daysCount: number) => {
      if (daysCount === 3) {
        return [
          { dayNumber: 1, name: 'Day 1: Push (Chest, Shoulders, Triceps)', focusMuscles: ['Chest', 'Shoulders', 'Triceps'], isRestDay: false },
          { dayNumber: 2, name: 'Day 2: Pull (Back, Biceps)', focusMuscles: ['Lats', 'Upper Back', 'Mid Back', 'Biceps'], isRestDay: false },
          { dayNumber: 3, name: 'Day 3: Legs & Core', focusMuscles: ['Quadriceps', 'Hamstrings', 'Calves', 'Core'], isRestDay: false },
        ];
      }
      // 4 to 6 days: standard PPL cycle with rest
      const schedule: SplitDayDefinition[] = [
        { dayNumber: 1, name: 'Day 1: Push A', focusMuscles: ['Chest', 'Shoulders', 'Triceps'], isRestDay: false },
        { dayNumber: 2, name: 'Day 2: Pull A', focusMuscles: ['Lats', 'Upper Back', 'Biceps'], isRestDay: false },
        { dayNumber: 3, name: 'Day 3: Legs A', focusMuscles: ['Quadriceps', 'Hamstrings', 'Calves'], isRestDay: false },
      ];
      if (daysCount >= 4) {
        schedule.push({ dayNumber: 4, name: 'Day 4: Rest & Active Recovery', focusMuscles: [], isRestDay: true });
      }
      if (daysCount >= 5) {
        schedule.push({ dayNumber: 5, name: 'Day 5: Push B (Upper Hypertrophy)', focusMuscles: ['Chest', 'Lateral Deltoids', 'Triceps'], isRestDay: false });
      }
      if (daysCount >= 6) {
        schedule.push({ dayNumber: 6, name: 'Day 6: Pull & Legs Combined', focusMuscles: ['Mid Back', 'Biceps', 'Hamstrings', 'Core'], isRestDay: false });
      }
      return schedule;
    },
  },

  upper_lower: {
    key: 'upper_lower',
    name: 'Upper / Lower Split',
    description: 'Balanced upper body and lower body alternation allowing optimal recovery.',
    minDays: 2,
    maxDays: 4,
    recommendedDays: [2, 4],
    buildSchedule: (daysCount: number) => {
      const schedule: SplitDayDefinition[] = [
        { dayNumber: 1, name: 'Day 1: Upper Body Strength', focusMuscles: ['Chest', 'Lats', 'Shoulders', 'Arms'], isRestDay: false },
        { dayNumber: 2, name: 'Day 2: Lower Body & Core', focusMuscles: ['Quadriceps', 'Hamstrings', 'Calves', 'Core'], isRestDay: false },
      ];
      if (daysCount >= 3) {
        schedule.push({ dayNumber: 3, name: 'Day 3: Upper Body Hypertrophy', focusMuscles: ['Upper Chest', 'Upper Back', 'Lateral Deltoids', 'Arms'], isRestDay: false });
      }
      if (daysCount >= 4) {
        schedule.push({ dayNumber: 4, name: 'Day 4: Lower Body Volume', focusMuscles: ['Hamstrings', 'Quadriceps', 'Core'], isRestDay: false });
      }
      return schedule;
    },
  },

  full_body: {
    key: 'full_body',
    name: 'Full Body',
    description: 'Every session trains all major muscle groups with compound foundational lifts.',
    minDays: 2,
    maxDays: 4,
    recommendedDays: [2, 3],
    buildSchedule: (daysCount: number) => {
      const schedule: SplitDayDefinition[] = [
        { dayNumber: 1, name: 'Day 1: Full Body (Squat & Press Focus)', focusMuscles: ['Quadriceps', 'Chest', 'Lats', 'Core'], isRestDay: false },
        { dayNumber: 2, name: 'Day 2: Full Body (Hinge & Pull Focus)', focusMuscles: ['Hamstrings', 'Upper Back', 'Shoulders', 'Arms'], isRestDay: false },
      ];
      if (daysCount >= 3) {
        schedule.push({ dayNumber: 3, name: 'Day 3: Full Body (Hypertrophy & Core)', focusMuscles: ['Chest', 'Lats', 'Quadriceps', 'Core'], isRestDay: false });
      }
      if (daysCount >= 4) {
        schedule.push({ dayNumber: 4, name: 'Day 4: Rest / Recovery', focusMuscles: [], isRestDay: true });
      }
      return schedule;
    },
  },

  bro_split: {
    key: 'bro_split',
    name: 'Bro Split (Single Muscle Group)',
    description: 'Dedicated high-volume focus on one primary muscle group per training day.',
    minDays: 4,
    maxDays: 5,
    recommendedDays: [5],
    buildSchedule: (daysCount: number) => {
      const days: SplitDayDefinition[] = [
        { dayNumber: 1, name: 'Day 1: Chest', focusMuscles: ['Chest', 'Upper Chest', 'Lower Chest'], isRestDay: false },
        { dayNumber: 2, name: 'Day 2: Back', focusMuscles: ['Lats', 'Upper Back', 'Mid Back'], isRestDay: false },
        { dayNumber: 3, name: 'Day 3: Shoulders & Traps', focusMuscles: ['Shoulders', 'Lateral Deltoids', 'Rear Deltoids'], isRestDay: false },
        { dayNumber: 4, name: 'Day 4: Legs & Calves', focusMuscles: ['Quadriceps', 'Hamstrings', 'Calves'], isRestDay: false },
      ];
      if (daysCount >= 5) {
        days.push({ dayNumber: 5, name: 'Day 5: Arms & Abs', focusMuscles: ['Biceps', 'Triceps', 'Core', 'Abdominals'], isRestDay: false });
      }
      return days;
    },
  },

  ppl_upper_lower: {
    key: 'ppl_upper_lower',
    name: 'PPL + Upper / Lower Hybrid',
    description: '5-day elite hybrid combining push, pull, legs with dedicated upper and lower sessions.',
    minDays: 5,
    maxDays: 5,
    recommendedDays: [5],
    buildSchedule: (_daysCount: number) => [
      { dayNumber: 1, name: 'Day 1: Push (Chest, Delts, Triceps)', focusMuscles: ['Chest', 'Shoulders', 'Triceps'], isRestDay: false },
      { dayNumber: 2, name: 'Day 2: Pull (Back & Biceps)', focusMuscles: ['Lats', 'Upper Back', 'Biceps'], isRestDay: false },
      { dayNumber: 3, name: 'Day 3: Legs (Quad Focus)', focusMuscles: ['Quadriceps', 'Calves', 'Core'], isRestDay: false },
      { dayNumber: 4, name: 'Day 4: Upper Body Volume', focusMuscles: ['Upper Chest', 'Mid Back', 'Lateral Deltoids', 'Arms'], isRestDay: false },
      { dayNumber: 5, name: 'Day 5: Lower Body & Posterior Chain', focusMuscles: ['Hamstrings', 'Glutes', 'Core'], isRestDay: false },
    ],
  },

  arnold_split: {
    key: 'arnold_split',
    name: 'Arnold Split (Antagonist Pairing)',
    description: 'Classic bodybuilding split pairing opposing muscle groups (Chest/Back, Shoulders/Arms, Legs).',
    minDays: 3,
    maxDays: 6,
    recommendedDays: [3, 6],
    buildSchedule: (daysCount: number) => {
      if (daysCount <= 3) {
        return [
          { dayNumber: 1, name: 'Day 1: Chest & Back (Antagonist)', focusMuscles: ['Chest', 'Lats', 'Upper Back'], isRestDay: false },
          { dayNumber: 2, name: 'Day 2: Shoulders & Arms', focusMuscles: ['Shoulders', 'Biceps', 'Triceps'], isRestDay: false },
          { dayNumber: 3, name: 'Day 3: Legs & Core', focusMuscles: ['Quadriceps', 'Hamstrings', 'Calves', 'Core'], isRestDay: false },
        ];
      }
      return [
        { dayNumber: 1, name: 'Day 1: Chest & Back A', focusMuscles: ['Chest', 'Lats', 'Upper Back'], isRestDay: false },
        { dayNumber: 2, name: 'Day 2: Shoulders & Arms A', focusMuscles: ['Shoulders', 'Biceps', 'Triceps'], isRestDay: false },
        { dayNumber: 3, name: 'Day 3: Legs & Lower Back A', focusMuscles: ['Quadriceps', 'Hamstrings', 'Calves'], isRestDay: false },
        { dayNumber: 4, name: 'Day 4: Rest / Cardio', focusMuscles: [], isRestDay: true },
        { dayNumber: 5, name: 'Day 5: Chest & Back B', focusMuscles: ['Upper Chest', 'Mid Back', 'Lats'], isRestDay: false },
        { dayNumber: 6, name: 'Day 6: Shoulders, Arms & Abs B', focusMuscles: ['Lateral Deltoids', 'Biceps', 'Triceps', 'Core'], isRestDay: false },
      ];
    },
  },
};

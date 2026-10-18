import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkoutGeneratorEngine } from './WorkoutGeneratorEngine';
import { Database, SplitTemplateKey } from '../../types/database';

type ExerciseRow = Database['public']['Tables']['exercise_catalog']['Row'];

const MOCK_CATALOG: ExerciseRow[] = [
  {
    id: 'bb_bench_press',
    name: 'Barbell Bench Press',
    primary_muscle: 'Chest',
    secondary_muscles: ['Triceps', 'Shoulders'],
    movement_pattern: 'Horizontal Push',
    equipment: 'Barbell',
    difficulty: 'intermediate',
    instructions: 'Lower bar to chest and press up.',
    contraindications: 'Shoulder impingement',
    is_active: true,
    created_at: '2026-01-01',
  },
  {
    id: 'lat_pulldown',
    name: 'Wide-Grip Lat Pulldown',
    primary_muscle: 'Lats',
    secondary_muscles: ['Biceps'],
    movement_pattern: 'Vertical Pull',
    equipment: 'Cable',
    difficulty: 'beginner',
    instructions: 'Pull down to chest.',
    contraindications: null,
    is_active: true,
    created_at: '2026-01-01',
  },
  {
    id: 'barbell_back_squat',
    name: 'Barbell Back Squat',
    primary_muscle: 'Quadriceps',
    secondary_muscles: ['Glutes'],
    movement_pattern: 'Squat',
    equipment: 'Barbell',
    difficulty: 'intermediate',
    instructions: 'Squat to 90 degrees.',
    contraindications: 'Knee injury',
    is_active: true,
    created_at: '2026-01-01',
  },
  {
    id: 'db_incline_press',
    name: 'Dumbbell Incline Bench Press',
    primary_muscle: 'Chest',
    secondary_muscles: ['Triceps'],
    movement_pattern: 'Incline Push',
    equipment: 'Dumbbells',
    difficulty: 'beginner',
    instructions: 'Press dumbbells up at angle.',
    contraindications: null,
    is_active: true,
    created_at: '2026-01-01',
  },
  {
    id: 'bb_bicep_curl',
    name: 'Barbell Bicep Curl',
    primary_muscle: 'Biceps',
    secondary_muscles: [],
    movement_pattern: 'Isolation',
    equipment: 'Barbell',
    difficulty: 'beginner',
    instructions: 'Curl bar upwards.',
    contraindications: null,
    is_active: true,
    created_at: '2026-01-01',
  },
];

test('throws an error if InBody assessment is not verified', () => {
  assert.throws(
    () => {
      WorkoutGeneratorEngine.generatePlan({
        memberId: 'm1',
        assessmentId: 'a1',
        isAssessmentVerified: false,
        goal: 'muscle_gain',
        experienceLevel: 'intermediate',
        daysPerWeek: 4,
        splitTemplate: 'ppl',
        sessionDurationMinutes: 60,
        availableEquipment: ['Full Gym (Barbell, Dumbbells, Cables, Machines)'],
        exerciseCatalog: MOCK_CATALOG,
      });
    },
    { message: /InBody assessment must be verified by an assigned trainer/ }
  );
});

test('generates a valid 3-day PPL plan when assessment is verified', () => {
  const plan = WorkoutGeneratorEngine.generatePlan({
    memberId: 'm1',
    assessmentId: 'a1',
    isAssessmentVerified: true,
    goal: 'muscle_gain',
    experienceLevel: 'beginner',
    daysPerWeek: 3,
    splitTemplate: 'ppl',
    sessionDurationMinutes: 60,
    availableEquipment: ['Full Gym (Barbell, Dumbbells, Cables, Machines)'],
    exerciseCatalog: MOCK_CATALOG,
  });

  assert.equal(plan.splitTemplate, 'ppl');
  assert.equal(plan.days.length, 3);
  assert.match(plan.days[0].name, /Push/);
  assert.match(plan.days[1].name, /Pull/);
  assert.match(plan.days[2].name, /Legs/);
  assert.ok(plan.days[0].exercises.length > 0);
});

test('excludes exercises with contraindications matching user injury', () => {
  const plan = WorkoutGeneratorEngine.generatePlan({
    memberId: 'm1',
    assessmentId: 'a1',
    isAssessmentVerified: true,
    goal: 'strength',
    experienceLevel: 'intermediate',
    daysPerWeek: 3,
    splitTemplate: 'ppl',
    sessionDurationMinutes: 60,
    availableEquipment: ['Full Gym (Barbell, Dumbbells, Cables, Machines)'],
    limitationsOrInjuries: 'Right shoulder pain and impingement',
    exerciseCatalog: MOCK_CATALOG,
  });

  const pushDay = plan.days[0];
  const hasBarbellBench = pushDay.exercises.some((e) => e.exerciseId === 'bb_bench_press');
  assert.equal(hasBarbellBench, false);
});

test('adjusts schedule when frequency is outside template bounds', () => {
  const plan = WorkoutGeneratorEngine.generatePlan({
    memberId: 'm1',
    assessmentId: 'a1',
    isAssessmentVerified: true,
    goal: 'general_fitness',
    experienceLevel: 'beginner',
    daysPerWeek: 2, // PPL requires min 3
    splitTemplate: 'ppl',
    sessionDurationMinutes: 45,
    availableEquipment: ['Full Gym (Barbell, Dumbbells, Cables, Machines)'],
    exerciseCatalog: MOCK_CATALOG,
  });

  assert.ok(plan.warnings.length > 0);
  assert.equal(plan.days.length, 3);
});

test('supports all 6 split template selections', () => {
  const templates: SplitTemplateKey[] = [
    'ppl',
    'upper_lower',
    'full_body',
    'bro_split',
    'ppl_upper_lower',
    'arnold_split',
  ];

  templates.forEach((templateKey) => {
    const plan = WorkoutGeneratorEngine.generatePlan({
      memberId: 'm1',
      assessmentId: 'a1',
      isAssessmentVerified: true,
      goal: 'muscle_gain',
      experienceLevel: 'intermediate',
      daysPerWeek: 5,
      splitTemplate: templateKey,
      sessionDurationMinutes: 60,
      availableEquipment: ['Full Gym (Barbell, Dumbbells, Cables, Machines)'],
      exerciseCatalog: MOCK_CATALOG,
    });

    assert.ok(plan.days.length >= 2);
    assert.equal(plan.splitTemplate, templateKey);
  });
});

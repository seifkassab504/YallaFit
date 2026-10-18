import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signUpSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const fitnessProfileSchema = z.object({
  height_cm: z
    .number()
    .min(80, 'Height must be at least 80 cm')
    .max(260, 'Height must be under 260 cm'),
  fitness_goal: z.enum([
    'muscle_gain',
    'fat_loss',
    'strength',
    'general_fitness',
    'endurance',
  ]),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
  available_days_per_week: z
    .number()
    .min(1, 'Minimum 1 day')
    .max(7, 'Maximum 7 days'),
  session_duration_minutes: z
    .number()
    .min(15, 'Minimum 15 minutes')
    .max(180, 'Maximum 180 minutes'),
  available_equipment: z.array(z.string()).min(1, 'Select at least one equipment type'),
  exercise_preferences: z.array(z.string()),
  limitations_or_injuries: z.string().optional().nullable(),
});

export type SignInFormValues = z.infer<typeof signInSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type FitnessProfileFormValues = z.infer<typeof fitnessProfileSchema>;

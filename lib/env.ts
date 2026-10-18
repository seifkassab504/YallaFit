import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url('EXPO_PUBLIC_SUPABASE_URL must be a valid URL'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10, 'EXPO_PUBLIC_SUPABASE_ANON_KEY is required'),
});

const rawEnv = {
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key-min-length-check',
};

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.warn('⚠️ Environment configuration warning:', parsed.error.format());
}

export const ENV = {
  SUPABASE_URL: rawEnv.EXPO_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: rawEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  IS_CONFIGURED:
    rawEnv.EXPO_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    rawEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-anon-key-min-length-check',
};

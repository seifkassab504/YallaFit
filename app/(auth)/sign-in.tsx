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
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Colors, Spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { SignInFormValues, signInSchema } from '../../lib/validation/authSchemas';

export default function SignInScreen() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: SignInFormValues) => {
    setAuthError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });

      if (error) {
        setAuthError(error.message);
      }
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred during sign in');
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
          <Text style={styles.brandTitle}>
            YALLA<Text style={styles.brandAccent}>FIT</Text>
          </Text>
          <Text style={styles.subtitle}>Log in to elevate your training</Text>
        </View>

        {authError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{authError}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="you@domain.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
              />
            )}
          />

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => router.push('/(auth)/reset-password')}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.submitBtn}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
              <Text style={styles.linkText}>Create Account</Text>
            </TouchableOpacity>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1.5,
  },
  brandAccent: {
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotPasswordText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  submitBtn: {
    marginBottom: Spacing.xl,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  linkText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});

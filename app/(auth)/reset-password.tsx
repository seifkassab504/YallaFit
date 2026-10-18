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
import { ResetPasswordFormValues, resetPasswordSchema } from '../../lib/validation/authSchemas';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setAuthError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email.trim());

      if (error) {
        setAuthError(error.message);
      } else {
        setSuccessMsg('Password reset instructions have been sent to your email.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred');
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
            RESET <Text style={styles.brandAccent}>PASSWORD</Text>
          </Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you instructions to reset your password.
          </Text>
        </View>

        {authError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{authError}</Text>
          </View>
        ) : null}

        {successMsg ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>{successMsg}</Text>
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

          <Button
            title="Send Reset Link"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.submitBtn}
          />

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Back to Sign In</Text>
          </TouchableOpacity>
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
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  brandAccent: {
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
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
    textAlign: 'center',
  },
  successBanner: {
    backgroundColor: Colors.successGlow,
    borderColor: Colors.success,
    borderWidth: 1,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  successBannerText: {
    color: Colors.success,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  submitBtn: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    alignItems: 'center',
    padding: Spacing.sm,
  },
  backBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});

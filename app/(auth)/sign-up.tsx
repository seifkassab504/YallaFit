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
import { SignUpFormValues, signUpSchema } from '../../lib/validation/authSchemas';

export default function SignUpScreen() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: SignUpFormValues) => {
    setAuthError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: {
          data: {
            full_name: values.fullName.trim(),
          },
        },
      });

      if (error) {
        setAuthError(error.message);
      } else if (data?.user && !data.session) {
        setSuccessMsg('Account created! Please check your email to verify your address before logging in.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred during sign up');
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
            JOIN <Text style={styles.brandAccent}>YALLAFIT</Text>
          </Text>
          <Text style={styles.subtitle}>Start your personalized fitness transformation</Text>
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
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Full Name"
                placeholder="Ahmed Ali"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.fullName?.message}
              />
            )}
          />

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
                placeholder="At least 6 characters"
                secureTextEntry
                autoCapitalize="none"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm Password"
                placeholder="Re-enter password"
                secureTextEntry
                autoCapitalize="none"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Button
            title="Create Account"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.submitBtn}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
              <Text style={styles.linkText}>Sign In</Text>
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
    fontSize: 32,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1.5,
  },
  brandAccent: {
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
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

import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { Colors } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';

function RootLayoutNav() {
  const { session, profile, fitnessProfile, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inMemberGroup = segments[0] === '(member)';
    const inTrainerGroup = segments[0] === '(trainer)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session) {
      // User is not signed in
      if (!inAuthGroup) {
        router.replace('/(auth)/sign-in');
      }
    } else {
      // User is signed in. Check role
      const role = profile?.role || 'member';

      if (role === 'trainer') {
        if (!inTrainerGroup) {
          router.replace('/(trainer)/dashboard');
        }
      } else {
        // Role is member. If fitness profile is not completed, redirect to onboarding
        if (!fitnessProfile) {
          if (!inOnboarding) {
            router.replace('/onboarding');
          }
        } else {
          // Fitness profile exists, ensure inside member area
          if (inAuthGroup || inOnboarding) {
            router.replace('/(member)/dashboard');
          }
        }
      }
    }
  }, [session, profile, fitnessProfile, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

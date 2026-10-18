import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing } from '../../constants/theme';
import { useAuth } from '../../features/auth/AuthContext';

export default function MemberDashboard() {
  const { profile, fitnessProfile, signOut } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{profile?.full_name || 'Member'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fitness Profile Active</Text>
        <Text style={styles.cardSubtitle}>
          Goal: {fitnessProfile?.fitness_goal?.replace('_', ' ').toUpperCase()}
        </Text>
        <Text style={styles.cardDetails}>
          {fitnessProfile?.available_days_per_week} Days/Week • {fitnessProfile?.session_duration_minutes} Mins
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="🏋️ Approved Workouts"
          onPress={() => router.push('/(member)/workouts' as any)}
          style={styles.actionBtn}
        />
        <Button
          title="📊 InBody Assessments"
          onPress={() => router.push('/(member)/inbody' as any)}
          variant="secondary"
          style={styles.actionBtn}
        />
        <Button
          title="📈 Progress & History"
          onPress={() => router.push('/(member)/progress' as any)}
          variant="secondary"
          style={styles.actionBtn}
        />
        <Button
          title="Sign Out"
          onPress={signOut}
          variant="outline"
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  name: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  card: {
    backgroundColor: Colors.surfaceCard,
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  cardDetails: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  actions: {
    gap: Spacing.md,
  },
  actionBtn: {
    width: '100%',
  },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing } from '../../constants/theme';
import { useAuth } from '../../features/auth/AuthContext';

export default function TrainerDashboard() {
  const { profile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badge}>TRAINER PORTAL</Text>
        <Text style={styles.name}>{profile?.full_name || 'Coach'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Assigned Members Overview</Text>
        <Text style={styles.cardSubtitle}>
          Review pending InBody assessments, approve workout plans, and track client progression.
        </Text>
      </View>

      <View style={styles.actions}>
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
  badge: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
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
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    gap: Spacing.md,
  },
  actionBtn: {
    width: '100%',
  },
});

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { BorderRadius, Colors, Spacing } from '../../../constants/theme';
import { useAuth } from '../../../features/auth/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Database } from '../../../types/database';

type AssessmentRow = Database['public']['Tables']['inbody_assessments']['Row'];

export default function InBodyListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchAssessments = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('inbody_assessments')
        .select('*')
        .eq('member_id', user.id)
        .order('assessment_date', { ascending: false });

      if (error) {
        console.warn('Error fetching assessments:', error.message);
      } else {
        setAssessments(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssessments();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return { label: 'Verified by Trainer', bg: Colors.successGlow, text: Colors.success };
      case 'pending_trainer_review':
        return { label: 'Pending Trainer Review', bg: Colors.warningGlow, text: Colors.warning };
      case 'needs_review':
        return { label: 'Needs Verification', bg: Colors.infoGlow, text: Colors.info };
      case 'extracting':
        return { label: 'Extracting Data...', bg: Colors.primaryGlow, text: Colors.primary };
      default:
        return { label: status.toUpperCase(), bg: Colors.surfaceElevated, text: Colors.textSecondary };
    }
  };

  const renderAssessmentItem = ({ item }: { item: AssessmentRow }) => {
    const badge = getStatusBadge(item.verification_status);
    const formattedDate = new Date(item.assessment_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => router.push(`/(member)/inbody/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardDate}>{formattedDate}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Weight</Text>
            <Text style={styles.statValue}>
              {item.weight_kg != null ? `${item.weight_kg} kg` : '--'}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>SMM</Text>
            <Text style={styles.statValue}>
              {item.skeletal_muscle_mass_kg != null ? `${item.skeletal_muscle_mass_kg} kg` : '--'}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>PBF</Text>
            <Text style={styles.statValue}>
              {item.percent_body_fat != null ? `${item.percent_body_fat}%` : '--'}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Score</Text>
            <Text style={styles.statValue}>
              {item.total_body_score != null ? item.total_body_score : '--'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>InBody Assessments</Text>
          <Text style={styles.subtitle}>Track body composition & regional balance</Text>
        </View>
        <Button
          title="+ Upload"
          onPress={() => router.push('/(member)/inbody/upload' as any)}
          style={styles.uploadBtn}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : assessments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Assessments Yet</Text>
          <Text style={styles.emptyText}>
            Upload a photo of your official InBody result sheet to extract body metrics and request an approved workout plan.
          </Text>
          <Button
            title="Upload First InBody Report"
            onPress={() => router.push('/(member)/inbody/upload' as any)}
            style={styles.emptyBtn}
          />
        </View>
      ) : (
        <FlatList
          data={assessments}
          keyExtractor={(item) => item.id}
          renderItem={renderAssessmentItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  uploadBtn: {
    height: 40,
    paddingHorizontal: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardDate: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  emptyBtn: {
    minWidth: 220,
  },
});

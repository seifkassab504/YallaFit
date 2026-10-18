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
import { Button } from '../../components/ui/Button';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { useAuth } from '../../features/auth/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type AssignmentRow = Database['public']['Tables']['trainer_member_assignments']['Row'] & {
  member_profile?: Database['public']['Tables']['profiles']['Row'];
  fitness_profile?: Database['public']['Tables']['fitness_profiles']['Row'];
};

type AssessmentRow = Database['public']['Tables']['inbody_assessments']['Row'] & {
  member?: Database['public']['Tables']['profiles']['Row'];
};

type PlanRow = Database['public']['Tables']['workout_plans']['Row'] & {
  member?: Database['public']['Tables']['profiles']['Row'];
};

export default function TrainerDashboardScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<'pending_plans' | 'pending_assessments' | 'members'>('pending_plans');
  const [pendingPlans, setPendingPlans] = useState<PlanRow[]>([]);
  const [pendingAssessments, setPendingAssessments] = useState<AssessmentRow[]>([]);
  const [assignedMembers, setAssignedMembers] = useState<AssignmentRow[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    try {
      // 1. Fetch assigned members
      const { data: assignments, error: aError } = await (supabase
        .from('trainer_member_assignments') as any)
        .select(`
          id,
          trainer_id,
          member_id,
          status,
          assigned_at,
          member_profile:profiles!trainer_member_assignments_member_id_fkey (id, full_name, avatar_path),
          fitness_profile:fitness_profiles!trainer_member_assignments_member_id_fkey (height_cm, fitness_goal, experience_level, limitations_or_injuries)
        `)
        .eq('trainer_id', user.id)
        .eq('status', 'active');

      if (!aError && assignments) {
        setAssignedMembers(assignments);
      }

      // 2. Fetch pending workout plans for assigned members
      const { data: plans, error: pError } = await (supabase
        .from('workout_plans') as any)
        .select(`
          id,
          member_id,
          title,
          split_template,
          status,
          revision_number,
          created_at,
          member:profiles!workout_plans_member_id_fkey (id, full_name)
        `)
        .in('status', ['pending_approval', 'revision_requested'])
        .order('created_at', { ascending: false });

      if (!pError && plans) {
        setPendingPlans(plans);
      }

      // 3. Fetch pending InBody assessments for assigned members
      const { data: assessments, error: asError } = await (supabase
        .from('inbody_assessments') as any)
        .select(`
          id,
          member_id,
          assessment_date,
          weight_kg,
          skeletal_muscle_mass_kg,
          verification_status,
          member:profiles!inbody_assessments_member_id_fkey (id, full_name)
        `)
        .in('verification_status', ['needs_review', 'pending_trainer_review'])
        .order('assessment_date', { ascending: false });

      if (!asError && assessments) {
        setPendingAssessments(assessments);
      }
    } catch (err) {
      console.error('Error fetching trainer dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const renderPlanItem = ({ item }: { item: PlanRow }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push(`/(trainer)/plans/${item.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.memberName}>{item.member?.full_name || 'Member'}</Text>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>Rev #{item.revision_number} • Review</Text>
        </View>
      </View>
      <Text style={styles.planTitle}>{item.title}</Text>
      <Text style={styles.cardFooter}>
        Submitted {new Date(item.created_at).toLocaleDateString()} • Tap to inspect & approve
      </Text>
    </TouchableOpacity>
  );

  const renderAssessmentItem = ({ item }: { item: AssessmentRow }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push(`/(member)/inbody/${item.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.memberName}>{item.member?.full_name || 'Member'}</Text>
        <View style={[styles.pendingBadge, { backgroundColor: Colors.infoGlow }]}>
          <Text style={[styles.pendingBadgeText, { color: Colors.info }]}>Verify Report</Text>
        </View>
      </View>
      <Text style={styles.planTitle}>
        InBody Scan: {item.weight_kg ? `${item.weight_kg}kg` : '--'} • SMM: {item.skeletal_muscle_mass_kg ? `${item.skeletal_muscle_mass_kg}kg` : '--'}
      </Text>
      <Text style={styles.cardFooter}>
        Scanned {new Date(item.assessment_date).toLocaleDateString()} • Tap to review & verify
      </Text>
    </TouchableOpacity>
  );

  const renderMemberItem = ({ item }: { item: AssignmentRow }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.memberName}>{item.member_profile?.full_name || 'Member'}</Text>
        <Text style={styles.assignmentDate}>
          Assigned {new Date(item.assigned_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.memberSub}>
        Goal: {item.fitness_profile?.fitness_goal?.replace('_', ' ').toUpperCase() || 'GENERAL'} •{' '}
        {item.fitness_profile?.experience_level?.toUpperCase() || 'BEGINNER'}
      </Text>
      {item.fitness_profile?.limitations_or_injuries ? (
        <Text style={styles.injuryNotice}>
          ⚠️ Note: {item.fitness_profile.limitations_or_injuries}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.badge}>TRAINER PORTAL</Text>
          <Text style={styles.trainerName}>{profile?.full_name || 'Coach'}</Text>
        </View>
        <Button
          title="Sign Out"
          onPress={signOut}
          variant="outline"
          style={styles.signOutBtn}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending_plans' && styles.tabActive]}
          onPress={() => setActiveTab('pending_plans')}
        >
          <Text style={[styles.tabText, activeTab === 'pending_plans' && styles.tabTextActive]}>
            Plans ({pendingPlans.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending_assessments' && styles.tabActive]}
          onPress={() => setActiveTab('pending_assessments')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'pending_assessments' && styles.tabTextActive,
            ]}
          >
            Assessments ({pendingAssessments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.tabActive]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
            Members ({assignedMembers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          {activeTab === 'pending_plans' ? (
            pendingPlans.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>All Caught Up! 🎉</Text>
                <Text style={styles.emptyText}>No workout plans awaiting your approval.</Text>
              </View>
            ) : (
              <FlatList
                data={pendingPlans}
                keyExtractor={(item) => item.id}
                renderItem={renderPlanItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={Colors.primary}
                  />
                }
              />
            )
          ) : activeTab === 'pending_assessments' ? (
            pendingAssessments.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No Assessments Pending</Text>
                <Text style={styles.emptyText}>All InBody reports have been verified.</Text>
              </View>
            ) : (
              <FlatList
                data={pendingAssessments}
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
            )
          ) : assignedMembers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Assigned Members</Text>
              <Text style={styles.emptyText}>
                Members must be explicitly assigned to your trainer account.
              </Text>
            </View>
          ) : (
            <FlatList
              data={assignedMembers}
              keyExtractor={(item) => item.id}
              renderItem={renderMemberItem}
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
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  trainerName: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  signOutBtn: {
    height: 38,
    paddingHorizontal: Spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  pendingBadge: {
    backgroundColor: Colors.warningGlow,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: {
    color: Colors.warning,
    fontSize: 11,
    fontWeight: '700',
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    marginVertical: 4,
  },
  cardFooter: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  assignmentDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  memberSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  injuryNotice: {
    fontSize: 12,
    color: Colors.warning,
    marginTop: Spacing.xs,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

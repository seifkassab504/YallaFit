import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { BorderRadius, Colors, Spacing } from '../../../constants/theme';
import { useAuth } from '../../../features/auth/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Database, SegmentalRegion } from '../../../types/database';

type AssessmentRow = Database['public']['Tables']['inbody_assessments']['Row'];
type SegmentalRow = Database['public']['Tables']['inbody_segmental_results']['Row'];

const REGION_LABELS: Record<SegmentalRegion, string> = {
  left_arm: 'Left Arm',
  right_arm: 'Right Arm',
  trunk: 'Trunk (Torso)',
  left_leg: 'Left Leg',
  right_leg: 'Right Leg',
};

export default function InBodyVerificationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [assessment, setAssessment] = useState<AssessmentRow | null>(null);
  const [segmentals, setSegmentals] = useState<SegmentalRow[]>([]);
  const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [showImagePreview, setShowImagePreview] = useState<boolean>(false);

  // Editable Assessment Fields
  const [weightKg, setWeightKg] = useState<string>('');
  const [smmKg, setSmmKg] = useState<string>('');
  const [bfmKg, setBfmKg] = useState<string>('');
  const [tbwL, setTbwL] = useState<string>('');
  const [proteinKg, setProteinKg] = useState<string>('');
  const [mineralsKg, setMineralsKg] = useState<string>('');
  const [bmi, setBmi] = useState<string>('');
  const [pbf, setPbf] = useState<string>('');
  const [visceralFat, setVisceralFat] = useState<string>('');
  const [totalScore, setTotalScore] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Editable Segmental states
  const [segmentalValues, setSegmentalValues] = useState<Record<string, string>>({});

  const isTrainer = profile?.role === 'trainer';

  useEffect(() => {
    if (!id) return;

    const loadAssessment = async () => {
      try {
        // Fetch Assessment
        const { data: assessmentData, error: aError } = await (supabase
          .from('inbody_assessments') as any)
          .select('*')
          .eq('id', id)
          .single();

        if (aError || !assessmentData) {
          throw new Error('Assessment not found');
        }

        setAssessment(assessmentData);
        setWeightKg(assessmentData.weight_kg != null ? String(assessmentData.weight_kg) : '');
        setSmmKg(
          assessmentData.skeletal_muscle_mass_kg != null
            ? String(assessmentData.skeletal_muscle_mass_kg)
            : ''
        );
        setBfmKg(
          assessmentData.body_fat_mass_kg != null ? String(assessmentData.body_fat_mass_kg) : ''
        );
        setTbwL(
          assessmentData.total_body_water_l != null
            ? String(assessmentData.total_body_water_l)
            : ''
        );
        setProteinKg(assessmentData.protein_kg != null ? String(assessmentData.protein_kg) : '');
        setMineralsKg(
          assessmentData.minerals_kg != null ? String(assessmentData.minerals_kg) : ''
        );
        setBmi(assessmentData.bmi != null ? String(assessmentData.bmi) : '');
        setPbf(
          assessmentData.percent_body_fat != null ? String(assessmentData.percent_body_fat) : ''
        );
        setVisceralFat(
          assessmentData.visceral_fat_level != null
            ? String(assessmentData.visceral_fat_level)
            : ''
        );
        setTotalScore(
          assessmentData.total_body_score != null ? String(assessmentData.total_body_score) : ''
        );
        setNotes(assessmentData.member_notes || '');

        // Fetch Segmentals
        const { data: segData } = await (supabase
          .from('inbody_segmental_results') as any)
          .select('*')
          .eq('assessment_id', id);

        if (segData) {
          setSegmentals(segData);
          const segMap: Record<string, string> = {};
          segData.forEach((s: SegmentalRow) => {
            segMap[`${s.region}_${s.analysis_type}`] =
              s.verified_value != null
                ? String(s.verified_value)
                : s.mass_kg != null
                ? String(s.mass_kg)
                : '';
          });
          setSegmentalValues(segMap);
        }

        // Get signed URL for source image
        if (assessmentData.source_image_storage_path) {
          const { data: signResult } = await supabase.storage
            .from('inbody-reports')
            .createSignedUrl(assessmentData.source_image_storage_path, 3600);

          if (signResult?.signedUrl) {
            setSignedImageUrl(signResult.signedUrl);
          }
        }
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAssessment();
  }, [id]);

  const handleSaveAndSubmit = async (finalVerification: boolean) => {
    if (!assessment || !user?.id) return;
    setSaving(true);

    try {
      // Determine new status:
      // If member submits -> 'pending_trainer_review'
      // If trainer verifies -> 'verified'
      // Else saved draft -> assessment.verification_status
      let newStatus = assessment.verification_status;
      if (finalVerification) {
        newStatus = isTrainer ? 'verified' : 'pending_trainer_review';
      }

      // Update inbody_assessments
      const updatePayload: any = {
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        skeletal_muscle_mass_kg: smmKg ? parseFloat(smmKg) : null,
        body_fat_mass_kg: bfmKg ? parseFloat(bfmKg) : null,
        total_body_water_l: tbwL ? parseFloat(tbwL) : null,
        protein_kg: proteinKg ? parseFloat(proteinKg) : null,
        minerals_kg: mineralsKg ? parseFloat(mineralsKg) : null,
        bmi: bmi ? parseFloat(bmi) : null,
        percent_body_fat: pbf ? parseFloat(pbf) : null,
        visceral_fat_level: visceralFat ? parseFloat(visceralFat) : null,
        total_body_score: totalScore ? parseFloat(totalScore) : null,
        verification_status: newStatus,
        member_notes: notes.trim() || null,
      };

      if (isTrainer && finalVerification) {
        updatePayload.verified_by = user.id;
        updatePayload.verified_at = new Date().toISOString();
      }

      const { error: updateError } = await (supabase
        .from('inbody_assessments') as any)
        .update(updatePayload)
        .eq('id', assessment.id);

      if (updateError) throw updateError;

      // Update segmentals
      for (const seg of segmentals) {
        const key = `${seg.region}_${seg.analysis_type}`;
        const valStr = segmentalValues[key];
        const numVal = valStr ? parseFloat(valStr) : null;

        await (supabase
          .from('inbody_segmental_results') as any)
          .update({
            mass_kg: numVal,
            verified_value: numVal,
          })
          .eq('id', seg.id);
      }

      // Audit review event if status changed
      if (newStatus !== assessment.verification_status) {
        await (supabase.from('assessment_review_events') as any).insert({
          assessment_id: assessment.id,
          reviewer_id: user.id,
          action: isTrainer ? 'trainer_verify' : 'member_submit_for_review',
          previous_status: assessment.verification_status,
          new_status: newStatus,
          notes: isTrainer ? 'Verified by trainer' : 'Submitted by member',
        });
      }

      Alert.alert(
        'Success',
        finalVerification
          ? isTrainer
            ? 'Assessment officially verified!'
            : 'Submitted to your assigned trainer for review.'
          : 'Draft saved successfully.'
      );

      router.back();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify InBody Data</Text>
          <Text style={styles.subtitle}>
            Review extracted figures against your physical report. You may edit any field.
          </Text>
        </View>

        {signedImageUrl ? (
          <View style={styles.imageSection}>
            <TouchableOpacity
              style={styles.toggleImageBtn}
              onPress={() => setShowImagePreview(!showImagePreview)}
            >
              <Text style={styles.toggleImageText}>
                {showImagePreview ? '▲ Hide Original Report' : '▼ View Original Report'}
              </Text>
            </TouchableOpacity>
            {showImagePreview ? (
              <Image
                source={{ uri: signedImageUrl }}
                style={styles.reportImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
        ) : null}

        {/* Section 1: Body Composition */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Body Composition Analysis</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Weight (kg)"
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                placeholder="e.g. 78.5"
              />
            </View>
            <View style={styles.col}>
              <Input
                label="Skeletal Muscle / SMM (kg)"
                value={smmKg}
                onChangeText={setSmmKg}
                keyboardType="numeric"
                placeholder="e.g. 35.2"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Body Fat Mass (kg)"
                value={bfmKg}
                onChangeText={setBfmKg}
                keyboardType="numeric"
                placeholder="e.g. 14.1"
              />
            </View>
            <View style={styles.col}>
              <Input
                label="Total Body Water (L)"
                value={tbwL}
                onChangeText={setTbwL}
                keyboardType="numeric"
                placeholder="e.g. 45.0"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Protein (kg)"
                value={proteinKg}
                onChangeText={setProteinKg}
                keyboardType="numeric"
                placeholder="e.g. 12.0"
              />
            </View>
            <View style={styles.col}>
              <Input
                label="Minerals (kg)"
                value={mineralsKg}
                onChangeText={setMineralsKg}
                keyboardType="numeric"
                placeholder="e.g. 4.1"
              />
            </View>
          </View>
        </View>

        {/* Section 2: Obesity & Diagnostic Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Obesity & Diagnostics</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="BMI (kg/m²)"
                value={bmi}
                onChangeText={setBmi}
                keyboardType="numeric"
                placeholder="e.g. 23.5"
              />
            </View>
            <View style={styles.col}>
              <Input
                label="Percent Body Fat / PBF (%)"
                value={pbf}
                onChangeText={setPbf}
                keyboardType="numeric"
                placeholder="e.g. 17.5"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Input
                label="Visceral Fat Level"
                value={visceralFat}
                onChangeText={setVisceralFat}
                keyboardType="numeric"
                placeholder="e.g. 5"
              />
            </View>
            <View style={styles.col}>
              <Input
                label="Total Body Score (0-100)"
                value={totalScore}
                onChangeText={setTotalScore}
                keyboardType="numeric"
                placeholder="e.g. 82"
              />
            </View>
          </View>
        </View>

        {/* Section 3: 5-Region Segmental Lean Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Segmental Lean Analysis (kg)</Text>
          {(['left_arm', 'right_arm', 'trunk', 'left_leg', 'right_leg'] as SegmentalRegion[]).map(
            (region) => {
              const key = `${region}_lean`;
              return (
                <Input
                  key={key}
                  label={REGION_LABELS[region]}
                  value={segmentalValues[key] || ''}
                  onChangeText={(val) =>
                    setSegmentalValues((prev) => ({ ...prev, [key]: val }))
                  }
                  keyboardType="numeric"
                  placeholder="Lean mass kg"
                />
              );
            }
          )}
        </View>

        {/* Section 4: 5-Region Segmental Fat Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Segmental Fat Analysis (kg)</Text>
          {(['left_arm', 'right_arm', 'trunk', 'left_leg', 'right_leg'] as SegmentalRegion[]).map(
            (region) => {
              const key = `${region}_fat`;
              return (
                <Input
                  key={key}
                  label={REGION_LABELS[region]}
                  value={segmentalValues[key] || ''}
                  onChangeText={(val) =>
                    setSegmentalValues((prev) => ({ ...prev, [key]: val }))
                  }
                  keyboardType="numeric"
                  placeholder="Fat mass kg"
                />
              );
            }
          )}
        </View>

        {/* Notes */}
        <Input
          label="Verification Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any specific observations or clarifications..."
          multiline
          numberOfLines={2}
        />

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title={
              isTrainer
                ? '✓ Officially Verify Assessment'
                : 'Submit for Trainer Verification'
            }
            onPress={() => handleSaveAndSubmit(true)}
            loading={saving}
            style={styles.submitBtn}
          />
          <Button
            title="Save as Draft"
            onPress={() => handleSaveAndSubmit(false)}
            variant="secondary"
            disabled={saving}
          />
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
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  imageSection: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  toggleImageBtn: {
    padding: Spacing.xs,
    alignItems: 'center',
  },
  toggleImageText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  reportImage: {
    width: '100%',
    height: 380,
    marginTop: Spacing.md,
    borderRadius: 8,
  },
  section: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  col: {
    flex: 1,
  },
  actions: {
    gap: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  submitBtn: {
    width: '100%',
  },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

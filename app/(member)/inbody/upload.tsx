import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { BorderRadius, Colors, Spacing } from '../../../constants/theme';
import { useAuth } from '../../../features/auth/AuthContext';
import { ENV } from '../../../lib/env';
import { supabase } from '../../../lib/supabase';
import { InBodyOcrClient } from '../../../services/inbody/InBodyOcrClient';

export default function InBodyUploadScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pickImage = async (useCamera: boolean) => {
    setErrorMessage(null);
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to capture report.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: false,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Media library permission is required to select report.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: false,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to select image');
    }
  };

  const handleUploadAndExtract = async () => {
    if (!imageUri || !user?.id) return;
    setUploading(true);
    setErrorMessage(null);

    try {
      setStatusMessage('Uploading report securely to storage...');

      // 1. Convert image to ArrayBuffer/Blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // 2. Upload to private Supabase bucket 'inbody-reports'
      const { error: uploadError } = await supabase.storage
        .from('inbody-reports')
        .upload(filePath, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setStatusMessage('Creating assessment record...');

      // 3. Insert initial assessment record
      const { data: assessment, error: insertError } = await (supabase
        .from('inbody_assessments') as any)
        .insert({
          member_id: user.id,
          assessment_date: new Date().toISOString(),
          source_image_storage_path: filePath,
          extraction_status: 'extracting',
          verification_status: 'needs_review',
        })
        .select()
        .single();

      if (insertError || !assessment) {
        throw new Error(`Failed to create assessment record: ${insertError?.message}`);
      }

      setStatusMessage('Running OCR extraction service...');

      // 4. Get signed URL for the edge function to access the private image
      const { data: signedData, error: signError } = await supabase.storage
        .from('inbody-reports')
        .createSignedUrl(filePath, 3600);

      if (signError || !signedData?.signedUrl) {
        throw new Error('Failed to generate secure URL for extraction service');
      }

      // 5. Run OCR extraction via adapter
      const ocrClient = new InBodyOcrClient(ENV.SUPABASE_URL);
      let ocrResult = null;
      let extractionStatus: 'needs_review' | 'failed' = 'needs_review';

      try {
        ocrResult = await ocrClient.extractFromImageUrl(signedData.signedUrl);
      } catch (ocrErr: any) {
        console.warn('OCR service unavailable, proceeding with manual verification mode:', ocrErr.message);
        extractionStatus = 'needs_review'; // Allows manual entry fallback
      }

      // 6. Update assessment record with extracted fields or defaults
      if (ocrResult) {
        await (supabase
          .from('inbody_assessments') as any)
          .update({
            device_model: ocrResult.deviceModel,
            assessment_date: ocrResult.assessmentDate || new Date().toISOString(),
            height_cm: ocrResult.heightCm,
            age: ocrResult.age,
            sex_for_report: ocrResult.sex,
            total_body_score: ocrResult.totalBodyScore,
            weight_kg: ocrResult.weightKg,
            skeletal_muscle_mass_kg: ocrResult.skeletalMuscleMassKg,
            body_fat_mass_kg: ocrResult.bodyFatMassKg,
            total_body_water_l: ocrResult.totalBodyWaterL,
            protein_kg: ocrResult.proteinKg,
            minerals_kg: ocrResult.mineralsKg,
            bmi: ocrResult.bmi,
            percent_body_fat: ocrResult.percentBodyFat,
            waist_hip_ratio: ocrResult.waistHipRatio,
            visceral_fat_level: ocrResult.visceralFatLevel,
            bmr_kcal: ocrResult.bmrKcal,
            raw_extraction_output: ocrResult as any,
            extraction_status: 'needs_review',
          })
          .eq('id', (assessment as any).id);

        // Insert extracted segmental data
        if (ocrResult.segmental && ocrResult.segmental.length > 0) {
          const segmentalRows = ocrResult.segmental.map((seg) => ({
            assessment_id: (assessment as any).id,
            region: seg.region,
            analysis_type: seg.analysisType,
            mass_kg: seg.massKg,
            reported_percentage: seg.reportedPercentage,
            classification: seg.classification,
            confidence: seg.confidence,
          }));

          await (supabase.from('inbody_segmental_results') as any).insert(segmentalRows);
        }
      } else {
        // Fallback: Populate default 5-region segmental rows ready for human entry
        const defaultSegmentals = InBodyOcrClient.createDefaultSegmental().map((seg) => ({
          assessment_id: (assessment as any).id,
          region: seg.region,
          analysis_type: seg.analysisType,
          mass_kg: null,
          reported_percentage: null,
          classification: 'Normal',
          confidence: 1.0,
        }));
        await (supabase.from('inbody_segmental_results') as any).insert(defaultSegmentals);
      }

      // Navigate to verification screen
      router.replace(`/(member)/inbody/${(assessment as any).id}` as any);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during upload & extraction');
    } finally {
      setUploading(false);
      setStatusMessage(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan InBody Report</Text>
        <Text style={styles.subtitle}>
          Capture or upload your printed InBody result sheet. Values will be extracted and presented for your verification.
        </Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {imageUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={() => setImageUri(null)}
            disabled={uploading}
          >
            <Text style={styles.retakeText}>✕ Choose Different Image</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.pickerBox}>
          <Text style={styles.pickerTitle}>No Report Selected</Text>
          <Text style={styles.pickerHint}>Ensure good lighting and that all tables are in frame</Text>

          <View style={styles.buttonRow}>
            <Button
              title="📷 Take Photo"
              onPress={() => pickImage(true)}
              style={styles.pickBtn}
            />
            <Button
              title="🖼️ From Gallery"
              onPress={() => pickImage(false)}
              variant="secondary"
              style={styles.pickBtn}
            />
          </View>
        </View>
      )}

      {uploading ? (
        <View style={styles.uploadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.uploadingText}>{statusMessage}</Text>
        </View>
      ) : imageUri ? (
        <Button
          title="Extract & Review Data"
          onPress={handleUploadAndExtract}
          style={styles.actionBtn}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
    backgroundColor: Colors.background,
    flexGrow: 1,
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
  errorBox: {
    backgroundColor: Colors.dangerGlow,
    borderColor: Colors.danger,
    borderWidth: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  pickerBox: {
    backgroundColor: Colors.surfaceCard,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pickerHint: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  pickBtn: {
    flex: 1,
  },
  previewContainer: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 380,
    borderRadius: BorderRadius.md,
  },
  retakeBtn: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  retakeText: {
    color: Colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  uploadingBox: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  uploadingText: {
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionBtn: {
    marginTop: Spacing.md,
  },
});

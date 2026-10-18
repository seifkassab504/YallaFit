import { SegmentalAnalysisType, SegmentalRegion } from '../../types/database';

export interface InBodyFieldExtraction {
  key: string;
  label: string;
  rawValue: string | number | null;
  normalizedValue: number | string | null;
  unit?: string;
  confidence?: number;
}

export interface InBodySegmentalExtraction {
  region: SegmentalRegion;
  analysisType: SegmentalAnalysisType;
  massKg: number | null;
  reportedPercentage: number | null;
  classification: string | null;
  confidence: number;
}

export interface InBodyExtractionResult {
  deviceModel: string | null;
  assessmentDate: string; // ISO string
  heightCm: number | null;
  age: number | null;
  sex: string | null;
  totalBodyScore: number | null;

  // Body Composition
  weightKg: number | null;
  skeletalMuscleMassKg: number | null;
  bodyFatMassKg: number | null;
  totalBodyWaterL: number | null;
  proteinKg: number | null;
  mineralsKg: number | null;

  // Obesity
  bmi: number | null;
  percentBodyFat: number | null;
  waistHipRatio: number | null;
  visceralFatLevel: number | null;
  bmrKcal: number | null;

  // Segmental breakdown (10 entries: 5 lean + 5 fat)
  segmental: InBodySegmentalExtraction[];

  // Processing metadata
  warnings: string[];
  rawText?: string;
}

export interface InBodyOcrAdapter {
  extractFromImageUrl(signedUrl: string): Promise<InBodyExtractionResult>;
}

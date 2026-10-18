import { InBodyExtractionResult, InBodyOcrAdapter, InBodySegmentalExtraction } from './types';
import { SegmentalAnalysisType, SegmentalRegion } from '../../types/database';

const REGIONS: SegmentalRegion[] = ['left_arm', 'right_arm', 'trunk', 'left_leg', 'right_leg'];

export class InBodyOcrClient implements InBodyOcrAdapter {
  private edgeFunctionUrl: string;

  constructor(supabaseUrl: string) {
    this.edgeFunctionUrl = `${supabaseUrl}/functions/v1/extract-inbody`;
  }

  async extractFromImageUrl(signedUrl: string): Promise<InBodyExtractionResult> {
    try {
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: signedUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Extraction service failed with HTTP ${response.status}`
        );
      }

      const result: InBodyExtractionResult = await response.json();
      return result;
    } catch (err: any) {
      console.warn('Live OCR extraction endpoint unreachable or unconfigured:', err.message);
      throw err;
    }
  }

  /**
   * Helper to initialize empty/default segmental entries when OCR is missing fields
   * or when entering a manual fallback assessment.
   */
  static createDefaultSegmental(): InBodySegmentalExtraction[] {
    const list: InBodySegmentalExtraction[] = [];
    for (const analysisType of ['lean', 'fat'] as SegmentalAnalysisType[]) {
      for (const region of REGIONS) {
        list.push({
          region,
          analysisType,
          massKg: null,
          reportedPercentage: null,
          classification: 'Normal',
          confidence: 1.0,
        });
      }
    }
    return list;
  }
}

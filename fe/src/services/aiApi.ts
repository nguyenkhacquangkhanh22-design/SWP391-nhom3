export interface OpticalAnalysis {
  estimated_focal_length: string;
  estimated_aperture: string;
  lighting_setup: string;
  motion_stability: string;
  color_tone: string;
}

export interface RecommendedCombo {
  body_equipment_id?: string;
  body_title: string;
  body_daily_rate: number;
  body_reason: string;
  lens_recommendation: string;
  lighting_recommendation: string;
  stabilizer_recommendation: string;
  total_estimated_rate: number;
}

export interface MatchedEquipmentDetail {
  _id: string;
  title: string;
  dailyRate: number;
  images: string[];
  brand?: string;
  category?: string;
}

export interface ShotToGearResponse {
  optical_analysis: OpticalAnalysis;
  match_confidence: number;
  match_status: "EXACT_MATCH" | "BEST_ALTERNATIVE";
  match_verdict: string;
  recommended_combo: RecommendedCombo;
  matched_equipment_detail?: MatchedEquipmentDetail;
  shooting_tips: string;
  post_production_tips: string;
}

export const aiApi = {
  /**
   * Gửi ảnh file hoặc image URL lên để AI Vision (Groq LPU) phân tích thông số quang học
   * và tìm combo thiết bị phù hợp trong kho.
   */
  shotToGear: async (params: { file?: File; imageUrl?: string }): Promise<ShotToGearResponse> => {
    let response: Response;

    if (params.file) {
      const formData = new FormData();
      formData.append("image", params.file);
      response = await fetch("/api/ai/shot-to-gear", {
        method: "POST",
        body: formData,
      });
    } else if (params.imageUrl) {
      response = await fetch("/api/ai/shot-to-gear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: params.imageUrl }),
      });
    } else {
      throw new Error("Vui lòng chọn ảnh tải lên hoặc chọn mẫu có sẵn.");
    }

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.message || "Không thể phân tích ảnh qua AI.");
    }

    return json.data as ShotToGearResponse;
  },
};


/**
 * Pre-Owned Gear & Trade-In Types
 */

export interface PreOwnedListing {
  _id: string;
  seller_id: {
    _id: string;
    full_name: string;
    email: string;
    phone?: string;
  } | string;
  title: string;
  category: "Camera" | "Lens" | "Lighting" | "Audio" | "Gimbal" | "Accessory";
  brand: string;
  model: string;
  serial_number?: string;
  condition_grade: "like_new_99" | "excellent_95" | "good_90" | "fair_85" | "cosmetic_wear_80";
  shutter_count: number;
  max_rated_shutter: number;
  sensor_condition: "flawless_clean" | "minor_dust" | "cleaned_certified" | "micro_scratches";
  lens_optics_condition?: "pristine_no_dust" | "minor_internal_dust" | "slight_coating_mark" | "not_applicable";
  original_price: number;
  listing_price: number;
  smart_equip_warranty_months: number;
  accessories_included: string[];
  inspection_notes: string;
  images: string[];
  is_certified: boolean;
  status: "available" | "reserved" | "sold" | "delisted";
  views_count: number;
  createdAt: string;
  updatedAt: string;
}

export interface TradeInQuoteResult {
  cameraModel: string;
  originalPriceVnd: number;
  yearsUsed: number;
  shutterCount: number;
  maxRatedShutter: number;
  shutterWearPercentage: number;
  conditionGrade: string;
  certifiedMarketValue: number;
  cashPayoutQuote: number;
  rentalCreditVoucherQuote: number;
  bonusCreditAmount: number;
}

export interface ValuationModelPreset {
  brand: string;
  model: string;
  baseNewPriceVnd: number;
  maxRatedShutter: number;
  releaseYear: number;
}

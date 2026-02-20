// ─── Input / Request Types ─────────────────────────────────────────────────────

/**
 * Payload sent to POST /predict for a single-row prediction.
 * All numeric fields match the feature names expected by the XGBoost model.
 */
export interface TouristInput {
  originCountry: string;
  year: number;
  month: number;
  dollarRate: number;
  apparent_temperature_mean_celcius: number;
  sunshine_duration_seconds: number;
  rain_sum_mm: number;
  precipitation_hours: number;
  num_establishments: number;
  num_rooms: number;
  AirPassengerFaresIndex: number;
  consumerPriceIndex: number;
  lag_1: number;
  lag_2: number;
  lag_3: number;
  rolling_mean_3: number;
}

// ─── Response Types ────────────────────────────────────────────────────────────

/** Single prediction response from POST /predict. */
export interface PredictResponse {
  predicted_tourists: number;
}

/** One row in the batch CSV prediction result. */
export interface CSVPredictionRow extends Record<string, string | number> {
  /** Row index (1-based) for display purposes. */
  row: number;
  predicted_tourists: number;
}

// ─── Chart / History Types ─────────────────────────────────────────────────────

/**
 * A single data-point shown in the history or forecast line chart.
 */
export interface ChartDataPoint {
  /** Label shown on the X-axis, e.g. "Jan 2024". */
  label: string;
  /** Month number 1–12 for sorting convenience. */
  month: number;
  year: number;
  /** Actual historical count (undefined for future months). */
  actual?: number;
  /** Model-predicted tourist count. */
  predicted?: number;
}

// ─── SHAP / Explanation Types ──────────────────────────────────────────────────

/** One feature's SHAP contribution value. */
export interface ShapEntry {
  feature: string;
  value: number;
  /** The raw input value for this feature. */
  inputValue: number | string;
}

/** Full SHAP explanation payload (computed client-side or returned by backend). */
export interface ExplanationData {
  baseValue: number;
  shapValues: ShapEntry[];
  predictedValue: number;
}

// ─── UI State Types ────────────────────────────────────────────────────────────

/** Union of the main dashboard navigation tabs. */
export type DashboardTab = 'forecast' | 'history' | 'csv' | 'explanations';

/** Loading / error state wrapper used across API calls. */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ─── Form Field Metadata (drives the ForecastForm inputs) ─────────────────────

export interface FieldMeta {
  key: keyof TouristInput;
  label: string;
  type: 'number' | 'select';
  options?: string[];   // Only used when type = 'select'
  min?: number;
  max?: number;
  step?: number;
  helperText?: string;
}

/**
 * api.ts
 * Centralised Axios instance and typed request helpers.
 * All backend communication flows through this module.
 */

import axios, { AxiosError } from 'axios';
import type { TouristInput, PredictResponse, CSVBatchPrediction } from '../types/types';

// ─── Axios Instance ────────────────────────────────────────────────────────────

/**
 * Base URL uses the Vite dev-server proxy (/api → http://localhost:8000).
 * In production, set VITE_API_BASE_URL in your .env file.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000, // 30-second timeout
});

// ─── Response Interceptor – uniform error formatting ──────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message =
      (error.response?.data as { detail?: string })?.detail ??
      error.message ??
      'Unknown error occurred';
    return Promise.reject(new Error(message));
  }
);

// ─── API Helpers ───────────────────────────────────────────────────────────────

/**
 * POST /predict
 * Send a single feature row and get the predicted tourist count back.
 */
export async function predictSingle(input: TouristInput): Promise<PredictResponse> {
  const { data } = await apiClient.post<PredictResponse>('/predict', input);
  return data;
}

/**
 * Rolling recursive 12-month forecast starting from the user-supplied month.
 * Each iteration shifts the lags forward using the previous prediction:
 *   lag_3 â† lag_2, lag_2 â† lag_1, lag_1 â† predicted
 * Month/year roll forward automatically past December.
 * Returns one entry per month in chronological order.
 */
export interface RollingPrediction {
  month: number;
  year: number;
  predicted_tourists: number;
}

export async function forecastRolling(
  baseInput: TouristInput,
): Promise<RollingPrediction[]> {
  const results: RollingPrediction[] = [];

  let month = baseInput.month;
  let year = baseInput.year;
  let lag1 = baseInput.lag_1;
  let lag2 = baseInput.lag_2;
  let lag3 = baseInput.lag_3;

  for (let i = 0; i < 12; i++) {
    const rolling_mean_3 = Math.round(((lag1 + lag2 + lag3) / 3) * 100) / 100;

    const response = await predictSingle({
      ...baseInput,
      year,
      month,
      lag_1: lag1,
      lag_2: lag2,
      lag_3: lag3,
      rolling_mean_3,
    });

    const predicted = response.predicted_tourists;
    results.push({ month, year, predicted_tourists: predicted });

    // Shift lags: next monthâ€™s lag_1 = this prediction
    lag3 = lag2;
    lag2 = lag1;
    lag1 = predicted;

    // Advance month/year — roll over December → January of next year
    if (month === 12) {
      month = 1;
      year += 1;
    } else {
      month += 1;
    }
  }

  return results;
}

/**
 * Batch-predict an array of feature rows (parsed from CSV).
 * Runs requests in serial batches of 5 to avoid overwhelming the backend.
 */
export async function batchPredict(
  rows: TouristInput[]
): Promise<PredictResponse[]> {
  const results: PredictResponse[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(predictSingle));
    results.push(...batchResults);
  }

  return results;
}

/**
 * POST /predict-csv
 * Upload a CSV file with a totalCount column. The backend computes lag
 * features automatically and returns predictions for all rows.
 */
export async function predictBatchCSV(
  file: File
): Promise<{ count: number; predictions: CSVBatchPrediction[] }> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<{ count: number; predictions: CSVBatchPrediction[] }>(
    '/predict-csv',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export default apiClient;

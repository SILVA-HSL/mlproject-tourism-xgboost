/**
 * api.ts
 * Centralised Axios instance and typed request helpers.
 * All backend communication flows through this module.
 */

import axios, { AxiosError } from 'axios';
import type { TouristInput, PredictResponse } from '../types/types';

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
 * Forecast for every month in `year` using the user's base scenario.
 * Calls /predict 12 times (month 1–12) and resolves all in parallel.
 * lag and rolling-mean values stay constant (user-supplied baseline).
 */
export async function forecastYear(
  baseInput: TouristInput,
  year: number
): Promise<PredictResponse[]> {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const requests = months.map((month) =>
    predictSingle({ ...baseInput, year, month })
  );
  return Promise.all(requests);
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

export default apiClient;

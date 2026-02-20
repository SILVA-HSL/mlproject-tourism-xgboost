/**
 * ForecastForm.tsx
 * Renders the scenario input form and, on submission, calls the backend to
 * generate a 12-month forecast for the selected year.
 *
 * Props:
 *  onForecastComplete – callback invoked once all 12 monthly predictions arrive,
 *                       passing the results up to the Dashboard for chart rendering.
 *  onExplanationReady – callback that receives approximate SHAP-style feature
 *                       importances so the ExplanationPanel can visualise them.
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import type { TouristInput, ChartDataPoint, ExplanationData, ShapEntry } from '../types/types';
import { forecastYear } from '../api/api';

// ─── Constants ─────────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const CURRENT_YEAR = new Date().getFullYear();

/** Countries available in the model's label encoder (adjust to match your data). */
const ORIGIN_COUNTRIES = [
  'China', 'India', 'United Kingdom', 'USA', 'Germany',
  'France', 'Australia', 'Japan', 'Korea', 'Russia',
  'Italy', 'Canada', 'Malaysia', 'Singapore', 'Thailand',
];

/** Default form values – sensible mid-range baselines. */
const DEFAULT_VALUES: TouristInput = {
  originCountry: 'China',
  year: CURRENT_YEAR,
  month: 1,
  dollarRate: 300,
  apparent_temperature_mean_celcius: 27,
  sunshine_duration_seconds: 21600,
  rain_sum_mm: 150,
  precipitation_hours: 80,
  num_establishments: 500,
  num_rooms: 15000,
  AirPassengerFaresIndex: 120,
  consumerPriceIndex: 110,
  lag_1: 5000,
  lag_2: 4800,
  lag_3: 4600,
  rolling_mean_3: 4800,
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ForecastFormProps {
  onForecastComplete: (points: ChartDataPoint[]) => void;
  onExplanationReady: (data: ExplanationData) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Approximate feature importance proxy:
 * We build a simplified SHAP-like breakdown by measuring how each feature
 * deviates from its default baseline and scale by a rough weight coefficient.
 * (True SHAP requires server-side model access – extend the backend endpoint
 *  to return real SHAP values and replace this function.)
 */
function approximateShap(input: TouristInput, prediction: number): ExplanationData {
  const weights: Record<string, number> = {
    lag_1: 0.3,
    lag_2: 0.2,
    rolling_mean_3: 0.15,
    lag_3: 0.1,
    dollarRate: 0.08,
    AirPassengerFaresIndex: 0.06,
    consumerPriceIndex: 0.05,
    num_rooms: 0.03,
    num_establishments: 0.02,
    apparent_temperature_mean_celcius: 0.01,
    sunshine_duration_seconds: 0.005,
    rain_sum_mm: 0.005,
    precipitation_hours: 0.005,
    originCountry: 0.01,
    month: 0.005,
    year: 0.005,
  };

  const baseValue = prediction * 0.5;

  const shapValues: ShapEntry[] = Object.entries(weights).map(([feature, weight]) => {
    const rawVal = (input as unknown as Record<string, unknown>)[feature];
    const inputValue = rawVal as number | string;
    const defaultVal = (DEFAULT_VALUES as unknown as Record<string, unknown>)[feature] as number;
    const deviation =
      typeof inputValue === 'number' ? ((inputValue - defaultVal) / (defaultVal || 1)) * weight * prediction : 0;
    return { feature, value: deviation, inputValue };
  });

  return { baseValue, shapValues, predictedValue: prediction };
}

// ─── Component ─────────────────────────────────────────────────────────────────

const ForecastForm: React.FC<ForecastFormProps> = ({
  onForecastComplete,
  onExplanationReady,
}) => {
  const [formValues, setFormValues] = useState<TouristInput>(DEFAULT_VALUES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ── Field change handlers ──────────────────────────────────────────────────

  const handleNumberChange =
    (field: keyof TouristInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: Number.parseFloat(e.target.value) || 0 }));
    };

  const handleSelectChange =
    (field: keyof TouristInput) =>
    (value: string | number) => {
      setFormValues((prev) => ({ ...prev, [field]: value }));
    };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const results = await forecastYear(formValues, formValues.year);

      // Build ChartDataPoint array (one per month)
      const points: ChartDataPoint[] = results.map((r, idx) => ({
        label: `${MONTH_LABELS[idx]} ${formValues.year}`,
        month: idx + 1,
        year: formValues.year,
        predicted: Math.round(r.predicted_tourists),
      }));

      onForecastComplete(points);

      // Build approximate explanation from the average prediction
      const avgPrediction =
        results.reduce((sum, r) => sum + r.predicted_tourists, 0) / results.length;
      const explanation = approximateShap(formValues, avgPrediction);
      onExplanationReady(explanation);

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: 'primary.main' }}>
        Scenario Input
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Fill in the macro-economic and environmental parameters for your forecast scenario.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          Forecast generated successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* ── Origin Country ── */}
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth>
            <InputLabel>Origin Country</InputLabel>
            <Select
              value={formValues.originCountry}
              label="Origin Country"
              onChange={(e) => handleSelectChange('originCountry')(e.target.value)}
            >
              {ORIGIN_COUNTRIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* ── Year ── */}
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth>
            <InputLabel>Forecast Year</InputLabel>
            <Select
              value={formValues.year}
              label="Forecast Year"
              onChange={(e) => handleSelectChange('year')(e.target.value as number)}
            >
              {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Economic Indicators
            </Typography>
          </Divider>
        </Grid>

        {/* ── Dollar Rate ── */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Dollar Rate (LKR)"
            type="number"
            fullWidth
            value={formValues.dollarRate}
            onChange={handleNumberChange('dollarRate')}
            inputProps={{ step: 0.01 }}
            InputProps={{
              endAdornment: (
                <Tooltip title="Exchange rate: 1 USD to LKR">
                  <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                </Tooltip>
              ),
            }}
          />
        </Grid>

        {/* ── Air Passenger Fares Index ── */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Air Passenger Fares Index"
            type="number"
            fullWidth
            value={formValues.AirPassengerFaresIndex}
            onChange={handleNumberChange('AirPassengerFaresIndex')}
            inputProps={{ step: 0.1 }}
          />
        </Grid>

        {/* ── Consumer Price Index ── */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Consumer Price Index"
            type="number"
            fullWidth
            value={formValues.consumerPriceIndex}
            onChange={handleNumberChange('consumerPriceIndex')}
            inputProps={{ step: 0.1 }}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Weather Conditions
            </Typography>
          </Divider>
        </Grid>

        {/* ── Temperature ── */}
        <Grid item xs={12} sm={6} md={4}>
          <Box>
            <Typography variant="body2" gutterBottom>
              Avg Temperature: <strong>{formValues.apparent_temperature_mean_celcius}°C</strong>
            </Typography>
            <Slider
              value={formValues.apparent_temperature_mean_celcius}
              min={15}
              max={45}
              step={0.5}
              onChange={(_, val) =>
                setFormValues((prev) => ({
                  ...prev,
                  apparent_temperature_mean_celcius: val as number,
                }))
              }
              valueLabelDisplay="auto"
              color="secondary"
            />
          </Box>
        </Grid>

        {/* ── Sunshine Duration ── */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Sunshine Duration (seconds)"
            type="number"
            fullWidth
            value={formValues.sunshine_duration_seconds}
            onChange={handleNumberChange('sunshine_duration_seconds')}
            inputProps={{ step: 100 }}
            helperText="Daily average sunshine in seconds"
          />
        </Grid>

        {/* ── Rain Sum ── */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Rain Sum (mm)"
            type="number"
            fullWidth
            value={formValues.rain_sum_mm}
            onChange={handleNumberChange('rain_sum_mm')}
            inputProps={{ step: 0.1 }}
          />
        </Grid>

        {/* ── Precipitation Hours ── */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Precipitation Hours"
            type="number"
            fullWidth
            value={formValues.precipitation_hours}
            onChange={handleNumberChange('precipitation_hours')}
            inputProps={{ step: 0.5 }}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Accommodation Supply
            </Typography>
          </Divider>
        </Grid>

        {/* ── Num Establishments ── */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Number of Establishments"
            type="number"
            fullWidth
            value={formValues.num_establishments}
            onChange={handleNumberChange('num_establishments')}
            inputProps={{ step: 1 }}
          />
        </Grid>

        {/* ── Num Rooms ── */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Number of Rooms"
            type="number"
            fullWidth
            value={formValues.num_rooms}
            onChange={handleNumberChange('num_rooms')}
            inputProps={{ step: 10 }}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Lag Features (previous months' actual counts)
            </Typography>
          </Divider>
        </Grid>

        {/* ── Lag 1 ── */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Lag 1 (t−1)"
            type="number"
            fullWidth
            value={formValues.lag_1}
            onChange={handleNumberChange('lag_1')}
            helperText="Previous month count"
          />
        </Grid>

        {/* ── Lag 2 ── */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Lag 2 (t−2)"
            type="number"
            fullWidth
            value={formValues.lag_2}
            onChange={handleNumberChange('lag_2')}
          />
        </Grid>

        {/* ── Lag 3 ── */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Lag 3 (t−3)"
            type="number"
            fullWidth
            value={formValues.lag_3}
            onChange={handleNumberChange('lag_3')}
          />
        </Grid>

        {/* ── Rolling Mean 3 ── */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Rolling Mean (3 mo)"
            type="number"
            fullWidth
            value={formValues.rolling_mean_3}
            onChange={handleNumberChange('rolling_mean_3')}
            helperText="Mean of last 3 months"
          />
        </Grid>
      </Grid>

      {/* ── Submit ── */}
      <Box mt={4} display="flex" justifyContent="flex-end">
        <Button
          type="submit"
          variant="contained"
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <TrendingUpIcon />}
          disabled={loading}
          sx={{
            px: 5,
            py: 1.5,
            borderRadius: 3,
            fontWeight: 700,
            fontSize: '1rem',
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            boxShadow: '0 4px 20px rgba(25,118,210,0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
              boxShadow: '0 6px 24px rgba(25,118,210,0.6)',
            },
          }}
        >
          {loading ? 'Forecasting…' : 'Generate Forecast'}
        </Button>
      </Box>

      {/* ── Quick summary card after success ── */}
      {success && (
        <Card
          sx={{
            mt: 3,
            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
            border: '1px solid #90caf9',
          }}
        >
          <CardContent>
            <Typography variant="body2" color="primary.dark">
              <strong>Tip:</strong> Navigate to the <em>Forecast Chart</em> tab to see the
              12-month prediction curve, or to <em>Explanations</em> to understand which
              features drove the result.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ForecastForm;

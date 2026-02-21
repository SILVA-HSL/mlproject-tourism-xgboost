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
import { forecastRolling } from '../api/api';

// ─── Constants ─────────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const CURRENT_YEAR = new Date().getFullYear();

/** Countries available in the model's label encoder – exact strings used during training. */
const ORIGIN_COUNTRIES = [
  'Australia', 'Bangladesh', 'Canada', 'China', 'France', 'Germany',
  'India', 'Israel', 'Italy', 'Japan', 'Kazakhstan', 'Maldives',
  'Netherlands', 'Pakistan', 'Poland', 'Russia', 'Saudi Arabia', 'Spain',
  'Switzerland', 'Ukraine', 'United Kingdom', 'United States',
];

/** Default form values – sensible mid-range baselines. */
export const DEFAULT_VALUES: TouristInput = {
  originCountry: 'China', // China is index 3 in the label encoder
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
  formValues: TouristInput;
  setFormValues: React.Dispatch<React.SetStateAction<TouristInput>>;
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
  formValues,
  setFormValues,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ── Field change handlers ──────────────────────────────────────────────────

  const handleNumberChange =
    (field: keyof TouristInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number.parseFloat(e.target.value) || 0;
      setFormValues((prev) => {
        const updated = { ...prev, [field]: value };
        if (field === 'lag_1' || field === 'lag_2' || field === 'lag_3') {
          const l1 = field === 'lag_1' ? value : prev.lag_1;
          const l2 = field === 'lag_2' ? value : prev.lag_2;
          const l3 = field === 'lag_3' ? value : prev.lag_3;
          updated.rolling_mean_3 = Math.round(((l1 + l2 + l3) / 3) * 100) / 100;
        }
        return updated;
      });
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
      // Forecast starts from the month AFTER the last known month.
      // The user-supplied month/year is purely for lag reference — not the first predicted month.
      const lastMonth = formValues.month;
      const lastYear = formValues.year;
      const startMonth = lastMonth === 12 ? 1 : lastMonth + 1;
      const startYear  = lastMonth === 12 ? lastYear + 1 : lastYear;

      const results = await forecastRolling({
        ...formValues,
        month: startMonth,
        year: startYear,
      });

      // Build ChartDataPoint array — each entry uses the actual rolling month/year
      const points: ChartDataPoint[] = results.map((r) => ({
        label: `${MONTH_LABELS[r.month - 1]} ${r.year}`,
        month: r.month,
        year: r.year,
        originCountry: formValues.originCountry,
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
            <InputLabel>Last Known Year</InputLabel>
            <Select
              value={formValues.year}
              label="Last Known Year"
              onChange={(e) => handleSelectChange('year')(e.target.value as number)}
            >
              {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* ── Last Known Month ── */}
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth>
            <InputLabel>Last Known Month</InputLabel>
            <Select
              value={formValues.month}
              label="Last Known Month"
              onChange={(e) => handleSelectChange('month')(e.target.value as number)}
            >
              {MONTH_LABELS.map((label, idx) => (
                <MenuItem key={idx + 1} value={idx + 1}>
                  {label}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary" mt={0.5} px={0.5}>
              Forecast starts from the following month
            </Typography>
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
              Historical Tourist Arrivals (relative to Last Known Month)
            </Typography>
          </Divider>
        </Grid>

        {/* ── Lag 1 ── */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Tourists Last Month"
            type="number"
            fullWidth
            value={formValues.lag_1}
            onChange={handleNumberChange('lag_1')}
            helperText="Actual arrivals in Last Known Month"
          />
        </Grid>

        {/* ── Lag 2 ── */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Tourists 2 Months Ago"
            type="number"
            fullWidth
            value={formValues.lag_2}
            onChange={handleNumberChange('lag_2')}
            helperText="Actual arrivals the month before that"
          />
        </Grid>

        {/* ── Lag 3 ── */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Tourists 3 Months Ago"
            type="number"
            fullWidth
            value={formValues.lag_3}
            onChange={handleNumberChange('lag_3')}
            helperText="Actual arrivals 2 months before last"
          />
        </Grid>

        {/* ── Rolling Mean 3 ── */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="3-Month Average Arrivals"
            type="number"
            fullWidth
            value={formValues.rolling_mean_3}
            InputProps={{ readOnly: true }}
            helperText="Auto-calculated from above 3 values"
            sx={{ '& .MuiInputBase-input': { color: 'text.secondary', fontStyle: 'italic' } }}
          />
        </Grid>
      </Grid>

      {/* ── Submit ── */}
      <Box mt={4} display="flex" justifyContent="flex-end" gap={2}>
        <Button
          type="button"
          variant="outlined"
          size="large"
          disabled={loading}
          onClick={() => setFormValues(DEFAULT_VALUES)}
          sx={{ px: 4, py: 1.5, borderRadius: 3, fontWeight: 600 }}
        >
          Clear
        </Button>
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
              <strong>Tip:</strong> The chart shows a 12-month rolling forecast starting from the month
              after your <em>Last Known Month</em>. Navigate to <em>Forecast Chart</em> or{' '}
              <em>Forecast Table</em> to view the results.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ForecastForm;

/**
 * HistoryChart.tsx
 * Interactive Recharts line chart showing:
 *  – Historical monthly tourist arrivals (solid blue line)
 *  – Model forecast for the selected year (dashed orange line)
 *
 * Props:
 *  historicalData  – past actual counts per month
 *  forecastData    – model-predicted counts (from ForecastForm results)
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Typography,
  useTheme,
} from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartDataPoint } from '../types/types';

// ─── Static mock history ───────────────────────────────────────────────────────
// Replace this with a real /history API endpoint when available.

function buildMockHistory(): ChartDataPoint[] {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const baseValues: Record<number, number[]> = {
    2021: [3200,2800,3500,4100,4500,5200,5800,6100,5500,4900,4300,3900],
    2022: [3600,3100,4000,4700,5100,5900,6500,6900,6200,5600,4900,4500],
    2023: [4000,3500,4400,5200,5600,6400,7100,7600,6900,6100,5400,5000],
    2024: [4400,3900,4900,5700,6200,7000,7700,8200,7500,6700,5900,5500],
  };
  const points: ChartDataPoint[] = [];
  for (const [yearStr, values] of Object.entries(baseValues)) {
    const year = Number.parseInt(yearStr, 10);
    values.forEach((actual, idx) => {
      points.push({
        label: `${months[idx]} ${year}`,
        month: idx + 1,
        year,
        actual,
      });
    });
  }
  return points;
}

const MOCK_HISTORY = buildMockHistory();

// ─── Custom Tooltip ────────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        background: 'rgba(15,23,42,0.92)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 2,
        p: 1.5,
        backdropFilter: 'blur(8px)',
      }}
    >
      <Typography variant="caption" color="grey.300" mb={1} display="block">
        {label}
      </Typography>
      {payload.map((entry) => (
        <Box key={entry.name} display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: entry.color,
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" color="grey.100">
            {entry.name}:{' '}
            <strong>{entry.value.toLocaleString()}</strong>
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface HistoryChartProps {
  forecastData?: ChartDataPoint[];
  loading?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

const AVAILABLE_YEARS = [2021, 2022, 2023, 2024];

const HistoryChart: React.FC<HistoryChartProps> = ({ forecastData, loading = false }) => {
  const theme = useTheme();
  const [selectedYears, setSelectedYears] = useState<number[]>([2023, 2024]);

  const toggleYear = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  // Combine historical and forecast data filtered by selected years
  const chartData: ChartDataPoint[] = [
    ...MOCK_HISTORY.filter((p) => selectedYears.includes(p.year)),
    ...(forecastData ?? []),
  ].sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));

  // Determine forecast year label, e.g. "2025"
  const forecastYear = forecastData?.[0]?.year;

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 2, mt: 1 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <ShowChartIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Monthly Tourist Arrivals
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <FilterAltIcon fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary">
            Filter years:
          </Typography>
          <ButtonGroup size="small" variant="outlined">
            {AVAILABLE_YEARS.map((y) => (
              <Button
                key={y}
                onClick={() => toggleYear(y)}
                variant={selectedYears.includes(y) ? 'contained' : 'outlined'}
                sx={{ minWidth: 56 }}
              >
                {y}
              </Button>
            ))}
          </ButtonGroup>
          {forecastYear && (
            <Chip
              label={`Forecast ${forecastYear}`}
              size="small"
              color="warning"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
      </Box>

      {/* Chart */}
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          background:
            theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.03)'
              : 'rgba(25,118,210,0.02)',
        }}
      >
        <CardContent sx={{ p: '24px !important' }}>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="4 4" stroke={theme.palette.divider} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                interval="preserveStartEnd"
                angle={-30}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />

              {/* Dividing reference line at start of forecast year */}
              {forecastYear && (
                <ReferenceLine
                  x={`Jan ${forecastYear}`}
                  stroke={theme.palette.warning.main}
                  strokeDasharray="6 3"
                  label={{
                    value: 'Forecast →',
                    fill: theme.palette.warning.main,
                    fontSize: 11,
                    position: 'top',
                  }}
                />
              )}

              {/* Historical actual line */}
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual Arrivals"
                stroke={theme.palette.primary.main}
                strokeWidth={2.5}
                dot={{ r: 3, fill: theme.palette.primary.main }}
                activeDot={{ r: 6 }}
                connectNulls
              />

              {/* Forecast predicted line */}
              <Line
                type="monotone"
                dataKey="predicted"
                name="Predicted Arrivals"
                stroke={theme.palette.warning.dark}
                strokeWidth={2.5}
                strokeDasharray="6 3"
                dot={{ r: 3, fill: theme.palette.warning.dark }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default HistoryChart;

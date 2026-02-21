/**
 * HistoryChart.tsx
 * Line chart showing the 12-month model forecast produced by ForecastForm.
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Typography,
  useTheme,
} from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartDataPoint } from '../types/types';

// â”€â”€â”€ Custom Tooltip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }} />
          <Typography variant="caption" color="grey.100">
            {entry.name}: <strong>{entry.value.toLocaleString()}</strong>
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface HistoryChartProps {
  forecastData?: ChartDataPoint[];
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const HistoryChart: React.FC<HistoryChartProps> = ({ forecastData }) => {
  const theme = useTheme();
  const forecastYear = forecastData?.[0]?.year;
  const originCountry = forecastData?.[0]?.originCountry;

  if (!forecastData || forecastData.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={10} gap={2}>
        <ShowChartIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
        <Typography color="text.secondary">
          No forecast yet. Fill in the Scenario Input and click <strong>Generate Forecast</strong>.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={2}>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <ShowChartIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            {originCountry
              ? `Tourist Arrival Forecast — ${originCountry}`
              : 'Forecast Chart'}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          {!!originCountry && (
            <Chip label={originCountry} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
          )}
          {!!forecastYear && (
            <Chip label={`Forecast ${forecastYear}`} size="small" color="warning" sx={{ fontWeight: 600 }} />
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
            <LineChart data={forecastData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="4 4" stroke={theme.palette.divider} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={55}
              />
              <YAxis
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="predicted"
                name="Predicted Arrivals"
                stroke={theme.palette.warning.dark}
                strokeWidth={2.5}
                strokeDasharray="6 3"
                dot={{ r: 4, fill: theme.palette.warning.dark }}
                activeDot={{ r: 7 }}
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

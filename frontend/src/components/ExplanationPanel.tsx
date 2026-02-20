/**
 * ExplanationPanel.tsx
 * Visualises feature importance / SHAP-style contributions as a horizontal
 * bar chart (Recharts) and a summary table.
 *
 * Props:
 *  explanation – ExplanationData object produced by approximateShap() in
 *                ForecastForm (or returned directly by the backend if you add
 *                a /explain endpoint).
 *  loading     – shows a skeleton while the forecast is in progress.
 */

import React, { useMemo } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip as RechartsTip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ExplanationData, ShapEntry } from '../types/types';

// ─── Custom tooltip for the bar chart ─────────────────────────────────────────

interface CustomTipProps {
  active?: boolean;
  payload?: Array<{ payload: ShapEntry }>;
}

const CustomBarTip: React.FC<CustomTipProps> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <Box
      sx={{
        background: 'rgba(15,23,42,0.92)',
        borderRadius: 2,
        p: 1.5,
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <Typography variant="caption" color="grey.300" display="block" mb={0.5}>
        <strong>{entry.feature}</strong>
      </Typography>
      <Typography variant="caption" color="grey.200" display="block">
        Input value: {typeof entry.inputValue === 'number' ? entry.inputValue.toLocaleString() : entry.inputValue}
      </Typography>
      <Typography
        variant="caption"
        color={entry.value >= 0 ? 'success.light' : 'error.light'}
        display="block"
      >
        SHAP contribution: {entry.value >= 0 ? '+' : ''}{entry.value.toFixed(1)}
      </Typography>
    </Box>
  );
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ExplanationPanelProps {
  explanation: ExplanationData | null;
  loading?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

const ExplanationPanel: React.FC<ExplanationPanelProps> = ({
  explanation,
  loading = false,
}) => {
  const theme = useTheme();

  const sortedShap: ShapEntry[] = useMemo(() => {
    if (!explanation) return [];
    return [...explanation.shapValues].sort(
      (a, b) => Math.abs(b.value) - Math.abs(a.value)
    );
  }, [explanation]);

  // Show only top-10 features in the chart to keep it readable
  const chartData = sortedShap.slice(0, 10);

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={240} height={32} />
        <Skeleton variant="rectangular" height={340} sx={{ borderRadius: 2, mt: 1 }} />
      </Box>
    );
  }

  if (!explanation) {
    return (
      <Alert
        severity="info"
        icon={<InfoOutlinedIcon />}
        sx={{ borderRadius: 2 }}
      >
        Run a forecast from the <strong>Forecast</strong> tab to see feature
        importance explanations here.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Title */}
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Typography variant="h6" fontWeight={700}>
          Feature Importance (SHAP-style)
        </Typography>
        <Tooltip title="Values show how much each feature pushes the prediction above or below the baseline.">
          <InfoOutlinedIcon fontSize="small" color="action" />
        </Tooltip>
      </Box>

      {/* Summary */}
      <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
        <Chip
          label={`Base value: ${explanation.baseValue.toFixed(0)}`}
          variant="outlined"
          color="default"
        />
        <Chip
          label={`Predicted: ${explanation.predictedValue.toFixed(0)}`}
          color="primary"
          sx={{ fontWeight: 700 }}
        />
      </Box>

      {/* Bar chart */}
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          mb: 3,
        }}
      >
        <CardContent sx={{ p: '24px !important' }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Top 10 features by absolute SHAP contribution
          </Typography>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 60, left: 160, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke={theme.palette.divider} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                tickFormatter={(v: number) => v.toFixed(0)}
              />
              <YAxis
                type="category"
                dataKey="feature"
                tick={{ fontSize: 12, fill: theme.palette.text.primary }}
                width={155}
              />
              <RechartsTip content={<CustomBarTip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.feature}
                    fill={
                      entry.value >= 0
                        ? theme.palette.success.main
                        : theme.palette.error.main
                    }
                    fillOpacity={0.85}
                  />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) => (v >= 0 ? `+${v.toFixed(0)}` : v.toFixed(0))}
                  style={{ fontSize: 11, fill: theme.palette.text.secondary }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Full feature table */}
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        All Features
      </Typography>
      <Card
        elevation={0}
        sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}
      >
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                <TableCell>#</TableCell>
                <TableCell>Feature</TableCell>
                <TableCell align="right">Input Value</TableCell>
                <TableCell align="right">SHAP Contribution</TableCell>
                <TableCell align="center">Direction</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedShap.map((entry, idx) => (
                <TableRow
                  key={entry.feature}
                  hover
                  sx={{ '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}
                >
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{entry.feature}</TableCell>
                  <TableCell align="right">
                    {typeof entry.inputValue === 'number'
                      ? entry.inputValue.toLocaleString()
                      : entry.inputValue}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: entry.value >= 0 ? 'success.main' : 'error.main',
                      fontWeight: 600,
                    }}
                  >
                    {entry.value >= 0 ? '+' : ''}{entry.value.toFixed(2)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={entry.value >= 0 ? '▲ Increases' : '▼ Decreases'}
                      size="small"
                      color={entry.value >= 0 ? 'success' : 'error'}
                      variant="outlined"
                      sx={{ fontSize: 10 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default ExplanationPanel;

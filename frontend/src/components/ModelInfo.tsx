/**
 * ModelInfo.tsx
 * Static page displaying Model Training and Evaluation details.
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Alert,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import TuneIcon from '@mui/icons-material/Tune';
import BarChartIcon from '@mui/icons-material/BarChart';
import ImageIcon from '@mui/icons-material/Image';

// ─── Metric card ───────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  color: string;
  description: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, color, description }) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={1}>
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={800} color={color} mt={0.5}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary" mt={0.5}>
        {description}
      </Typography>
    </CardContent>
  </Card>
);

// ─── Section header ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, subtitle }) => (
  <Box display="flex" alignItems="center" gap={1.5} mb={2}>
    <Box
      sx={{
        bgcolor: 'primary.main',
        borderRadius: 2,
        p: 0.8,
        display: 'flex',
        color: 'white',
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="h6" fontWeight={700}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  </Box>
);

// ─── Component ─────────────────────────────────────────────────────────────────

const ModelInfo: React.FC = () => {
  const hyperparams = [
    { param: 'n_estimators',     value: '300',  description: 'Number of boosting rounds' },
    { param: 'learning_rate',    value: '0.05', description: 'Step size shrinkage' },
    { param: 'max_depth',        value: '6',    description: 'Maximum tree depth' },
    { param: 'subsample',        value: '0.8',  description: 'Row sampling ratio' },
    { param: 'colsample_bytree', value: '0.8',  description: 'Column sampling per tree' },
    { param: 'random_state',     value: '42',   description: 'Reproducibility seed' },
  ];

  return (
    <Box display="flex" flexDirection="column" gap={4}>

      {/* ── 3.1 Train-Test Split ── */}
      <Card variant="outlined">
        <CardContent>
          <SectionHeader
            icon={<ScienceIcon fontSize="small" />}
            title="3.1  Train-Test Split"
            subtitle="Time-series aware splitting strategy"
          />
          <Alert severity="info" sx={{ mb: 2 }}>
            Time-based split was used instead of random splitting to preserve chronological order.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Paper
                variant="outlined"
                sx={{ p: 2, borderColor: 'primary.main', borderWidth: 2, textAlign: 'center' }}
              >
                <Typography variant="overline" color="primary">Training Set</Typography>
                <Typography variant="h3" fontWeight={800} color="primary.main">80%</Typography>
                <Typography variant="body2" color="text.secondary">Earlier months</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper
                variant="outlined"
                sx={{ p: 2, borderColor: 'secondary.main', borderWidth: 2, textAlign: 'center' }}
              >
                <Typography variant="overline" color="secondary">Test Set</Typography>
                <Typography variant="h3" fontWeight={800} color="secondary.main">20%</Typography>
                <Typography variant="body2" color="text.secondary">Most recent months</Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── 3.2 Hyperparameters ── */}
      <Card variant="outlined">
        <CardContent>
          <SectionHeader
            icon={<TuneIcon fontSize="small" />}
            title="3.2  Hyperparameters"
            subtitle="XGBoost model configuration"
          />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Parameter</strong></TableCell>
                  <TableCell><strong>Value</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {hyperparams.map((row) => (
                  <TableRow key={row.param} hover>
                    <TableCell>
                      <Chip label={row.param} size="small" variant="outlined" color="primary" sx={{ fontFamily: 'monospace' }} />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={700} fontFamily="monospace">{row.value}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{row.description}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* ── 3.3 Performance Metrics ── */}
      <Card variant="outlined">
        <CardContent>
          <SectionHeader
            icon={<BarChartIcon fontSize="small" />}
            title="3.3  Performance Metrics"
            subtitle="Regression evaluation on the test set"
          />
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={4}>
              <MetricCard
                label="RMSE"
                value="5,306.73"
                color="error.main"
                description="Root Mean Squared Error"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <MetricCard
                label="MAE"
                value="3,420.87"
                color="warning.main"
                description="Mean Absolute Error"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <MetricCard
                label="R² Score"
                value="0.6692"
                color="success.main"
                description="Explains 67% of variance"
              />
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Alert severity="success">
            The R² score of <strong>0.669</strong> indicates the model explains approximately <strong>67%</strong> of the variance in tourist arrivals — an acceptable result for this regression task. The RMSE and MAE reflect the magnitude of prediction errors in tourist count units.
          </Alert>
        </CardContent>
      </Card>

      {/* ── 3.4 Graphs and Plots ── */}
      <Card variant="outlined">
        <CardContent>
          <SectionHeader
            icon={<ImageIcon fontSize="small" />}
            title="3.4  Graphs and Plots"
            subtitle="Visual evaluation of model performance"
          />
          <Alert severity="info">
            <p><img src="/actualvspredicted.png" alt="Actual vs Predicted" width="100%" /></p>
            <p><img src="/forecast.png" alt="forecast" width="100%" /></p>
            <p><img src="/residual-plot.png" alt="residual plot" width="100%" /></p>

          </Alert>
        </CardContent>
      </Card>

    </Box>
  );
};

export default ModelInfo;

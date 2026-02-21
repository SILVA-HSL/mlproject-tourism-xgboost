import React from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import ImageIcon from '@mui/icons-material/Image';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

// ─── Section header (reused style) ────────────────────────────────────────────

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, subtitle }) => (
  <Box display="flex" alignItems="center" gap={1.5} mb={2}>
    <Box sx={{ bgcolor: 'primary.main', borderRadius: 2, p: 0.8, display: 'flex', color: 'white' }}>
      {icon}
    </Box>
    <Box>
      <Typography variant="h6" fontWeight={700}>{title}</Typography>
      {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
    </Box>
  </Box>
);


// ─── SHAP contributions ────────────────────────────────────────────────────────

const shapRows = [
  { feature: 'lag_1 / lag_2 / lag_3',         effect: 'positive', description: 'High lag values increase predicted tourist count — seasonal momentum.' },
  { feature: 'sunshine_duration_seconds',      effect: 'positive', description: 'More sunshine positively contributes to tourist arrivals.' },
  { feature: 'dollarRate',                     effect: 'negative', description: 'A higher dollar rate negatively impacts tourist demand.' },
];

// ─── Component ─────────────────────────────────────────────────────────────────

const Explainability: React.FC = () => (
  <Box display="flex" flexDirection="column" gap={4}>

    {/* ── 4.1 Feature Importance ── */}
    <Card variant="outlined">
      <CardContent>
        <SectionHeader
          icon={<InsightsIcon fontSize="small" />}
          title="4.1  Feature Importance"
          subtitle="Relative influence of each feature on the XGBoost model"
        />

        <Alert severity="info" sx={{ mb: 3 }}>
          The most influential features are the <strong>lag features</strong>, followed by <strong>dollarRate</strong>, implying that seasonal trends are significant.
          The <strong>Air Passenger Fare Index</strong> is the next most important feature, indicating that economic conditions affect tourism demand.
        </Alert>

        

        {/* Placeholder for Feature Importance plot */}
        <Box mt={3}>
          <Alert severity="info" icon={<ImageIcon />}>
            <p><img src="/feature-importance.png" alt="Feature Importance" width="100%" /></p>
          </Alert>
        </Box>
      </CardContent>
    </Card>

    {/* ── 4.2 SHAP Analysis ── */}
    <Card variant="outlined">
      <CardContent>
        <SectionHeader
          icon={<InsightsIcon fontSize="small" />}
          title="4.2  SHAP Analysis"
          subtitle="How each feature contributes to individual predictions"
        />

        <Alert severity="info" sx={{ mb: 3 }}>
          SHAP (SHapley Additive exPlanations) values were used to understand how each feature
          contributes to predictions. This aligns with domain knowledge in tourism economics.
        </Alert>

        <Grid container spacing={2} mb={3}>
          {shapRows.map((row) => (
            <Grid item xs={12} md={4} key={row.feature}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderColor: row.effect === 'positive' ? 'success.main' : 'error.main',
                  borderWidth: 2,
                  height: '100%',
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  {row.effect === 'positive'
                    ? <TrendingUpIcon color="success" />
                    : <TrendingDownIcon color="error" />}
                  <Chip
                    label={row.effect === 'positive' ? 'Positive' : 'Negative'}
                    size="small"
                    color={row.effect === 'positive' ? 'success' : 'error'}
                  />
                </Box>
                <Typography fontFamily="monospace" fontWeight={700} variant="body2" mb={0.5}>
                  {row.feature}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {row.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Placeholder for SHAP plot */}
        <Alert severity="info" icon={<ImageIcon />}>
            <p><img src="/shap.png" alt="SHAP Summary Plot" width="100%" /></p>
        </Alert>
      </CardContent>
    </Card>

  </Box>
);

export default Explainability;

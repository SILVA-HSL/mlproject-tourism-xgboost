/**
 * HistoryTable.tsx
 * Tabular view of the 12-month model forecast produced by ForecastForm.
 */

import React from 'react';
import {
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import TableChartIcon from '@mui/icons-material/TableChart';
import type { ChartDataPoint } from '../types/types';

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface HistoryTableProps {
  forecastData?: ChartDataPoint[];
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const HistoryTable: React.FC<HistoryTableProps> = ({ forecastData }) => {
  const rows = forecastData ?? [];
  const forecastYear = rows[0]?.year;
  const originCountry = rows[0]?.originCountry;

  const handleExport = () => {
    if (!rows.length) return;
    const headers = ['Country', 'Period', 'Year', 'Month', 'Predicted Arrivals'];
    const lines = rows.map((r) =>
      [r.originCountry ?? originCountry ?? '', r.label, r.year, r.month, r.predicted ?? ''].join(',')
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forecast_${originCountry ? originCountry.split(' ').join('_') + '_' : ''}${forecastYear ?? 'results'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!rows.length) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={10} gap={2}>
        <TableChartIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
        <Typography color="text.secondary">
          No forecast yet. Fill in the Scenario Input and click <strong>Generate Forecast</strong>.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Toolbar */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <TableChartIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            {originCountry
              ? `Tourist Arrival Forecast — ${originCountry}`
              : 'Forecast Table'}
          </Typography>
          {!!forecastYear && (
            <Chip label={`${forecastYear}`} size="small" color="warning" sx={{ fontWeight: 600 }} />
          )}
          {!!originCountry && (
            <Chip label={originCountry} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
          )}
        </Box>
        <Tooltip title="Export predictions to CSV">
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport} size="small">
            Export CSV
          </Button>
        </Tooltip>
      </Box>

      {/* Table */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'primary.main', color: 'white' } }}>
                <TableCell>#</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Period</TableCell>
                <TableCell align="right">Year</TableCell>
                <TableCell align="right">Month</TableCell>
                <TableCell align="right">Predicted Arrivals</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow
                  key={`${row.year}-${row.month}`}
                  hover
                  sx={{ '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}
                >
                  <TableCell sx={{ color: 'text.disabled' }}>{idx + 1}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.originCountry ?? originCountry ?? '—'}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 600, fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{row.label}</TableCell>
                  <TableCell align="right">{row.year}</TableCell>
                  <TableCell align="right">{row.month}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={700} color="warning.dark">
                      {row.predicted?.toLocaleString() ?? '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}

            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default HistoryTable;

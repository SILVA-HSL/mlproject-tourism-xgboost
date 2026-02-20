/**
 * HistoryTable.tsx
 * Tabular view of historical + forecast data.
 * Supports sorting, pagination, and CSV export of the displayed rows.
 *
 * Props:
 *  forecastData – predicted monthly arrivals produced by ForecastForm
 */

import React, { useMemo, useState } from 'react';
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
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import type { ChartDataPoint } from '../types/types';

// ─── Shared mock history (mirrors HistoryChart, kept in sync) ─────────────────

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
      points.push({ label: `${months[idx]} ${year}`, month: idx + 1, year, actual });
    });
  }
  return points;
}

const MOCK_HISTORY = buildMockHistory();

// ─── Sorting helpers ──────────────────────────────────────────────────────────

type SortField = 'label' | 'year' | 'month' | 'actual' | 'predicted';
type SortOrder = 'asc' | 'desc';

function comparator(a: ChartDataPoint, b: ChartDataPoint, field: SortField): number {
  const aVal = a[field] ?? -Infinity;
  const bVal = b[field] ?? -Infinity;
  if (aVal < bVal) return -1;
  if (aVal > bVal) return 1;
  return 0;
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface HistoryTableProps {
  forecastData?: ChartDataPoint[];
}

// ─── Component ─────────────────────────────────────────────────────────────────

const HistoryTable: React.FC<HistoryTableProps> = ({ forecastData }) => {
  const [sortField, setSortField] = useState<SortField>('year');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 12;

  // Merge historical and forecast data
  const allData: ChartDataPoint[] = useMemo(() => {
    const combined = [
      ...MOCK_HISTORY,
      ...(forecastData ?? []),
    ];
    return combined;
  }, [forecastData]);

  // Filter by search term
  const filtered = useMemo(
    () =>
      allData.filter((row) =>
        row.label.toLowerCase().includes(search.toLowerCase())
      ),
    [allData, search]
  );

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const cmp = comparator(a, b, sortField);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortOrder]);

  // Paginate
  const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(0);
  };

  // ── CSV export ──────────────────────────────────────────────────────────────

  const handleExport = () => {
    const headers = ['Period', 'Year', 'Month', 'Actual Arrivals', 'Predicted Arrivals'];
    const rows = sorted.map((row) =>
      [
        row.label,
        row.year,
        row.month,
        row.actual ?? '',
        row.predicted ?? '',
      ].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tourism_history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      {/* Toolbar */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        mb={2}
      >
        <Typography variant="h6" fontWeight={700}>
          Historical & Forecast Data
        </Typography>

        <Box display="flex" gap={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Search period…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.disabled' }} /> }}
            sx={{ width: 180 }}
          />
          <Tooltip title="Export visible rows to CSV">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              size="small"
            >
              Export
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Table */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'primary.main', color: 'white' } }}>
                <TableCell>
                  <TableSortLabel
                    active={sortField === 'label'}
                    direction={sortField === 'label' ? sortOrder : 'asc'}
                    onClick={() => handleSort('label')}
                    sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                  >
                    Period
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortField === 'year'}
                    direction={sortField === 'year' ? sortOrder : 'asc'}
                    onClick={() => handleSort('year')}
                    sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                  >
                    Year
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Month</TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortField === 'actual'}
                    direction={sortField === 'actual' ? sortOrder : 'asc'}
                    onClick={() => handleSort('actual')}
                    sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                  >
                    Actual Arrivals
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortField === 'predicted'}
                    direction={sortField === 'predicted' ? sortOrder : 'asc'}
                    onClick={() => handleSort('predicted')}
                    sx={{ color: 'white !important', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                  >
                    Predicted Arrivals
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Source</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((row) => (
                <TableRow
                  key={`${row.year}-${row.month}`}
                  hover
                  sx={{
                    '&:nth-of-type(even)': { bgcolor: 'action.hover' },
                    transition: 'background-color 0.2s',
                  }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>{row.label}</TableCell>
                  <TableCell align="right">{row.year}</TableCell>
                  <TableCell align="right">{row.month}</TableCell>
                  <TableCell align="right">
                    {row.actual === undefined
                      ? <Typography variant="caption" color="text.disabled">—</Typography>
                      : row.actual.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    {row.predicted === undefined ? (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    ) : (
                      <Box display="flex" justifyContent="flex-end" alignItems="center" gap={0.5}>
                        <strong>{row.predicted.toLocaleString()}</strong>
                        {row.actual !== undefined && (
                          <Typography
                            variant="caption"
                            color={row.predicted >= row.actual ? 'success.main' : 'error.main'}
                          >
                            ({row.predicted >= row.actual ? '+' : ''}
                            {(((row.predicted - row.actual) / row.actual) * 100).toFixed(1)}%)
                          </Typography>
                        )}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={row.predicted !== undefined && row.actual === undefined ? 'Forecast' : 'Historical'}
                      size="small"
                      color={row.predicted !== undefined && row.actual === undefined ? 'warning' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No results found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={sorted.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[]}
        />
      </Paper>
    </Box>
  );
};

export default HistoryTable;

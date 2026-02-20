/**
 * CSVUpload.tsx
 * Allows users to upload a CSV file whose rows match the TouristInput schema.
 * Each row is sent to POST /predict and the results are displayed in a table
 * with a download button.
 *
 * Expected CSV columns (header row required):
 *   originCountry, year, month, dollarRate, apparent_temperature_mean_celcius,
 *   sunshine_duration_seconds, rain_sum_mm, precipitation_hours,
 *   num_establishments, num_rooms, AirPassengerFaresIndex,
 *   consumerPriceIndex, lag_1, lag_2, lag_3, rolling_mean_3
 */

import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { CSVPredictionRow, TouristInput } from '../types/types';
import { predictSingle } from '../api/api';

// ─── Required CSV columns ─────────────────────────────────────────────────────

const REQUIRED_COLUMNS: Array<keyof TouristInput> = [
  'originCountry', 'year', 'month', 'dollarRate',
  'apparent_temperature_mean_celcius', 'sunshine_duration_seconds',
  'rain_sum_mm', 'precipitation_hours', 'num_establishments', 'num_rooms',
  'AirPassengerFaresIndex', 'consumerPriceIndex',
  'lag_1', 'lag_2', 'lag_3', 'rolling_mean_3',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a raw PapaParse row into a typed TouristInput. */
function parseRow(raw: Record<string, string>): TouristInput {
  const p = (s: string) => Number.parseFloat(s);
  return {
    originCountry: raw.originCountry ?? '',
    year: p(raw.year),
    month: p(raw.month),
    dollarRate: p(raw.dollarRate),
    apparent_temperature_mean_celcius: p(raw.apparent_temperature_mean_celcius),
    sunshine_duration_seconds: p(raw.sunshine_duration_seconds),
    rain_sum_mm: p(raw.rain_sum_mm),
    precipitation_hours: p(raw.precipitation_hours),
    num_establishments: p(raw.num_establishments),
    num_rooms: p(raw.num_rooms),
    AirPassengerFaresIndex: p(raw.AirPassengerFaresIndex),
    consumerPriceIndex: p(raw.consumerPriceIndex),
    lag_1: p(raw.lag_1),
    lag_2: p(raw.lag_2),
    lag_3: p(raw.lag_3),
    rolling_mean_3: p(raw.rolling_mean_3),
  };
}

/** Predict a single parsed row and return it as a CSVPredictionRow. */
async function predictRow(row: TouristInput, index: number): Promise<CSVPredictionRow> {
  const res = await predictSingle(row);
  return {
    row: index,
    ...row,
    predicted_tourists: Math.round(res.predicted_tourists),
  } as CSVPredictionRow;
}

/** Generate and download a sample CSV the user can fill in. */
function downloadSampleCSV() {
  const header = REQUIRED_COLUMNS.join(',');
  const sample = [
    'China,2025,1,300,27,21600,150,80,500,15000,120,110,5000,4800,4600,4800',
    'India,2025,2,300,28,22000,120,70,500,15000,121,111,5200,5000,4800,5000',
  ];
  const csv = [header, ...sample].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_input.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ─────────────────────────────────────────────────────────────────

const CSVUpload: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [results, setResults] = useState<CSVPredictionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // ── File handler ────────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setValidationErrors([]);
    setResults([]);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const data = result.data;
        setRowCount(data.length);

        // Validate columns
        const headers = Object.keys(data[0] ?? {});
        const missingCols = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
        if (missingCols.length) {
          setValidationErrors(missingCols.map((c) => `Missing column: ${c}`));
          return;
        }

        // Parse rows
        const parsed: TouristInput[] = data.map(parseRow);

        // Run batch predict
        setLoading(true);
        setProgress(0);
        try {
          const BATCH_SIZE = 5;
          const allResults: CSVPredictionRow[] = [];
          for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
            const batch = parsed.slice(i, i + BATCH_SIZE);
            const preds = await Promise.all(
              batch.map((row, j) => predictRow(row, i + j + 1))
            );
            allResults.push(...preds);
            setProgress(Math.round(((i + batch.length) / parsed.length) * 100));
          }
          setResults(allResults);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Batch prediction failed');
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setError(`CSV parse error: ${err.message}`);
      },
    });
  };

  // ── Export results CSV ──────────────────────────────────────────────────────

  const handleDownload = () => {
    if (!results.length) return;
    const columns = ['row', ...REQUIRED_COLUMNS, 'predicted_tourists'];
    const header = columns.join(',');
    const rows = results.map((r) =>
      columns.map((c) => r[c] ?? '').join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'predictions_output.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: 'primary.main' }}>
        Batch CSV Prediction
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Upload a CSV file containing multiple scenarios. Each row is sent
        to the forecasting model and the predicted tourist count is appended.
      </Typography>

      {/* Drop zone / file selector */}
      <Card
        elevation={0}
        onClick={() => inputRef.current?.click()}
        sx={{
          border: '2px dashed',
          borderColor: fileName ? 'success.main' : 'primary.light',
          borderRadius: 3,
          cursor: 'pointer',
          mb: 3,
          transition: 'border-color 0.2s, background 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            background: 'rgba(25,118,210,0.04)',
          },
        }}
      >
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 4,
          }}
        >
          {fileName ? (
            <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
          ) : (
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.light', mb: 1 }} />
          )}
          <Typography variant="subtitle1" fontWeight={600}>
            {fileName ?? 'Click to select a CSV file'}
          </Typography>
          {fileName && (
            <Typography variant="caption" color="text.secondary">
              {rowCount} row{rowCount === 1 ? '' : 's'} detected
            </Typography>
          )}
          {!fileName && (
            <Typography variant="caption" color="text.secondary">
              Supported format: .csv with header row
            </Typography>
          )}
        </CardContent>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          hidden
          onChange={handleFileChange}
        />
      </Card>

      {/* Sample download */}
      <Box display="flex" gap={1} mb={3} flexWrap="wrap">
        <Tooltip title="Download an example CSV with the required columns">
          <Button
            variant="text"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={(e) => { e.stopPropagation(); downloadSampleCSV(); }}
          >
            Download Sample CSV
          </Button>
        </Tooltip>
        <Typography variant="caption" color="text.secondary" alignSelf="center">
          Required columns: {REQUIRED_COLUMNS.join(', ')}
        </Typography>
      </Box>

      {/* Progress */}
      {loading && (
        <Box mb={3}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <CircularProgress size={16} />
            <Typography variant="body2">
              Running predictions… {progress}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 2, height: 6 }} />
        </Box>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert severity="error" icon={<ErrorOutlineIcon />} sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600} mb={0.5}>
            CSV validation failed:
          </Typography>
          {validationErrors.map((e) => (
            <Typography key={e} variant="caption" display="block">
              • {e}
            </Typography>
          ))}
        </Alert>
      )}

      {/* General error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <>
          <Divider sx={{ mb: 2 }} />
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6" fontWeight={700}>
                Prediction Results
              </Typography>
              <Chip label={`${results.length} rows`} size="small" color="primary" />
            </Box>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              sx={{ borderRadius: 2 }}
            >
              Download Results
            </Button>
          </Box>

          <Paper
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}
          >
            <TableContainer sx={{ maxHeight: 440 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'primary.main', color: 'white' } }}>
                    <TableCell>#</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell align="right">Year</TableCell>
                    <TableCell align="right">Month</TableCell>
                    <TableCell align="right">Dollar Rate</TableCell>
                    <TableCell align="right">Predicted Tourists</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((row) => (
                    <TableRow
                      key={row.row}
                      hover
                      sx={{ '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}
                    >
                      <TableCell>{row.row}</TableCell>
                      <TableCell>{row.originCountry}</TableCell>
                      <TableCell align="right">{row.year}</TableCell>
                      <TableCell align="right">{row.month}</TableCell>
                      <TableCell align="right">{(row.dollarRate as number)?.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700} color="primary.main">
                          {row.predicted_tourists.toLocaleString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default CSVUpload;

/**
 * CSVUpload.tsx
 * Allows users to upload a CSV file containing historical tourist data.
 * The file is sent to POST /predict-csv where the backend computes
 * lag_1/2/3 and rolling_mean_3 automatically from the totalCount column.
 *
 * Required CSV columns:
 *   originCountry, year, month, totalCount, dollarRate,
 *   apparent_temperature_mean_celcius, sunshine_duration_seconds,
 *   rain_sum_mm, precipitation_hours, num_establishments, num_rooms,
 *   AirPassengerFaresIndex, consumerPriceIndex
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
import type { CSVBatchPrediction } from '../types/types';
import { predictBatchCSV } from '../api/api';

// ─── Required CSV columns ─────────────────────────────────────────────────────

const REQUIRED_COLUMNS = [
  'originCountry', 'year', 'month', 'totalCount', 'dollarRate',
  'apparent_temperature_mean_celcius', 'sunshine_duration_seconds',
  'rain_sum_mm', 'precipitation_hours', 'num_establishments', 'num_rooms',
  'AirPassengerFaresIndex', 'consumerPriceIndex',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate and download a sample CSV the user can fill in. */
function downloadSampleCSV() {
  const header = REQUIRED_COLUMNS.join(',');
  const sample = [
    'China,2024,1,5000,320,27,21600,150,80,1500,32000,110,125',
    'China,2024,2,5200,320,28,22000,120,70,1500,32000,111,126',
    'China,2024,3,4800,320,26,21000,180,90,1500,32000,112,127',
    'India,2024,1,4000,320,27,21600,150,80,1500,32000,110,125',
    'India,2024,2,4200,320,28,22000,120,70,1500,32000,111,126',
    'India,2024,3,3900,320,26,21000,180,90,1500,32000,112,127',
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
  const [results, setResults] = useState<CSVBatchPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fileRef, setFileRef] = useState<File | null>(null);

  // ── File handler ────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setValidationErrors([]);
    setResults([]);
    setFileRef(file);

    // Client-side column validation only – lags are NOT required
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      preview: 1,
      complete: (result) => {
        const data = result.data;
        const headers = Object.keys(data[0] ?? {});
        const missingCols = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
        if (missingCols.length) {
          setValidationErrors(missingCols.map((c) => `Missing column: ${c}`));
        }
      },
      error: (err) => {
        setError(`CSV parse error: ${err.message}`);
      },
    });
  };

  // ── Submit to backend ──────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!fileRef || validationErrors.length) return;
    setLoading(true);
    setError(null);
    try {
      const response = await predictBatchCSV(fileRef);
      setResults(response.predictions);
      setRowCount(response.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch prediction failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Export results CSV ──────────────────────────────────────────────────────

  const handleDownload = () => {
    if (!results.length) return;
    const header = 'row,originCountry,year,month,dollarRate,lag_1,lag_2,lag_3,rolling_mean_3,actual_tourists,predicted_tourists';
    const rows = results.map((r) =>
      [r.row, r.originCountry, r.year, r.month, r.dollarRate,
       r.lag_1, r.lag_2, r.lag_3, r.rolling_mean_3,
       r.actual_tourists, r.predicted_tourists].join(',')
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
        Upload a CSV file with historical tourist data. Lag features are computed
        automatically from the <strong>totalCount</strong> column — no need to add them manually.
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

      {/* Sample download + predict button */}
      <Box display="flex" gap={1} mb={3} flexWrap="wrap" alignItems="center">
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
        <Button
          variant="contained"
          size="small"
          disabled={!fileRef || loading || validationErrors.length > 0}
          onClick={handleUpload}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ borderRadius: 2 }}
        >
          {loading ? 'Predicting…' : 'Run Predictions'}
        </Button>
        <Typography variant="caption" color="text.secondary">
          Required columns: {REQUIRED_COLUMNS.join(', ')}
        </Typography>
      </Box>

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
                    <TableCell align="right">Lag 1</TableCell>
                    <TableCell align="right">Lag 2</TableCell>
                    <TableCell align="right">Lag 3</TableCell>
                    <TableCell align="right">Rolling Mean</TableCell>
                    <TableCell align="right">Actual</TableCell>
                    <TableCell align="right">Predicted</TableCell>
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
                      <TableCell align="right">{row.lag_1.toLocaleString()}</TableCell>
                      <TableCell align="right">{row.lag_2.toLocaleString()}</TableCell>
                      <TableCell align="right">{row.lag_3.toLocaleString()}</TableCell>
                      <TableCell align="right">{row.rolling_mean_3.toLocaleString()}</TableCell>
                      <TableCell align="right">{row.actual_tourists.toLocaleString()}</TableCell>
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

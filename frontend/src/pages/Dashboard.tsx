/**
 * Dashboard.tsx
 * Main page shell: sidebar navigation + content area.
 * Holds shared state (forecast results, explanation data) and passes it down
 * to the appropriate child components.
 */

import React, { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import ScienceIcon from '@mui/icons-material/Science';
import InsightsIcon from '@mui/icons-material/Insights';

import ForecastForm, { DEFAULT_VALUES } from '../components/ForecastForm';
import HistoryChart from '../components/HistoryChart';
import HistoryTable from '../components/HistoryTable';
import ExplanationPanel from '../components/ExplanationPanel';
import ModelInfo from '../components/ModelInfo';
import Explainability from '../components/Explainability';
import type { ChartDataPoint, ExplanationData, TouristInput } from '../types/types';

// ─── Sidebar width ─────────────────────────────────────────────────────────────

const DRAWER_WIDTH = 240;

// ─── Nav items ─────────────────────────────────────────────────────────────────

// Because 'history' appears as two separate views we use a finer-grained ViewId
type ViewId = 'forecast' | 'chart' | 'table' | 'explanations' | 'model_info' | 'explainability';

interface NavItemFull {
  id: ViewId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const NAV: NavItemFull[] = [
  { id: 'forecast',     label: 'Forecast',        icon: <TrendingUpIcon />,         badge: 'New' },
  { id: 'chart',        label: 'Forecast Chart',  icon: <ShowChartIcon /> },
  { id: 'table',        label: 'Forecast Table',  icon: <TableChartIcon /> },
  { id: 'explanations', label: 'Explanations',    icon: <LightbulbOutlinedIcon /> },
  { id: 'model_info',     label: 'Model Info',       icon: <ScienceIcon /> },
  { id: 'explainability', label: 'Explainability',  icon: <InsightsIcon /> },
];

// ─── Component ─────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewId>('forecast');

  // Shared forecast state lifted from ForecastForm
  const [forecastData, setForecastData] = useState<ChartDataPoint[]>([]);
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);

  // Persisted form state – survives tab switches until user explicitly clears
  const [formValues, setFormValues] = useState<TouristInput>(DEFAULT_VALUES);

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);

  // ── Sidebar content ────────────────────────────────────────────────────────

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Box
        display="flex"
        alignItems="center"
        gap={1.5}
        px={2.5}
        py={2.5}
        sx={{
          background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 60%, #42a5f5 100%)',
        }}
      >
        <Avatar
          sx={{
            bgcolor: 'rgba(255,255,255,0.2)',
            width: 38,
            height: 38,
          }}
        >
          <FlightLandIcon fontSize="small" sx={{ color: 'white' }} />
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} color="white" lineHeight={1.2}>
            TourismFX
          </Typography>
          <Typography variant="caption" color="rgba(255,255,255,0.7)">
            Forecast Dashboard
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Nav list */}
      <List sx={{ px: 1, pt: 1, flexGrow: 1 }}>
        {NAV.map((item) => {
          const isActive = activeView === item.id;
          return (
            <ListItemButton
              key={item.id}
              selected={isActive}
              onClick={() => {
                setActiveView(item.id);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                transition: 'all 0.2s',
                '&.Mui-selected': {
                  background: 'linear-gradient(90deg, rgba(25,118,210,0.14) 0%, rgba(25,118,210,0.06) 100%)',
                  borderLeft: `3px solid ${theme.palette.primary.main}`,
                },
                '&:hover': {
                  background: 'rgba(25,118,210,0.06)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive ? 'primary.main' : 'text.secondary',
                  minWidth: 36,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? 'primary.main' : 'text.primary',
                }}
              />
              {item.badge && (
                <Chip label={item.badge} size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />
              )}
            </ListItemButton>
          );
        })}
      </List>

      {/* Footer */}
      <Divider />
      <Box px={2.5} py={1.5}>
        <Typography variant="caption" color="text.disabled">
          Powered by XGBoost + FastAPI
        </Typography>
      </Box>
    </Box>
  );

  // ── Main content ───────────────────────────────────────────────────────────

  const renderContent = () => {
    switch (activeView) {
      case 'forecast':
        return (
          <ForecastForm
            formValues={formValues}
            setFormValues={setFormValues}
            onForecastComplete={(points) => {
              setForecastData(points);
            }}
            onExplanationReady={(data) => setExplanation(data)}
          />
        );
      case 'chart':
        return <HistoryChart forecastData={forecastData.length ? forecastData : undefined} />;
      case 'table':
        return <HistoryTable forecastData={forecastData.length ? forecastData : undefined} />;
      case 'explanations':
        return <ExplanationPanel explanation={explanation} />;
      case 'model_info':
        return <ModelInfo />;
      case 'explainability':
        return <Explainability />;
      default:
        return null;
    }
  };

  const activeLabel = NAV.find((n) => n.id === activeView)?.label ?? '';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />

      {/* ── AppBar (mobile only) ── */}
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          display: { md: 'none' },
          width: '100%',
          background: 'linear-gradient(90deg, #1565c0 0%, #1976d2 100%)',
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <Tooltip title="Open navigation">
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
          <FlightLandIcon sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight={700} noWrap>
            TourismFX
          </Typography>
        </Toolbar>
      </AppBar>

      {/* ── Sidebar – permanent on desktop, temporary on mobile ── */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* ── Main content area ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 2, sm: 4 },
            py: 2.5,
            mt: { xs: 7, md: 0 },
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={800} color="text.primary">
              {activeLabel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tourist Arrival Forecasting System
            </Typography>
          </Box>
          <Chip
            label="API: localhost:8000"
            size="small"
            variant="outlined"
            color="success"
            sx={{ fontSize: 11 }}
          />
        </Box>

        {/* Page content */}
        <Box
          sx={{
            flexGrow: 1,
            px: { xs: 2, sm: 4 },
            py: 4,
            maxWidth: 1280,
            width: '100%',
            mx: 'auto',
          }}
        >
          {renderContent()}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;

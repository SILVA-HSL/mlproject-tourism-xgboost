/**
 * LandingPage.tsx
 * Clean, minimal landing page — full-bleed Sri Lanka hero image
 * with a single liquid-glass "Dashboard" button.
 */

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface LandingPageProps {
  onEnterDashboard: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnterDashboard }) => {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* ── Full-bleed background image ── */}
      <Box
        component="img"
        src="/Sri-Lanka-tourism.jpg"
        alt="Sri Lanka Tourism"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          filter: 'brightness(0.72)',
        }}
      />

      {/* ── Gradient overlay ── */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.42) 55%, rgba(0,0,0,0.7) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Content ── */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          px: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {/* Eyebrow */}
        <Typography
          sx={{
            color: 'rgba(255,255,255,0.72)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          ML · Tourism Analytics
        </Typography>

        {/* Headline */}
        <Typography
          sx={{
            color: '#fff',
            fontWeight: 900,
            fontSize: { xs: '2.8rem', sm: '4rem', md: '5.2rem' },
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            textShadow: '0 4px 32px rgba(0,0,0,0.55)',
          }}
        >
          Sri Lanka
          <br />
          <Box
            component="span"
            sx={{
              background: 'linear-gradient(90deg, #7ee8fa 0%, #a8edea 50%, #fed6e3 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Tourism Forecast
          </Box>
        </Typography>

        {/* Sub-headline */}
        <Typography
          sx={{
            color: 'rgba(255,255,255,0.62)',
            fontSize: { xs: '0.95rem', md: '1.08rem' },
            maxWidth: 460,
            lineHeight: 1.7,
            mt: 0.5,
          }}
        >
          XGBoost-powered predictions &amp; SHAP explainability
          for international tourist arrivals.
        </Typography>

        {/* ── Liquid-glass CTA ── */}
        <Button
          onClick={onEnterDashboard}
          endIcon={
            <ArrowForwardIcon
              sx={{ fontSize: '1rem !important', transition: 'transform 0.3s ease' }}
            />
          }
          sx={{
            mt: 3,
            px: 5,
            py: 1.7,
            fontSize: '1rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: '#fff',
            borderRadius: '999px',
            textTransform: 'none',

            /* liquid-glass */
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(24px) saturate(200%)',
            WebkitBackdropFilter: 'blur(24px) saturate(200%)',
            border: '1px solid rgba(255,255,255,0.38)',
            boxShadow:
              '0 8px 32px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.32)',

            transition: 'all 0.28s ease',

            '&:hover': {
              background: 'rgba(255,255,255,0.22)',
              border: '1px solid rgba(255,255,255,0.58)',
              boxShadow:
                '0 14px 48px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.42)',
              transform: 'translateY(-3px)',
              '& .MuiButton-endIcon': { transform: 'translateX(5px)' },
            },
            '&:active': { transform: 'translateY(0px)' },
          }}
        >
          Go to Dashboard
        </Button>
      </Box>

      {/* ── Footer ── */}
      <Typography
        sx={{
          position: 'absolute',
          bottom: 18,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.32)',
          fontSize: '0.72rem',
          letterSpacing: '0.05em',
          zIndex: 2,
        }}
      >
        © {new Date().getFullYear()} TourismAI Sri Lanka · ML &amp; Pattern Recognition Project
      </Typography>
    </Box>
  );
};

export default LandingPage;

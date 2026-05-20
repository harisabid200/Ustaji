// UstaJi Design System — Light Theme
// Clean whites, soft grays, emerald brand accent

export const COLORS = {
  // Backgrounds
  bg: {
    primary: '#FFFFFF',       // App background — clean white
    secondary: '#F8FAFB',     // Cards, surfaces — very light gray
    tertiary: '#F1F5F9',      // Input fields, subtle areas
    elevated: '#FFFFFF',      // Modals, elevated sheets (with shadow)
  },

  // Brand
  brand: {
    primary: '#10B981',       // Emerald — UstaJi brand
    secondary: '#059669',     // Darker emerald (pressed states)
    accent: '#34D399',        // Light emerald for subtle highlights
    amber: '#F59E0B',         // AI reasoning color
    amberLight: '#FEF3C7',   // AI reasoning background
    amberBorder: '#FDE68A',  // AI reasoning border
  },

  // Chat bubbles
  bubble: {
    user: '#10B981',          // User message — emerald
    userText: '#FFFFFF',
    agent: '#F1F5F9',         // Agent message — light gray card
    agentText: '#1E293B',
    system: '#FEF3C7',        // System — soft amber
    systemText: '#92400E',
  },

  // Text
  text: {
    primary: '#1E293B',       // Main text — dark slate
    secondary: '#64748B',     // Muted text
    tertiary: '#94A3B8',      // Very muted
    inverse: '#FFFFFF',       // Text on dark/brand backgrounds
    brand: '#059669',         // Brand colored text
    link: '#2563EB',          // Links
  },

  // UI elements
  border: '#E2E8F0',
  divider: '#F1F5F9',
  input: '#F8FAFB',
  placeholder: '#94A3B8',
  overlay: 'rgba(0, 0, 0, 0.4)',

  // Semantic
  success: '#10B981',
  successBg: '#ECFDF5',
  error: '#EF4444',
  errorBg: '#FEF2F2',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  info: '#3B82F6',
  infoBg: '#EFF6FF',

  // Booking status
  status: {
    pending: '#F59E0B',
    pendingBg: '#FFFBEB',
    confirmed: '#3B82F6',
    confirmedBg: '#EFF6FF',
    in_progress: '#8B5CF6',
    in_progressBg: '#F5F3FF',
    completed: '#10B981',
    completedBg: '#ECFDF5',
    cancelled: '#EF4444',
    cancelledBg: '#FEF2F2',
  },

  // Agent trace badge colors (on light bg)
  trace: {
    nlu: '#7C3AED',           // Purple for NLU
    matching: '#2563EB',      // Blue for matching
    pricing: '#D97706',       // Amber for pricing
    scheduling: '#059669',    // Green for scheduling
    supervisor: '#DB2777',    // Pink for supervisor
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
} as const;

export const FONT = {
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
  },
  brand: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// frontend/constants/Colors.js
export const Colors = {
  primary: '#ed3237',    // Rojo Institucional UT
  secondary: '#00a859',  // Verde Institucional UT
  dark: '#1f1f1f',
  light: '#f5f5f5',
  gray: '#6c757d',
  success: '#28a745',
  warning: '#fcba0c',
  error: '#dc3545',
  info: '#007bff',
  background: '#fbfcfa',
  surface: '#ffffff',
  window: '#e6eacc'
} as const;

// Esto permite que otras partes del código sepan qué tipos de colores hay
export type AppTheme = typeof Colors;
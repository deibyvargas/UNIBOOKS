// Archivo: frontend/constants/Colors.ts

export const Colors = {
  // Colores Principales
  primary: '#003366',    // Azul UNIBOOKS (Confianza)
  secondary: '#FFF8DC',  // Amarillo Pálido / Crema (Toque de papel académico)
  
  // Fondos y Superficies
  background: '#F8F9FA', // Gris casi blanco (Descanso visual)
  surface: '#FFFFFF',    // Blanco puro (Tarjetas de libros)
  
  // Texto y Tipografía
  text: '#1A1A1A',       // Casi negro (Máxima legibilidad)
  gray: '#757575',       // Gris medio (Subtítulos)
  lightGray: '#E0E0E0',  // Bordes de inputs
  
  // Estados y Feedback
  error: '#D32F2F',      // Rojo (Borrar/Error)
  success: '#388E3C',    // Verde (Éxito al guardar)
  warning: '#FFA000',    // Ámbar (Modo edición activo)
  
  // Elementos UI Genéricos
  border: '#CED4DA',
  placeholder: '#ADB5BD',
} as const;

export type AppTheme = typeof Colors;
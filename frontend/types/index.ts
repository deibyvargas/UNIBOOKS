// Archivo: frontend/types/index.ts

// 📘 Definición de un Libro
export interface Libro {
  id: number;
  titulo: string;
  autor: string;
  precio: number;
  imagen_url: string | null;
  descripcion?: string;
  estado?: string;
  categoria?: string;
  destacado?: boolean;
  tipo_publicacion?: 'venta' | 'intercambio' | 'ambos';
  usuario_id?: number;
}

// 👤 Definición de un Usuario
export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  password?: string;
}

// 🔑 Respuesta del Login
export interface LoginResponse {
  message: string;
  usuario: string;
}
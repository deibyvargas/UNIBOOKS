export interface Libro {
  id: number;
  titulo: string;
  autor: string;
  precio: number;
  imagen_url: string | null;

  // ✅ Ya los tenías
  descripcion?: string;
  estado?: string;

  // ✅ AGREGA ESTO (CLAVE)
  categoria?: string;
  tipo_publicacion?: string;
  destacado?: boolean;
  imagenes?: string;
  usuario_id?: number;
}

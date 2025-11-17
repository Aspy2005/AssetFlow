// src/app/activos/interfaces/activo.interface.ts

/**
 * IMPORTANTE: Actualizado para reflejar la respuesta REAL de la API
 */

export interface Categoria {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  activa: boolean;
  total_activos?: number;
  valor_total?: number;
  creado_en?: string;
  actualizado_en?: string;
}

/**
 * Estados posibles de un activo
 */
export type EstadoActivo = 'AC' | 'MA' | 'DB' | 'RE';

/**
 * ⚠️ INTERFAZ CORREGIDA - Basada en la respuesta REAL de tu API
 */
export interface Activo {
  // Campos que SÍ vienen en la respuesta
  id: number;
  nombre: string;
  valor_inicial: string; // ⚠️ VIENE COMO STRING desde la API
  valor_inicial_formatted?: string;
  categoria_nombre?: string;
  estado_display?: string; // ⚠️ Este es el que viene ("Activo", "En Mantenimiento")
  fecha_adquisicion: string; // YYYY-MM-DD
  
  // Campos adicionales (del endpoint detallado o create/update)
  descripcion?: string;
  categoria?: number; // Solo viene en respuestas detalladas
  estado?: EstadoActivo; // Solo viene en respuestas detalladas
  numero_serie?: string;
  ubicacion?: string;
  responsable?: string;
  
  // Campos calculados
  edad_en_dias?: number;
  edad_en_anios?: number;
  es_valioso?: boolean;
  requiere_revision?: boolean;
  fecha_adquisicion_formatted?: string;
  
  // Timestamps
  creado_en?: string;
  actualizado_en?: string;
}

/**
 * DTO para crear/actualizar activos
 */
export interface ActivoCreateUpdate {
  nombre: string;
  descripcion?: string;
  fecha_adquisicion: string;
  valor_inicial: number;
  categoria: number;
  estado?: EstadoActivo;
  numero_serie?: string;
  ubicacion?: string;
  responsable?: string;
}

/**
 * Interfaz para filtros de búsqueda
 */
export interface FiltrosActivo {
  categoria?: number;
  estado?: EstadoActivo;
  valor_min?: number;
  valor_max?: number;
  search?: string;
  valiosos?: boolean;
  requieren_revision?: boolean;
}

/**
 * Interfaz para respuestas paginadas de la API
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Interfaz para errores de validación del backend
 */
export interface ErrorValidacion {
  [campo: string]: string | string[];
}

/**
 * Interfaz para respuestas de error del backend
 */
export interface ErrorResponse {
  error?: string;
  detail?: string;
  message?: string;
  [key: string]: any;
}
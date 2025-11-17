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

export type EstadoActivo = 'AC' | 'MA' | 'DB' | 'RE';

export interface Activo {
  id: number;
  nombre: string;
  valor_inicial: string;
  valor_inicial_formatted?: string;
  categoria_nombre?: string;
  estado_display?: string;
  fecha_adquisicion: string;

  descripcion?: string;
  categoria?: number;
  estado?: EstadoActivo;
  numero_serie?: string;
  ubicacion?: string;
  responsable?: string;

  edad_en_dias?: number;
  edad_en_anios?: number;
  es_valioso?: boolean;
  requiere_revision?: boolean;
  fecha_adquisicion_formatted?: string;

  creado_en?: string;
  actualizado_en?: string;
}

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

export interface FiltrosActivo {
  categoria?: number;
  estado?: EstadoActivo;
  valor_min?: number;
  valor_max?: number;
  search?: string;
  valiosos?: boolean;
  requieren_revision?: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ErrorValidacion {
  [campo: string]: string | string[];
}

export interface ErrorResponse {
  error?: string;
  detail?: string;
  message?: string;
  [key: string]: any;
}

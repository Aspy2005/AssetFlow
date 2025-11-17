import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap, retry } from 'rxjs/operators';
import { Activo, Categoria } from '../activos/interfaces/activo.interface';

/**
 * Interfaz para parámetros de filtrado
 */
export interface FiltrosActivo {
  categoria?: number;
  estado?: string;
  valor_min?: number;
  valor_max?: number;
  search?: string;
}

/**
 * Interfaz para respuestas paginadas
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Servicio para gestionar operaciones CRUD sobre Activos.
 * Implementa el patrón de comunicación HTTP con el Backend Django.
 */
@Injectable({
  providedIn: 'root'
})
export class ActivoService {
  // URL base (mejor usar environment variables)
  private readonly apiUrl = 'http://localhost:8000/api/v1/activos/';
  
  // Estado global de activos (opcional, útil para componentes múltiples)
  private activosSubject = new BehaviorSubject<Activo[]>([]);
  public activos$ = this.activosSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * READ: Obtiene todos los activos con filtros opcionales
   * @param filtros - Objeto con filtros opcionales
   * @returns Observable con array de activos
   */
  getActivos(filtros?: FiltrosActivo): Observable<Activo[]> {
    let params = new HttpParams();
    
    // Agregar filtros si existen
    if (filtros) {
      if (filtros.categoria) params = params.set('categoria', filtros.categoria.toString());
      if (filtros.estado) params = params.set('estado', filtros.estado);
      if (filtros.valor_min) params = params.set('valor_min', filtros.valor_min.toString());
      if (filtros.valor_max) params = params.set('valor_max', filtros.valor_max.toString());
      if (filtros.search) params = params.set('search', filtros.search);
    }

    return this.http.get<PaginatedResponse<Activo>>(this.apiUrl, { params }).pipe(
        
        // 2. USAMOS MAP PARA EXTRAER EL ARRAY 'results'
        map(response => response.results), // <-- ¡Esta es la corrección clave!

        retry(1),
        tap(activos => {
            // El log ahora mostrará el número correcto de activos
            console.log(`📦 ${activos.length} activos cargados`); 
            this.activosSubject.next(activos);
        }),
        catchError(this.handleError)
    );
}

  /**
   * READ: Obtiene un activo específico por ID
   * @param id - ID del activo
   * @returns Observable con el activo
   */
  getActivo(id: number): Observable<Activo> {
    return this.http.get<Activo>(`${this.apiUrl}${id}/`).pipe(
      tap(activo => console.log(`📄 Activo ${id} cargado: ${activo.nombre}`)),
      catchError(this.handleError)
    );
  }

  /**
   * CREATE: Crea un nuevo activo
   * @param activo - Datos del activo a crear
   * @returns Observable con el activo creado
   */
  crearActivo(activo: Partial<Activo>): Observable<Activo> {
    return this.http.post<Activo>(this.apiUrl, activo).pipe(
      tap(nuevoActivo => {
        console.log(`✅ Activo creado: ${nuevoActivo.nombre} (ID: ${nuevoActivo.id})`);
        // Actualizar lista local
        const activosActuales = this.activosSubject.value;
        this.activosSubject.next([...activosActuales, nuevoActivo]);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * UPDATE: Actualiza un activo existente (PUT completo)
   * @param id - ID del activo
   * @param activo - Datos completos del activo
   * @returns Observable con el activo actualizado
   */
  actualizarActivo(id: number, activo: Activo): Observable<Activo> {
    return this.http.put<Activo>(`${this.apiUrl}${id}/`, activo).pipe(
      tap(activoActualizado => {
        console.log(`✏️ Activo ${id} actualizado: ${activoActualizado.nombre}`);
        // Actualizar en lista local
        const activosActuales = this.activosSubject.value;
        const index = activosActuales.findIndex(a => a.id === id);
        if (index !== -1) {
          activosActuales[index] = activoActualizado;
          this.activosSubject.next([...activosActuales]);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * UPDATE: Actualización parcial (PATCH)
   * @param id - ID del activo
   * @param cambios - Campos a actualizar
   * @returns Observable con el activo actualizado
   */
  actualizarParcial(id: number, cambios: Partial<Activo>): Observable<Activo> {
    return this.http.patch<Activo>(`${this.apiUrl}${id}/`, cambios).pipe(
      tap(activoActualizado => console.log(`🔧 Activo ${id} modificado parcialmente`)),
      catchError(this.handleError)
    );
  }

  /**
   * DELETE: Elimina un activo
   * @param id - ID del activo a eliminar
   * @returns Observable vacío
   */
  eliminarActivo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`).pipe(
      tap(() => {
        console.log(`🗑️ Activo ${id} eliminado`);
        // Remover de lista local
        const activosActuales = this.activosSubject.value;
        this.activosSubject.next(activosActuales.filter(a => a.id !== id));
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Endpoint personalizado: Obtiene resumen de activos
   * @returns Observable con estadísticas
   */
  getResumen(): Observable<any> {
    return this.http.get(`${this.apiUrl}resumen/`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Manejo centralizado de errores HTTP
   * @param error - Error HTTP
   * @returns Observable con error formateado
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocurrió un error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente o de red
      errorMessage = `Error de red: ${error.error.message}`;
    } else {
      // Error del backend
      if (error.status === 0) {
        errorMessage = 'No se puede conectar con el servidor. Verifique su conexión.';
      } else if (error.status === 400) {
        // Error de validación
        errorMessage = error.error?.detail || 'Datos inválidos';
      } else if (error.status === 404) {
        errorMessage = 'Recurso no encontrado';
      } else if (error.status === 500) {
        errorMessage = 'Error interno del servidor';
      } else {
        errorMessage = `Error ${error.status}: ${error.statusText}`;
      }
    }

    console.error('❌ Error en ActivoService:', errorMessage, error);
    return throwError(() => ({ message: errorMessage, originalError: error }));
  }
}


/**
 * Servicio para gestionar Categorías
 */
@Injectable({
  providedIn: 'root'
})
export class CategoriaService {
  private readonly apiUrl = 'http://localhost:8000/api/v1/categorias/';

  constructor(private http: HttpClient) {}

  getCategorias(): Observable<Categoria[]> {
  // El tipo de respuesta se espera como PaginatedResponse
  return this.http.get<PaginatedResponse<Categoria>>(this.apiUrl).pipe(
    
    // **¡CORRECCIÓN CLAVE!** Usamos map para transformar la respuesta paginada
    map(response => response.results), 
    
    retry(1),
    tap(cats => console.log(`📁 ${cats.length} categorías cargadas`)),
    catchError(this.handleError)
  );
}

  getCategoria(id: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.apiUrl}${id}/`).pipe(
      catchError(this.handleError)
    );
  }

  crearCategoria(categoria: Partial<Categoria>): Observable<Categoria> {
    return this.http.post<Categoria>(this.apiUrl, categoria).pipe(
      tap(cat => console.log(`✅ Categoría creada: ${cat.nombre}`)),
      catchError(this.handleError)
    );
  }

  actualizarCategoria(id: number, categoria: Categoria): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.apiUrl}${id}/`, categoria).pipe(
      catchError(this.handleError)
    );
  }

  eliminarCategoria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`).pipe(
      catchError(this.handleError)
    );
  }

  getEstadisticas(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}${id}/estadisticas/`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido';
    
    if (error.status === 0) {
      errorMessage = 'No se puede conectar con el servidor';
    } else if (error.status === 400 && error.error?.detail) {
      errorMessage = error.error.detail;
    } else {
      errorMessage = error.error?.detail || `Error ${error.status}`;
    }

    console.error('❌ Error en CategoriaService:', errorMessage);
    return throwError(() => ({ message: errorMessage, originalError: error }));
  }
}
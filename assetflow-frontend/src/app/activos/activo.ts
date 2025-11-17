import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap, retry } from 'rxjs/operators';

// Importar el objeto 'environment' para acceder a 'apiUrl'
import { environment } from '../../environments/environment'; 

// Ajusta esta ruta si es necesario
import { Activo, Categoria } from '../activos/interfaces/activo.interface'; 


export interface FiltrosActivo {
  categoria?: number;
  estado?: string;
  valor_min?: number;
  valor_max?: number;
  search?: string;
}


export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}


@Injectable({
  providedIn: 'root'
})
export class ActivoService {
  // CORREGIDO: Usar la variable de entorno
  private readonly baseUrl = `${environment.apiUrl}/activos/`;
  
  private activosSubject = new BehaviorSubject<Activo[]>([]);
  public activos$ = this.activosSubject.asObservable();

  constructor(private http: HttpClient) {}


  getActivos(filtros?: FiltrosActivo): Observable<Activo[]> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.categoria) params = params.set('categoria', filtros.categoria.toString());
      if (filtros.estado) params = params.set('estado', filtros.estado);
      if (filtros.valor_min) params = params.set('valor_min', filtros.valor_min.toString());
      if (filtros.valor_max) params = params.set('valor_max', filtros.valor_max.toString());
      if (filtros.search) params = params.set('search', filtros.search);
    }

    return this.http.get<PaginatedResponse<Activo>>(this.baseUrl, { params }).pipe(
      map(response => response.results),
      retry(1),
      tap(activos => {
        console.log(`📦 ${activos.length} activos cargados`);
        this.activosSubject.next(activos);
      }),
      catchError(this.handleError)
    );
  }


  getActivo(id: number): Observable<Activo> {
    return this.http.get<Activo>(`${this.baseUrl}${id}/`).pipe(
      tap(activo => console.log(`📄 Activo ${id} cargado: ${activo.nombre}`)),
      catchError(this.handleError)
    );
  }


  crearActivo(activo: Partial<Activo>): Observable<Activo> {
    return this.http.post<Activo>(this.baseUrl, activo).pipe(
      tap(nuevoActivo => {
        console.log(`✅ Activo creado: ${nuevoActivo.nombre} (ID: ${nuevoActivo.id})`);
        const lista = this.activosSubject.value;
        this.activosSubject.next([...lista, nuevoActivo]);
      }),
      catchError(this.handleError)
    );
  }


  actualizarActivo(id: number, activo: Activo): Observable<Activo> {
    return this.http.put<Activo>(`${this.baseUrl}${id}/`, activo).pipe(
      tap(actualizado => {
        console.log(`✏️ Activo ${id} actualizado: ${actualizado.nombre}`);
        const lista = this.activosSubject.value;
        const index = lista.findIndex(a => a.id === id);
        if (index !== -1) {
          lista[index] = actualizado;
          this.activosSubject.next([...lista]);
        }
      }),
      catchError(this.handleError)
    );
  }


  actualizarParcial(id: number, cambios: Partial<Activo>): Observable<Activo> {
    return this.http.patch<Activo>(`${this.baseUrl}${id}/`, cambios).pipe(
      tap(() => console.log(`🔧 Activo ${id} modificado parcialmente`)),
      catchError(this.handleError)
    );
  }

  
  eliminarActivo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`).pipe(
      tap(() => {
        console.log(`🗑️ Activo ${id} eliminado`);
        const lista = this.activosSubject.value.filter(a => a.id !== id);
        this.activosSubject.next(lista);
      }),
      catchError(this.handleError)
    );
  }


  getResumen(): Observable<any> {
    return this.http.get(`${this.baseUrl}resumen/`).pipe(
      catchError(this.handleError)
    );
  }


  private handleError(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'Error desconocido';

    if (error.error instanceof ErrorEvent) {
      mensaje = `Error de red: ${error.error.message}`;
    } else {
      if (error.status === 0) mensaje = 'No se puede conectar con el servidor';
      else if (error.status === 400) mensaje = error.error?.detail || 'Datos inválidos';
      else if (error.status === 404) mensaje = 'Recurso no encontrado';
      else if (error.status === 500) mensaje = 'Error interno del servidor';
      else mensaje = `Error ${error.status}: ${error.statusText}`;
    }

    console.error('❌ Error en ActivoService:', mensaje, error);
    return throwError(() => ({ message: mensaje, originalError: error }));
  }
}


// --------------------------------------------------------------------------

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {

  // CORREGIDO: Usar la variable de entorno
  private readonly baseUrl = `${environment.apiUrl}/categorias/`;

  constructor(private http: HttpClient) {}


  getCategorias(): Observable<Categoria[]> {
    return this.http.get<PaginatedResponse<Categoria>>(this.baseUrl).pipe(
      map(response => response.results),
      retry(1),
      tap(cats => console.log(`📁 ${cats.length} categorías cargadas`)),
      catchError(this.handleError)
    );
  }


  getCategoria(id: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.baseUrl}${id}/`).pipe(
      catchError(this.handleError)
    );
  }


  crearCategoria(categoria: Partial<Categoria>): Observable<Categoria> {
    return this.http.post<Categoria>(this.baseUrl, categoria).pipe(
      tap(cat => console.log(`✅ Categoría creada: ${cat.nombre}`)),
      catchError(this.handleError)
    );
  }

  actualizarCategoria(id: number, categoria: Categoria): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.baseUrl}${id}/`, categoria).pipe(
      catchError(this.handleError)
    );
  }


  eliminarCategoria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`).pipe(
      catchError(this.handleError)
    );
  }


  getEstadisticas(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}${id}/estadisticas/`).pipe(
      catchError(this.handleError)
    );
  }


  private handleError(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'Error desconocido';

    if (error.status === 0) mensaje = 'No se puede conectar con el servidor';
    else if (error.status === 400 && error.error?.detail) mensaje = error.error.detail;
    else mensaje = error.error?.detail || `Error ${error.status}`;

    console.error('❌ Error en CategoriaService:', mensaje);
    return throwError(() => ({ message: mensaje, originalError: error }));
  }
}
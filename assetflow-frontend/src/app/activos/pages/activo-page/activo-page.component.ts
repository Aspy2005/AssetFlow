// src/app/activos/pages/activo-page/activo-page.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { switchMap, tap, startWith, debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

// Importaciones de tus servicios e interfaces
import { ActivoService, FiltrosActivo, CategoriaService } from '../../../activos/activo';
import { Activo, Categoria, EstadoActivo } from '../../interfaces/activo.interface';
import { ListaTablaComponent } from '../../components/lista-tabla/lista-tabla.component';
import { ActivoFormComponent } from '../../../forms/activo-form/activo-form';

@Component({
  selector: 'app-activo-page',
  templateUrl: '../activo-page/activo-page.component.html',
  styleUrls: ['../activo-page/activo-page.component.css'],
  standalone: true,
  imports: [CommonModule, ListaTablaComponent, ActivoFormComponent] 
})
export class ActivoPageComponent implements OnInit, OnDestroy {

  // --- Propiedades de Estado ---
  activos$: Observable<Activo[]>;
  categorias$: Observable<Categoria[]>;
  activosFiltrados$!: Observable<Activo[]>; 

  cargando: boolean = false;
  errorCarga: any = null;
  mensajeUsuario: string | null = null;
  tipoMensaje: 'success' | 'error' | 'info' = 'info';

  mostrarFormulario: boolean = false;
  modoEdicion: boolean = false;
  activoAEditar: Activo | null = null;

  private subs: Subscription = new Subscription();
  private filtrosSubject = new BehaviorSubject<FiltrosActivo>({});
  private activosDataSubject = new BehaviorSubject<Activo[]>([]); 
  
  // 🆕 Mapa para convertir ID de categoría a nombre
  private categoriasMap: Map<number, string> = new Map();

  // --- Constructor e Inicialización ---

  constructor(
    private activoService: ActivoService,
    private categoriaService: CategoriaService
  ) {
    this.activos$ = this.activosDataSubject.asObservable();
    this.categorias$ = this.categoriaService.getCategorias();
  }

  ngOnInit(): void {
    this.configurarFiltros();
    // 🆕 Cargar categorías PRIMERO, luego activos
    this.cargarCategorias();
    this.cargarActivos();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // --- Lógica de Carga y Filtros ---

  /**
   * 🆕 Cargar categorías y crear mapa ID → Nombre
   */
  cargarCategorias(): void {
    this.subs.add(
      this.categorias$.subscribe({
        next: (categorias) => {
          // Crear mapa: ID → Nombre
          this.categoriasMap.clear();
          categorias.forEach(cat => {
            this.categoriasMap.set(cat.id, cat.nombre);
          });
          console.log('📂 Mapa de categorías creado:', Array.from(this.categoriasMap.entries()));
        },
        error: (err) => {
          console.error('❌ Error al cargar categorías:', err);
        }
      })
    );
  }

  cargarActivos(): void {
    this.cargando = true;
    this.errorCarga = null;

    this.subs.add(
      this.activoService.getActivos().subscribe({
        next: (activos) => {
          console.log('✅ Activos cargados:', activos);
          console.log('✅ Primer activo en detalle:', activos[0]); // 🆕 Ver estructura completa
          this.activosDataSubject.next(activos);
          this.cargando = false;
        },
        error: (err) => {
          console.error('❌ Error al cargar activos:', err);
          this.errorCarga = err;
          this.cargando = false;
          this.mostrarMensaje('Error al cargar la API de Activos. Verifique la conexión al backend.', 'error');
        }
      })
    );
  }

  recargarActivos(): void {
    this.cargarActivos();
  }

  configurarFiltros(): void {
    this.activosFiltrados$ = combineLatest([
      this.activosDataSubject.asObservable(),
      this.filtrosSubject.asObservable()
    ]).pipe(
      map(([activos, filtros]: [Activo[], FiltrosActivo]) => {
        const resultado = this.aplicarFiltros(activos, filtros);
        console.log('🔍 Filtros aplicados:', filtros, 'Resultados:', resultado.length); // Debug
        return resultado;
      })
    );
  }

  /**
   * ⚠️ FUNCIÓN CORREGIDA - Adaptada a la estructura REAL de la API
   * La API devuelve:
   * - categoria_nombre (string) pero NO categoria (number) en la lista
   * - estado_display (string legible) pero NO estado (código)
   * - valor_inicial como string "34.00"
   */
  private aplicarFiltros(activos: Activo[], filtros: FiltrosActivo): Activo[] {
    return activos.filter(activo => {
        
        // 1. 🆕 Filtro por Categoría - VERSIÓN CORREGIDA
        if (filtros.categoria) {
            // Obtener el nombre de la categoría seleccionada desde el mapa
            const nombreCategoriaSeleccionada = this.categoriasMap.get(filtros.categoria);
            
            console.log('🔍 Comparando categorías:', {
              filtroID: filtros.categoria,
              nombreEsperado: nombreCategoriaSeleccionada,
              nombreActivo: activo.categoria_nombre,
              mapaDisponible: this.categoriasMap.size > 0,
              mapaCompleto: Array.from(this.categoriasMap.entries())
            });
            
            // PRIORIDAD 1: Comparar por nombre (lo más confiable)
            if (activo.categoria_nombre && nombreCategoriaSeleccionada) {
                if (activo.categoria_nombre !== nombreCategoriaSeleccionada) {
                    return false;
                }
            } 
            // PRIORIDAD 2: Si el activo tiene el campo categoria (ID), comparar directamente
            else if (activo.categoria !== undefined && activo.categoria !== null) {
                if (Number(activo.categoria) !== filtros.categoria) {
                    return false;
                }
            }
            // Si no puede comparar, excluir por seguridad
            else {
                console.warn('⚠️ No se puede comparar categoría:', {
                  activo: activo.nombre,
                  tiene_categoria_nombre: !!activo.categoria_nombre,
                  tiene_categoria_id: activo.categoria !== undefined,
                  mapa_vacio: this.categoriasMap.size === 0
                });
                return false;
            }
        }
        
        // 2. Filtro por Estado
        if (filtros.estado && activo.estado_display) {
            // Mapeo de códigos a texto legible (lo que devuelve la API)
            const estadosMap: { [key: string]: string } = {
                'AC': 'Activo',
                'MA': 'En Mantenimiento',
                'DB': 'Dado de Baja',
                'RE': 'En Reparación'
            };
            
            const estadoTextoEsperado = estadosMap[filtros.estado];
            
            // Comparar con el estado_display que viene de la API
            if (activo.estado_display !== estadoTextoEsperado) {
                return false;
            }
        }

        // 3. Filtro de Búsqueda (Search)
        if (filtros.search) {
            const search = filtros.search.toLowerCase().trim();
            
            // Campos donde buscar
            const nombre = (activo.nombre || '').toLowerCase();
            const descripcion = (activo.descripcion || '').toLowerCase();
            const serie = (activo.numero_serie || '').toLowerCase();
            const categoria = (activo.categoria_nombre || '').toLowerCase();
            
            // Buscar en todos los campos
            const encontrado = nombre.includes(search) || 
                             descripcion.includes(search) || 
                             serie.includes(search) ||
                             categoria.includes(search);
            
            if (!encontrado) {
                return false;
            }
        }

        // Si pasó todos los filtros, incluir este activo
        return true;
    });
  }

  // --- Handlers de Filtros ---

  filtrarActivos(search: string): void {
    const filtrosActuales = this.filtrosSubject.value;
    this.filtrosSubject.next({ ...filtrosActuales, search: search.trim() });
  }

  filtrarPorCategoria(id: string): void {
    const filtrosActuales = this.filtrosSubject.value;
    const categoria = id ? parseInt(id, 10) : undefined;
    console.log('📂 Filtrar por categoría:', categoria); // Debug
    this.filtrosSubject.next({ ...filtrosActuales, categoria });
  }

  filtrarPorEstado(estado: string): void {
    const filtrosActuales = this.filtrosSubject.value;
    const nuevoEstado = estado ? (estado as EstadoActivo) : undefined;
    console.log('🏷️ Filtrar por estado:', nuevoEstado); // Debug
    this.filtrosSubject.next({ ...filtrosActuales, estado: nuevoEstado });
  }

  limpiarFiltros(): void {
    console.log('🗑️ Limpiando filtros...'); // Debug
    this.filtrosSubject.next({});
  }

  // --- Lógica del CRUD (Respuestas a Eventos de la Tabla y Formulario) ---

  /**
   * Maneja la creación o actualización de un activo.
   * @param activo El objeto Activo recibido del formulario.
   */
  manejarGuardado(activo: any): void {
    const isEditing = !!activo.id;

    console.log('💾 Guardando activo:', { isEditing, activo });

    if (isEditing) {
      // ➡️ Editar
      this.activoService.actualizarActivo(activo.id!, activo).subscribe({
        next: () => {
          this.mostrarMensaje(`Activo "${activo.nombre}" actualizado correctamente.`, 'success');
          this.cerrarFormulario();
          setTimeout(() => this.cargarActivos(), 500);
        },
        error: (err) => {
          console.error('❌ Error al actualizar:', err);
          this.mostrarMensaje(`Fallo al actualizar el activo. ${err.message}`, 'error');
        }
      });
    } else {
      // ➡️ Crear
      this.activoService.crearActivo(activo).subscribe({
        next: () => {
          this.mostrarMensaje(`Activo "${activo.nombre}" creado correctamente.`, 'success');
          this.cerrarFormulario();
          setTimeout(() => this.cargarActivos(), 500);
        },
        error: (err) => {
          console.error('❌ Error al crear:', err);
          // Mostrar mensaje de error más detallado
          const errorMsg = err.error?.detail || err.error?.message || err.message || 'Error desconocido';
          this.mostrarMensaje(`Fallo al crear el activo: ${errorMsg}`, 'error');
        }
      });
    }
  }

  manejarEliminacion(id: number): void {
    if (!confirm(`¿Está seguro de eliminar el activo con ID: ${id}?`)) {
      return;
    }

    this.activoService.eliminarActivo(id).subscribe({
      next: () => {
        this.mostrarMensaje(`Activo ${id} eliminado correctamente.`, 'success');
        this.cargarActivos(); 
      },
      error: (err) => {
        console.error('❌ Error al eliminar:', err); // Debug
        this.mostrarMensaje(`Fallo al eliminar el activo. ${err.message}`, 'error');
      }
    });
  }

  manejarEdicion(activo: Activo): void {
    console.log('✏️ Editando activo:', activo); // Debug
    this.activoAEditar = activo;
    this.modoEdicion = true;
    this.abrirFormularioCreacion();
  }

  // --- Métodos de UI y Helpers ---

  abrirFormularioCreacion(): void {
    this.mostrarFormulario = true;
    if (!this.modoEdicion) {
      this.activoAEditar = null; 
    }
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.modoEdicion = false;
    this.activoAEditar = null;
  }

  mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'info'): void {
    this.mensajeUsuario = mensaje;
    this.tipoMensaje = tipo;
    setTimeout(() => this.cerrarMensaje(), 5000);
  }

  cerrarMensaje(): void {
    this.mensajeUsuario = null;
  }

  /**
   * ⚠️ FUNCIÓN CORREGIDA - valor_inicial viene como string desde la API
   * Ejemplo: "34.00" o "1000.00"
   */
  calcularValorTotal(activos: Activo[]): number {
    return activos.reduce((sum, activo) => {
      // Convertir el string a número
      const valor = parseFloat(activo.valor_inicial as any);
      return sum + (isNaN(valor) ? 0 : valor);
    }, 0);
  }

  /**
   * ⚠️ FUNCIÓN CORREGIDA - La API devuelve estado_display (texto legible)
   * no el código de estado. Necesitamos convertir de vuelta.
   * 
   * Retorna un objeto como: { AC: 1, MA: 1, DB: 0, RE: 0 }
   */
  contarPorEstado(activos: Activo[]): { [key: string]: number } {
    // Mapeo inverso: de texto legible a código
    const estadosReverseMap: { [key: string]: string } = {
      'Activo': 'AC',
      'En Mantenimiento': 'MA',
      'Dado de Baja': 'DB',
      'En Reparación': 'RE'
    };
    
    return activos.reduce((acc, activo) => {
      // Obtener el código del estado a partir del texto
      const codigoEstado = activo.estado_display 
        ? (estadosReverseMap[activo.estado_display] || 'UNKNOWN')
        : 'UNKNOWN';
      
      // Incrementar el contador para ese estado
      acc[codigoEstado] = (acc[codigoEstado] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }
}
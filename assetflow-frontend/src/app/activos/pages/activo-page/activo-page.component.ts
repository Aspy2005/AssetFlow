import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { ActivoService, FiltrosActivo, CategoriaService } from '../../../activos/activo';
import { Activo, Categoria, EstadoActivo } from '../../interfaces/activo.interface';
import { ListaTablaComponent } from '../../components/lista-tabla/lista-tabla.component';
import { ActivoFormComponent } from '../../../forms/activo-form/activo-form';

@Component({
  selector: 'app-activo-page',
  templateUrl: './activo-page.component.html',
  styleUrls: ['./activo-page.component.css'],
  standalone: true,
  imports: [CommonModule, ListaTablaComponent, ActivoFormComponent]
})
export class ActivoPageComponent implements OnInit, OnDestroy {

  activos$: Observable<Activo[]>;
  categorias$: Observable<Categoria[]>;
  activosFiltrados$!: Observable<Activo[]>;

  cargando = false;
  errorCarga: any = null;
  mensajeUsuario: string | null = null;
  tipoMensaje: 'success' | 'error' | 'info' = 'info';

  mostrarFormulario = false;
  modoEdicion = false;
  activoAEditar: Activo | null = null;
  
  mostrarDetalles = false; 
  activoAVisualizar: Activo | null = null;

  private subs = new Subscription();
  private filtrosSubject = new BehaviorSubject<FiltrosActivo>({});
  private activosDataSubject = new BehaviorSubject<Activo[]>([]);
  private categoriasMap = new Map<number, string>();

  constructor(
    private activoService: ActivoService,
    private categoriaService: CategoriaService
  ) {
    this.activos$ = this.activosDataSubject.asObservable();
    this.categorias$ = this.categoriaService.getCategorias();
  }

  ngOnInit(): void {
    this.configurarFiltros();
    this.cargarCategorias();
    this.cargarActivos();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private esActivo(item: any): item is Activo {
    return item && 
              typeof item.id === 'number' &&
              typeof item.nombre === 'string' &&
              item.valor_inicial !== undefined &&
              item.fecha_adquisicion !== undefined;
  }

  manejarVisualizacion(item: Activo | Categoria): void {
    if (!this.esActivo(item)) {
      console.error('❌ Error: El elemento visualizado no es un Activo válido.');
      this.mostrarMensaje('Error interno al visualizar el activo.', 'error');
      return;
    }
    
    console.log('👁️ Visualizando activo:', item);
    this.activoAVisualizar = item;
    this.mostrarDetalles = true;
  }

  cerrarDetalles(): void {
    this.mostrarDetalles = false;
    this.activoAVisualizar = null;
  }
  
  cargarCategorias(): void {
    this.subs.add(
      this.categorias$.subscribe({
        next: (categorias) => {
          this.categoriasMap.clear();
          categorias.forEach(cat => this.categoriasMap.set(cat.id, cat.nombre));
          console.log('📂 Mapa de categorías actualizado:', Array.from(this.categoriasMap.entries()));
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
          this.activosDataSubject.next(activos);
          this.cargando = false;
        },
        error: (err) => {
          console.error('❌ Error al cargar activos:', err);
          this.errorCarga = err;
          this.cargando = false;
          this.mostrarMensaje(
            'Error al cargar la API de Activos. Verifique la conexión al backend.',
            'error'
          );
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
      map(([activos, filtros]) => this.aplicarFiltros(activos, filtros))
    );
  }

  private aplicarFiltros(activos: Activo[], filtros: FiltrosActivo): Activo[] {
    return activos.filter(activo => {

      if (filtros.categoria) {
        const nombreFiltro = this.categoriasMap.get(filtros.categoria);

        if (activo.categoria_nombre && nombreFiltro) {
          if (activo.categoria_nombre !== nombreFiltro) return false;
        } else if (activo.categoria != null) {
          if (Number(activo.categoria) !== filtros.categoria) return false;
        } else {
          return false;
        }
      }

      if (filtros.estado && activo.estado_display) {
        const estadosMap: { [key: string]: string } = {
          AC: 'Activo',
          MA: 'En Mantenimiento',
          DB: 'Dado de Baja',
          RE: 'En Reparación'
        };

        if (activo.estado_display !== estadosMap[filtros.estado]) return false;
      }

      if (filtros.search) {
        const search = filtros.search.toLowerCase().trim();
        const campos = [
          activo.nombre,
          activo.descripcion,
          activo.numero_serie,
          activo.categoria_nombre
        ].map(x => (x || '').toLowerCase());

        if (!campos.some(c => c.includes(search))) return false;
      }

      return true;
    });
  }

  filtrarActivos(search: string): void {
    this.filtrosSubject.next({ ...this.filtrosSubject.value, search: search.trim() });
  }

  filtrarPorCategoria(id: string): void {
    this.filtrosSubject.next({
      ...this.filtrosSubject.value,
      categoria: id ? parseInt(id, 10) : undefined
    });
  }

  filtrarPorEstado(estado: string): void {
    this.filtrosSubject.next({
      ...this.filtrosSubject.value,
      estado: estado ? estado as EstadoActivo : undefined
    });
  }

  limpiarFiltros(): void {
    this.filtrosSubject.next({});
  }

  manejarGuardado(activo: any): void {
    if (!activo || !activo.nombre) {
      console.error('❌ Datos de activo inválidos:', activo);
      this.mostrarMensaje('Error: Datos de activo inválidos', 'error');
      return;
    }

    const isEditing = !!activo.id;

    console.log('💾 Guardando activo:', { isEditing, activo });

    const req$ = isEditing
      ? this.activoService.actualizarActivo(activo.id, activo)
      : this.activoService.crearActivo(activo);

    this.subs.add(
      req$.subscribe({
        next: () => {
          this.mostrarMensaje(
            `Activo "${activo.nombre}" ${isEditing ? 'actualizado' : 'creado'} correctamente.`,
            'success'
          );
          this.cerrarFormulario();
          setTimeout(() => this.cargarActivos(), 300);
        },
        error: (err) => {
          console.error('❌ Error al guardar activo:', err);
          const errorMsg = err.error?.detail || err.error?.message || err.message || 'Error desconocido';
          this.mostrarMensaje(
            `Fallo al ${isEditing ? 'actualizar' : 'crear'} el activo: ${errorMsg}`,
            'error'
          );
        }
      })
    );
  }

  manejarEliminacion(id: number): void {
    if (!confirm(`¿Está seguro de eliminar el activo con ID: ${id}?`)) return;

    this.subs.add(
      this.activoService.eliminarActivo(id).subscribe({
        next: () => {
          console.log('✅ Activo eliminado:', id);
          this.mostrarMensaje(`Activo ${id} eliminado correctamente.`, 'success');
          this.cargarActivos();
        },
        error: (err) => {
          console.error('❌ Error al eliminar activo:', err);
          const errorMsg = err.error?.detail || err.error?.message || err.message || 'Error desconocido';
          this.mostrarMensaje(`Fallo al eliminar el activo. ${errorMsg}`, 'error');
        }
      })
    );
  }

  manejarEdicion(item: Activo | Categoria): void {
    if (!this.esActivo(item)) {
      console.error('❌ El objeto recibido no es un Activo válido:', item);
      this.mostrarMensaje('Error: No se puede editar este elemento', 'error');
      return;
    }

    console.log('✏️ Editando activo:', item);
    this.activoAEditar = item as Activo;
    this.modoEdicion = true;
    this.abrirFormularioCreacion();
  }

  abrirFormularioCreacion(): void {
    this.mostrarFormulario = true;
    if (!this.modoEdicion) this.activoAEditar = null;
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

  calcularValorTotal(activos: Activo[]): number {
    return activos.reduce((sum, activo) => {
      const valor = parseFloat(activo.valor_inicial as any);
      return sum + (isNaN(valor) ? 0 : valor);
    }, 0);
  }

  contarPorEstado(activos: Activo[]): { [key: string]: number } {
    const estadosReverseMap: { [key: string]: string } = {
      'Activo': 'AC',
      'En Mantenimiento': 'MA',
      'Dado de Baja': 'DB',
      'En Reparación': 'RE'
    };

    return activos.reduce((acc, activo) => {
      const codigoEstado = activo.estado_display 
        ? (estadosReverseMap[activo.estado_display] || 'UNKNOWN')
        : 'UNKNOWN';
      
      acc[codigoEstado] = (acc[codigoEstado] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }
}
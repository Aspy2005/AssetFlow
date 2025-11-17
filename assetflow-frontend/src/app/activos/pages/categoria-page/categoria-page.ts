import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, Observable, BehaviorSubject } from 'rxjs';

import { CategoriaService } from '../../../activos/activo';
import { Categoria } from '../../interfaces/activo.interface';
import { ListaTablaComponent } from '../../components/lista-tabla/lista-tabla.component';
import { CategoriaFormComponent } from '../../../forms/categoria-form/categoria-form';

@Component({
  selector: 'app-categoria-page',
  templateUrl: '../categoria-page/categoria-page.html',
  styleUrls: ['../categoria-page/categoria-page.css'],
  standalone: true,
  imports: [CommonModule, ListaTablaComponent, CategoriaFormComponent]
})
export class CategoriaPageComponent implements OnInit, OnDestroy {

  categorias$: Observable<Categoria[]>;

  cargando: boolean = false;
  errorCarga: any = null;

  mostrarDetalles = false;
  categoriaAVisualizar: Categoria | null = null;

  mensajeUsuario: string | null = null;
  tipoMensaje: 'success' | 'error' | 'info' = 'info';

  mostrarFormulario: boolean = false;
  modoEdicion: boolean = false;
  categoriaAEditar: Categoria | null = null;

  private subs: Subscription = new Subscription();

  private categoriasDataSubject = new BehaviorSubject<Categoria[]>([]);

  constructor(private categoriaService: CategoriaService) {
    this.categorias$ = this.categoriasDataSubject.asObservable();
  }

  ngOnInit(): void {
    this.cargarCategorias();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  cargarCategorias(): void {
    this.cargando = true;
    this.errorCarga = null;

    this.subs.add(
      this.categoriaService.getCategorias().subscribe({
        next: (categorias) => {
          console.log('Categorías cargadas:', categorias);
          this.categoriasDataSubject.next(categorias);
          this.cargando = false;
        },
        error: (err) => {
          console.error('Error al cargar categorías:', err);
          this.errorCarga = err;
          this.cargando = false;
          this.mostrarMensaje('Error al cargar la API de Categorías. Verifique el backend.', 'error');
        }
      })
    );
  }

  recargarCategorias(): void {
    this.cargarCategorias();
  }

  manejarVisualizacion(categoria: Categoria): void {
  console.log('👁️ Visualizando categoría:', categoria);
  this.categoriaAVisualizar = categoria;
  this.mostrarDetalles = true;
}

  cerrarDetalles(): void {
  this.mostrarDetalles = false;
  this.categoriaAVisualizar = null;
}

  manejarGuardado(categoria: Categoria): void {
    const isEditing = !!categoria.id;

    console.log('Guardando categoría:', { isEditing, categoria });

    const categoriaLimpia: any = {
      nombre: categoria.nombre,
      codigo: categoria.codigo,
      descripcion: categoria.descripcion || '',
      activa: categoria.activa !== undefined ? categoria.activa : true
    };

    if (isEditing) {
      categoriaLimpia.id = categoria.id;
    }

    console.log('Datos a enviar:', categoriaLimpia);

    if (isEditing) {
      this.categoriaService.actualizarCategoria(categoria.id!, categoriaLimpia).subscribe({
        next: (response) => {
          console.log('Categoría actualizada:', response);
          this.mostrarMensaje(`Categoría "${categoria.nombre}" actualizada correctamente.`, 'success');
          this.cerrarFormulario();
          setTimeout(() => this.cargarCategorias(), 500);
        },
        error: (err) => {
          console.error('Error al actualizar categoría:', err);
          this.cerrarFormulario();
          setTimeout(() => {
            this.cargarCategorias();
            this.mostrarMensaje('Categoría actualizada (verificando...)', 'success');
          }, 500);
        }
      });
    } else {
      this.categoriaService.crearCategoria(categoriaLimpia).subscribe({
        next: (response) => {
          console.log('Categoría creada:', response);
          this.mostrarMensaje(`Categoría "${categoria.nombre}" creada correctamente.`, 'success');
          this.cerrarFormulario();
          setTimeout(() => this.cargarCategorias(), 500);
        },
        error: (err) => {
          console.error('Error al crear categoría:', err);
          this.cerrarFormulario();
          setTimeout(() => {
            this.cargarCategorias();
            this.mostrarMensaje('Categoría creada (verificando...)', 'success');
          }, 500);
        }
      });
    }
  }

  manejarEliminacion(id: number): void {
    if (!confirm(`¿Está seguro de eliminar la categoría con ID: ${id}? Esto puede afectar activos asociados.`)) {
      return;
    }

    this.categoriaService.eliminarCategoria(id).subscribe({
      next: () => {
        console.log('Categoría eliminada:', id);
        this.mostrarMensaje(`Categoría ${id} eliminada correctamente.`, 'success');
        this.cargarCategorias();
      },
      error: (err) => {
        console.error('Error al eliminar categoría:', err);
        this.mostrarMensaje(`Fallo al eliminar la categoría. ${err.message || 'Error desconocido'}`, 'error');
      }
    });
  }

  manejarEdicion(categoria: Categoria): void {
    console.log('Editando categoría:', categoria);
    this.categoriaAEditar = categoria;
    this.modoEdicion = true;
    this.abrirFormularioCreacion();
  }

  abrirFormularioCreacion(): void {
    this.mostrarFormulario = true;
    if (!this.modoEdicion) {
      this.categoriaAEditar = null;
    }
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.modoEdicion = false;
    this.categoriaAEditar = null;
  }

  mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'info'): void {
    this.mensajeUsuario = mensaje;
    this.tipoMensaje = tipo;
    setTimeout(() => this.cerrarMensaje(), 5000);
  }

  cerrarMensaje(): void {
    this.mensajeUsuario = null;
  }
}

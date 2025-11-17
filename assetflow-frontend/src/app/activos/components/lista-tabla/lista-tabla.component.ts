import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Activo, Categoria } from '../../interfaces/activo.interface';

@Component({
  selector: 'app-lista-tabla',
  templateUrl: './lista-tabla.component.html',
  styleUrls: ['./lista-tabla.component.css'],
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe]
})
export class ListaTablaComponent implements OnInit {

  @Input() datos: any[] = [];
  @Output() itemEliminado = new EventEmitter<number>();
  @Output() itemEditado = new EventEmitter<Activo | Categoria>();
  @Output() itemVisualizado = new EventEmitter<Activo | Categoria>();
  esActivo: boolean = true;

  ngOnInit(): void {
    this.esActivo = this.datos?.length > 0 && 'valor_inicial' in this.datos[0];
  }

  onEliminarItem(id: number): void {
    this.itemEliminado.emit(id);
  }

  onVisualizarItem(item: Activo | Categoria): void {
  this.itemVisualizado.emit(item);
}

  onEditarItem(item: Activo | Categoria): void {
    this.itemEditado.emit(item);
  }

  getEstadoClass(estado: string): string {
    const classes: Record<string, string> = {
      AC: 'badge-success',
      MA: 'badge-warning',
      DB: 'badge-danger',
      RE: 'badge-info'
    };
    return classes[estado] || 'badge-secondary';
  }

  formatearEstado(estado: string): string {
    const estados: Record<string, string> = {
      AC: 'Activo',
      MA: 'Mantenimiento',
      DB: 'Dado de Baja',
      RE: 'En Reparación'
    };
    return estados[estado] || estado;
  }
}
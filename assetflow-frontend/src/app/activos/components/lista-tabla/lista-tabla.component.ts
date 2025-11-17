// src/app/activos/components/lista-tabla/lista-tabla.component.ts

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common'; 
import { Activo, Categoria } from '../../interfaces/activo.interface';
import { DatePipe } from '@angular/common'; // Añadido DatePipe para el formato de fecha en la tabla

@Component({
  selector: 'app-lista-tabla',
  templateUrl: './lista-tabla.component.html',
  styleUrls: ['./lista-tabla.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
  ]
})
export class ListaTablaComponent implements OnInit {

  @Input() 
  // Usamos 'any[]' para aceptar Activo[] o Categoria[]
  datos: any[] = []; 

  @Output()
  itemEliminado = new EventEmitter<number>();

  @Output() 
  // Emitimos el objeto completo (Activo o Categoria)
  itemEditado = new EventEmitter<any>(); 
  
  // Propiedad para diferenciar la vista de la tabla
  esActivo: boolean = true; 

  constructor() { }

  ngOnInit(): void {
    // Determinar si los datos son Activos o Categorías
    if (this.datos && this.datos.length > 0) {
      // Si el primer elemento tiene 'valor_inicial', asumimos que es un Activo
      this.esActivo = 'valor_inicial' in this.datos[0];
    } else {
      // Si está vacío, por defecto, mostramos Activos, o puedes decidir lo contrario
      this.esActivo = true;
    }
  }

  onEliminarItem(id: number): void {
    this.itemEliminado.emit(id);
  }

  onEditarItem(item: Activo | Categoria): void {
    this.itemEditado.emit(item); 
  }

  // --- Helpers de Formato (Específicos para Activos) ---

  /**
   * Obtiene la clase CSS para el badge del estado del Activo.
   * @param estado Código de estado (AC, MA, DB, RE)
   */
  getEstadoClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'AC': 'badge-success',
      'MA': 'badge-warning',
      'DB': 'badge-danger',
      'RE': 'badge-info'
    };
    return classes[estado] || 'badge-secondary';
  }

  /**
   * Formatea el código de estado a un nombre legible.
   * @param estado Código de estado (AC, MA, DB, RE)
   */
  formatearEstado(estado: string): string {
    const estados: { [key: string]: string } = {
      'AC': 'Activo',
      'MA': 'Mantenimiento',
      'DB': 'Dado de Baja',
      'RE': 'En Reparación'
    };
    return estados[estado] || estado;
  }
}
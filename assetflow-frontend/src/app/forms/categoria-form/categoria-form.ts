import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Categoria } from '../../activos/interfaces/activo.interface';

@Component({
  selector: 'app-categoria-form',
  templateUrl: './categoria-form.html',
  styleUrls: ['./categoria-form.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class CategoriaFormComponent implements OnInit {
  
  @Input() 
  categoriaInicial: Categoria | null = null; 

  @Output() 
  categoriaGuardada = new EventEmitter<Categoria>();

  @Output() 
  cancelar = new EventEmitter<void>(); 

  public categoriaForm!: FormGroup;
  public modoEdicion: boolean = false;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.modoEdicion = !!this.categoriaInicial;
    this.initForm();

    if (this.modoEdicion && this.categoriaInicial) {
      // ⚠️ Solo cargar campos editables
      this.categoriaForm.patchValue({
        id: this.categoriaInicial.id,
        nombre: this.categoriaInicial.nombre,
        codigo: this.categoriaInicial.codigo,
        descripcion: this.categoriaInicial.descripcion || '',
        activa: this.categoriaInicial.activa
      });
    }
  }

  initForm(): void {
    this.categoriaForm = this.fb.group({
      id: [this.categoriaInicial?.id || null], 
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      codigo: ['', [Validators.required, Validators.maxLength(10)]],
      descripcion: [''],
      activa: [true]
    });
  }

  get controls() {
    return this.categoriaForm.controls;
  }

  onSubmit(): void {
    if (this.categoriaForm.invalid) {
      this.categoriaForm.markAllAsTouched();
      console.warn('⚠️ Formulario de categoría inválido:', this.categoriaForm.value);
      return;
    }

    // 🔧 Emitir solo los campos necesarios
    const categoriaData: Categoria = {
      id: this.categoriaForm.value.id || 0,
      nombre: this.categoriaForm.value.nombre.trim(),
      codigo: this.categoriaForm.value.codigo.trim().toUpperCase(),
      descripcion: this.categoriaForm.value.descripcion?.trim() || '',
      activa: this.categoriaForm.value.activa !== false // Por defecto true
    };

    console.log('📤 Emitiendo categoría desde formulario:', categoriaData);
    console.log('📤 Modo edición:', this.modoEdicion);
    this.categoriaGuardada.emit(categoriaData); 
  }

  onCancel(): void {
    this.cancelar.emit();
  }
}
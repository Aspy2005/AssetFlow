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

  @Input() categoriaInicial: Categoria | null = null;

  @Output() categoriaGuardada = new EventEmitter<Categoria>();
  @Output() cancelar = new EventEmitter<void>();

  public categoriaForm!: FormGroup;
  public modoEdicion = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.modoEdicion = !!this.categoriaInicial;
    this.initForm();

    if (this.modoEdicion && this.categoriaInicial) {
      this.cargarCategoriaEnFormulario();
    }
  }


  private initForm(): void {
    this.categoriaForm = this.fb.group({
      id: [this.categoriaInicial?.id ?? null],
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      codigo: ['', [Validators.required, Validators.maxLength(10)]],
      descripcion: [''],
      activa: [this.categoriaInicial?.activa ?? true]
    });
  }


  private cargarCategoriaEnFormulario(): void {
    this.categoriaForm.patchValue({
      id: this.categoriaInicial!.id,
      nombre: this.categoriaInicial!.nombre,
      codigo: this.categoriaInicial!.codigo,
      descripcion: this.categoriaInicial!.descripcion ?? '',
      activa: this.categoriaInicial!.activa
    });
  }


  get controls() {
    return this.categoriaForm.controls;
  }


  onSubmit(): void {
    if (this.categoriaForm.invalid) {
      this.categoriaForm.markAllAsTouched();
      console.warn('⚠️ Formulario inválido:', this.categoriaForm.value);
      return;
    }

    const form = this.categoriaForm.value;

    const categoriaData: Categoria = {
      id: form.id ?? 0,
      nombre: form.nombre.trim(),
      codigo: form.codigo.trim().toUpperCase(),
      descripcion: form.descripcion?.trim() || '',
      activa: form.activa !== false
    };

    console.log('📤 Emitiendo categoría:', categoriaData, 'Modo edición:', this.modoEdicion);
    this.categoriaGuardada.emit(categoriaData);
  }


  onCancel(): void {
    this.cancelar.emit();
  }
}

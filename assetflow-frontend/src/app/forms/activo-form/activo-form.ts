import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Activo, Categoria, EstadoActivo } from '../../activos/interfaces/activo.interface';

@Component({
  selector: 'app-activo-form',
  templateUrl: './activo-form.html',
  styleUrls: ['./activo-form.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class ActivoFormComponent implements OnInit {

  @Input() activoInicial: Activo | null = null;
  @Input() categorias: Categoria[] = [];
  @Output() activoGuardado = new EventEmitter<Activo>();
  @Output() cancelar = new EventEmitter<void>();

  public activoForm!: FormGroup;
  public modoEdicion: boolean = false;

  public estados: { value: EstadoActivo, label: string }[] = [
    { value: 'AC', label: 'Activo' },
    { value: 'MA', label: 'En Mantenimiento' },
    { value: 'DB', label: 'Dado de Baja' },
    { value: 'RE', label: 'En Reparación' },
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.modoEdicion = !!this.activoInicial;
    this.initForm();

    if (this.modoEdicion && this.activoInicial) {
      const valorInicial = typeof this.activoInicial.valor_inicial === 'string'
        ? parseFloat(this.activoInicial.valor_inicial)
        : this.activoInicial.valor_inicial;

      let fechaFormateada = this.activoInicial.fecha_adquisicion;
      if (fechaFormateada?.includes('T')) {
        fechaFormateada = fechaFormateada.split('T')[0];
      }

      this.activoForm.patchValue({
        id: this.activoInicial.id,
        nombre: this.activoInicial.nombre,
        descripcion: this.activoInicial.descripcion || '',
        categoria: this.activoInicial.categoria,
        fecha_adquisicion: fechaFormateada,
        valor_inicial: valorInicial,
        estado: this.activoInicial.estado || 'AC',
        numero_serie: this.activoInicial.numero_serie || '',
        ubicacion: this.activoInicial.ubicacion || '',
        responsable: this.activoInicial.responsable || ''
      });
    }
  }

  initForm(): void {
    this.activoForm = this.fb.group({
      id: [this.activoInicial?.id || null],
      nombre: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(150),
        this.noWhitespaceValidator
      ]],
      descripcion: ['', [Validators.maxLength(500)]],
      categoria: ['', Validators.required],
      fecha_adquisicion: [this.getTodayDate(), [
        Validators.required,
        this.fechaNoFuturaValidator
      ]],
      valor_inicial: ['', [
        Validators.required,
        Validators.min(0.01),
        Validators.max(999999999.99)
      ]],
      estado: ['AC', Validators.required],
      numero_serie: ['', [
        Validators.maxLength(100),
        this.alfanumericoValidator
      ]],
      ubicacion: ['', Validators.maxLength(200)],
      responsable: ['', [
        Validators.maxLength(100),
        this.nombreValidator
      ]]
    });
  }

  get controls() {
    return this.activoForm.controls;
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    return control.value.trim().length === 0 ? { whitespace: true } : null;
  }

  private fechaNoFuturaValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const fecha = new Date(control.value);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fecha > hoy ? { fechaFutura: true } : null;
  }

  private alfanumericoValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    return /^[a-zA-Z0-9\s\-]+$/.test(control.value) ? null : { alfanumerico: true };
  }

  private nombreValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-\.]+$/.test(control.value)
      ? null
      : { nombreInvalido: true };
  }

  mostrarError(campo: string): boolean {
    const c = this.controls[campo];
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  obtenerMensajeError(campo: string): string {
    const errors = this.controls[campo]?.errors;
    if (!errors) return '';

    if (errors['required']) return 'Este campo es obligatorio';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['min']) return `El valor mínimo es ${errors['min'].min}`;
    if (errors['max']) return `El valor máximo es ${errors['max'].max}`;
    if (errors['whitespace']) return 'No puede contener solo espacios';
    if (errors['fechaFutura']) return 'La fecha no puede ser futura';
    if (errors['alfanumerico']) return 'Solo se permiten letras, números y guiones';
    if (errors['nombreInvalido']) return 'Solo se permiten letras y espacios';

    return 'Campo inválido';
  }

  esValidoYTocado(campo: string): boolean {
    const c = this.controls[campo];
    return !!(c && c.valid && c.touched);
  }

  onSubmit(): void {
    if (this.activoForm.invalid) {
      this.activoForm.markAllAsTouched();
      return;
    }

    const activoData: any = {
      nombre: this.activoForm.value.nombre.trim(),
      descripcion: this.activoForm.value.descripcion?.trim() || '',
      categoria: parseInt(this.activoForm.value.categoria, 10),
      fecha_adquisicion: this.activoForm.value.fecha_adquisicion,
      valor_inicial: parseFloat(this.activoForm.value.valor_inicial),
      estado: this.activoForm.value.estado,
      numero_serie: this.activoForm.value.numero_serie?.trim() || '',
      ubicacion: this.activoForm.value.ubicacion?.trim() || '',
      responsable: this.activoForm.value.responsable?.trim() || ''
    };

    if (this.modoEdicion && this.activoForm.value.id) {
      activoData.id = this.activoForm.value.id;
    }

    this.activoGuardado.emit(activoData);
  }

  onCancel(): void {
    this.cancelar.emit();
  }
}

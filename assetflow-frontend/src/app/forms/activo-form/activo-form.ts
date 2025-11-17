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
  
  @Input() 
  activoInicial: Activo | null = null; 

  @Input()
  categorias: Categoria[] = [];

  @Output() 
  activoGuardado = new EventEmitter<Activo>();

  @Output() 
  cancelar = new EventEmitter<void>(); 

  public activoForm!: FormGroup;
  public modoEdicion: boolean = false;
  
  // Opciones de estado predefinidas
  public estados: { value: EstadoActivo, label: string }[] = [
    { value: 'AC', label: 'Activo' },
    { value: 'MA', label: 'En Mantenimiento' },
    { value: 'DB', label: 'Dado de Baja' },
    { value: 'RE', label: 'En Reparación' },
  ];

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.modoEdicion = !!this.activoInicial;
    this.initForm();

    if (this.modoEdicion && this.activoInicial) {
      console.log('📝 Cargando activo para edición:', this.activoInicial);
      
      const valorInicial = typeof this.activoInicial.valor_inicial === 'string' 
        ? parseFloat(this.activoInicial.valor_inicial)
        : this.activoInicial.valor_inicial;

      let fechaFormateada = this.activoInicial.fecha_adquisicion;
      if (fechaFormateada && fechaFormateada.includes('T')) {
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
      categoria: ['', [Validators.required]], 
      fecha_adquisicion: [this.getTodayDate(), [
        Validators.required,
        this.fechaNoFuturaValidator
      ]],
      valor_inicial: ['', [
        Validators.required, 
        Validators.min(0.01),
        Validators.max(999999999.99)
      ]], 
      estado: ['AC', [Validators.required]],
      numero_serie: ['', [
        Validators.maxLength(100),
        this.alfanumericoValidator
      ]],
      ubicacion: ['', [Validators.maxLength(200)]],
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
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // ============= VALIDADORES PERSONALIZADOS =============

  /**
   * Valida que el campo no contenga solo espacios en blanco
   */
  private noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const isWhitespace = (control.value || '').trim().length === 0;
    return isWhitespace ? { whitespace: true } : null;
  }

  /**
   * Valida que la fecha no sea futura
   */
  private fechaNoFuturaValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const fechaSeleccionada = new Date(control.value);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fechaSeleccionada > hoy ? { fechaFutura: true } : null;
  }

  /**
   * Valida formato alfanumérico (letras, números, guiones y espacios)
   */
  private alfanumericoValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const regex = /^[a-zA-Z0-9\s\-]+$/;
    return regex.test(control.value) ? null : { alfanumerico: true };
  }

  /**
   * Valida formato de nombre (solo letras, espacios y algunos caracteres especiales)
   */
  private nombreValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-\.]+$/;
    return regex.test(control.value) ? null : { nombreInvalido: true };
  }

  // ============= MÉTODOS AUXILIARES PARA MOSTRAR ERRORES =============

  /**
   * Retorna si un campo debe mostrar error
   */
  mostrarError(campo: string): boolean {
    const control = this.controls[campo];
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Retorna el mensaje de error específico para un campo
   */
  obtenerMensajeError(campo: string): string {
    const control = this.controls[campo];
    if (!control || !control.errors) return '';

    const errores = control.errors;

    // Errores comunes
    if (errores['required']) return 'Este campo es obligatorio';
    if (errores['minlength']) {
      return `Mínimo ${errores['minlength'].requiredLength} caracteres`;
    }
    if (errores['maxlength']) {
      return `Máximo ${errores['maxlength'].requiredLength} caracteres`;
    }
    if (errores['min']) {
      return `El valor mínimo es ${errores['min'].min}`;
    }
    if (errores['max']) {
      return `El valor máximo es ${errores['max'].max}`;
    }

    // Errores personalizados
    if (errores['whitespace']) return 'No puede contener solo espacios';
    if (errores['fechaFutura']) return 'La fecha no puede ser futura';
    if (errores['alfanumerico']) return 'Solo se permiten letras, números y guiones';
    if (errores['nombreInvalido']) return 'Solo se permiten letras y espacios';

    return 'Campo inválido';
  }

  /**
   * Marca si un campo es válido y ha sido tocado (para feedback visual positivo)
   */
  esValidoYTocado(campo: string): boolean {
    const control = this.controls[campo];
    return !!(control && control.valid && control.touched);
  }

  onSubmit(): void {
    if (this.activoForm.invalid) {
      this.activoForm.markAllAsTouched();
      console.warn('⚠️ Formulario inválido:', this.activoForm.errors);
      
      // Mostrar todos los errores en consola para debugging
      Object.keys(this.controls).forEach(key => {
        const control = this.controls[key];
        if (control.invalid) {
          console.warn(`Campo "${key}":`, control.errors);
        }
      });
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

    console.log('📤 Emitiendo activo desde formulario:', activoData);
    this.activoGuardado.emit(activoData); 
  }

  onCancel(): void {
    this.cancelar.emit();
  }
}
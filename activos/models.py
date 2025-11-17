from django.db import models
from django.core.validators import MinValueValidator, MinLengthValidator
from django.core.exceptions import ValidationError
from decimal import Decimal


class TimeStampedModel(models.Model):
    """Modelo abstracto para agregar timestamps a todas las entidades"""
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")
    actualizado_en = models.DateTimeField(auto_now=True, verbose_name="Última Actualización")

    class Meta:
        abstract = True


class Categoria(TimeStampedModel):
    """
    Categoría de activos empresariales.
    Ejemplo: Electrónica, Inmobiliario, Vehículos, etc.
    """
    nombre = models.CharField(
        max_length=100, 
        unique=True, 
        verbose_name="Nombre de la Categoría",
        help_text="Nombre descriptivo de la categoría (ej: Electrónica)",
        validators=[MinLengthValidator(3)] # <-- ¡NUEVO: Usa el validador!
    )
    codigo = models.CharField(
        max_length=10, 
        unique=True, 
        verbose_name="Código Único",
        help_text="Código corto para identificación rápida (ej: ELEC)",
        db_index=True  # MEJORA: Index explícito más claro
    )
    descripcion = models.TextField(
        blank=True,
        verbose_name="Descripción",
        help_text="Descripción opcional de la categoría"
    )
    activa = models.BooleanField(
        default=True,
        verbose_name="Activa",
        help_text="Desmarcar para desactivar la categoría sin eliminarla",
        db_index=True  # MEJORA: Index explícito
    )

    class Meta:
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"
        ordering = ['nombre']
        # MEJORA: Índices más específicos removidos (ya están con db_index)
        indexes = [
            models.Index(fields=['codigo', 'activa']),  # Índice compuesto útil
        ]
        # MEJORA: Constraints adicionales
        

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    def clean(self):
        """MEJORA: Validación a nivel de modelo"""
        super().clean()
        if self.codigo:
            self.codigo = self.codigo.upper().strip()
        if self.nombre:
            self.nombre = self.nombre.strip()

    def save(self, *args, **kwargs):
        """MEJORA: Normalización automática antes de guardar"""
        self.full_clean()  # Ejecuta validaciones
        super().save(*args, **kwargs)

    def total_activos(self):
        """Retorna el número total de activos en esta categoría"""
        return self.activos.count()

    def valor_total_activos(self):
        """Retorna el valor total de todos los activos en esta categoría"""
        return self.activos.aggregate(
            total=models.Sum('valor_inicial')
        )['total'] or Decimal('0.00')

    # MEJORA: Método para verificar si se puede eliminar
    def puede_eliminarse(self):
        """Verifica si la categoría puede eliminarse (sin activos asociados)"""
        return self.activos.count() == 0


class Activo(TimeStampedModel):
    """
    Activo empresarial: equipos, propiedades, vehículos, etc.
    """
    # Información Básica
    nombre = models.CharField(
        max_length=200, 
        verbose_name="Nombre del Activo",
        help_text="Nombre descriptivo del activo",
        db_index=True  # MEJORA: Para búsquedas frecuentes
    )
    descripcion = models.TextField(
        blank=True, 
        null=True,  # NOTA: Podrías usar solo blank=True y quitar null
        verbose_name="Descripción",
        help_text="Descripción detallada del activo"
    )
    
    # Información Financiera
    fecha_adquisicion = models.DateField(
        verbose_name="Fecha de Adquisición",
        help_text="Fecha en que se adquirió el activo",
        db_index=True  # MEJORA: Para ordenamiento y filtrado
    )
    valor_inicial = models.DecimalField(
        max_digits=12,
        decimal_places=2, 
        verbose_name="Valor Inicial",
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Valor de adquisición del activo",
        db_index=True  # MEJORA: Para filtros por rango de valor
    )
    
    # Relación con Categoría
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        related_name='activos',
        verbose_name="Categoría",
        help_text="Categoría a la que pertenece el activo"
    )
    
    # Estado del Activo
    class EstadoActivo(models.TextChoices):
        ACTIVO = 'AC', 'Activo'
        MANTENIMIENTO = 'MA', 'En Mantenimiento'
        DADO_BAJA = 'DB', 'Dado de Baja'
        EN_REPARACION = 'RE', 'En Reparación'
    
    estado = models.CharField(
        max_length=2,
        choices=EstadoActivo.choices,
        default=EstadoActivo.ACTIVO,
        verbose_name="Estado",
        help_text="Estado actual del activo",
        db_index=True  # MEJORA: Para filtrado por estado
    )
    
    # Información Adicional (Opcional)
    numero_serie = models.CharField(
        max_length=100,
        blank=True,
        null=True,  # NOTA: Considera usar solo blank=True
        unique=True,  # MEJORA: Los números de serie deben ser únicos
        verbose_name="Número de Serie",
        help_text="Número de serie o identificador único del fabricante"
    )
    ubicacion = models.CharField(
        max_length=200,
        blank=True,
        null=True,  # NOTA: Considera usar solo blank=True
        verbose_name="Ubicación",
        help_text="Ubicación física del activo"
    )
    responsable = models.CharField(
        max_length=200,
        blank=True,
        null=True,  # NOTA: Considera usar solo blank=True
        verbose_name="Responsable",
        help_text="Persona o departamento responsable del activo"
    )

    class Meta:
        verbose_name = "Activo"
        verbose_name_plural = "Activos"
        ordering = ['-fecha_adquisicion']
        # MEJORA: Índices optimizados (algunos ya están con db_index)
        indexes = [
            models.Index(fields=['categoria', 'estado']),
            models.Index(fields=['estado', 'fecha_adquisicion']),
        ]
        # MEJORA: Constraints adicionales
        constraints = [
            models.CheckConstraint(
                check=models.Q(valor_inicial__gt=0),
                name='activo_valor_positivo',
                violation_error_message='El valor inicial debe ser positivo'
            ),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.get_estado_display()})"

    def clean(self):
        """MEJORA: Validaciones a nivel de modelo"""
        super().clean()
        
        from datetime import date
        
        # Validar fecha no futura
        if self.fecha_adquisicion and self.fecha_adquisicion > date.today():
            raise ValidationError({
                'fecha_adquisicion': 'La fecha de adquisición no puede ser futura'
            })
        
        # Validar categoría activa
        if self.categoria and not self.categoria.activa:
            raise ValidationError({
                'categoria': f'La categoría "{self.categoria.nombre}" está inactiva'
            })

    @property
    def edad_en_dias(self):
        """Retorna la edad del activo en días"""
        from datetime import date
        return (date.today() - self.fecha_adquisicion).days

    @property
    def edad_en_anios(self):
        """Retorna la edad del activo en años"""
        return round(self.edad_en_dias / 365.25, 1)

    def esta_activo(self):
        """Verifica si el activo está en estado activo"""
        return self.estado == self.EstadoActivo.ACTIVO

    # MEJORA: Métodos adicionales útiles
    def es_valioso(self):
        """Verifica si el activo es de alto valor (>$5,000)"""
        return self.valor_inicial > Decimal('5000.00')

    def requiere_revision(self):
        """Verifica si el activo tiene más de 5 años"""
        return self.edad_en_anios > 5

    def dar_de_baja(self, motivo=None):
        """Método helper para dar de baja un activo"""
        self.estado = self.EstadoActivo.DADO_BAJA
        if motivo:
            self.descripcion = f"{self.descripcion or ''}\n\nMotivo de baja: {motivo}".strip()
        self.save()

    def enviar_a_mantenimiento(self):
        """Método helper para enviar a mantenimiento"""
        self.estado = self.EstadoActivo.MANTENIMIENTO
        self.save()
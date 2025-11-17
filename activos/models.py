from django.db import models
from django.core.validators import MinValueValidator, MinLengthValidator
from django.core.exceptions import ValidationError
from decimal import Decimal


class TimeStampedModel(models.Model):
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")
    actualizado_en = models.DateTimeField(auto_now=True, verbose_name="Última Actualización")

    class Meta:
        abstract = True


class Categoria(TimeStampedModel):
    nombre = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Nombre de la Categoría",
        help_text="Nombre descriptivo de la categoría",
        validators=[MinLengthValidator(3)]
    )
    codigo = models.CharField(
        max_length=10,
        unique=True,
        verbose_name="Código Único",
        help_text="Código corto para identificación rápida",
        db_index=True
    )
    descripcion = models.TextField(
        blank=True,
        verbose_name="Descripción"
    )
    activa = models.BooleanField(
        default=True,
        verbose_name="Activa",
        help_text="Desmarcar si la categoría ya no se usa",
        db_index=True
    )

    class Meta:
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"
        ordering = ['nombre']
        indexes = [
            models.Index(fields=['codigo', 'activa'])
        ]

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    def clean(self):
        super().clean()
        if self.codigo:
            self.codigo = self.codigo.upper().strip()
        if self.nombre:
            self.nombre = self.nombre.strip()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def total_activos(self):
        return self.activos.count()

    def valor_total_activos(self):
        return self.activos.aggregate(
            total=models.Sum('valor_inicial')
        )['total'] or Decimal('0.00')

    def puede_eliminarse(self):
        return self.activos.count() == 0


class Activo(TimeStampedModel):
    nombre = models.CharField(
        max_length=200,
        verbose_name="Nombre del Activo",
        help_text="Nombre descriptivo",
        db_index=True
    )
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name="Descripción"
    )
    fecha_adquisicion = models.DateField(
        verbose_name="Fecha de Adquisición",
        db_index=True
    )
    valor_inicial = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Valor Inicial",
        validators=[MinValueValidator(Decimal('0.01'))],
        db_index=True
    )
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        related_name='activos',
        verbose_name="Categoría"
    )

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
        db_index=True
    )

    numero_serie = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        unique=True,
        verbose_name="Número de Serie"
    )
    ubicacion = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Ubicación"
    )
    responsable = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Responsable"
    )

    class Meta:
        verbose_name = "Activo"
        verbose_name_plural = "Activos"
        ordering = ['-fecha_adquisicion']
        indexes = [
            models.Index(fields=['categoria', 'estado']),
            models.Index(fields=['estado', 'fecha_adquisicion'])
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(valor_inicial__gt=0),
                name='activo_valor_positivo'
            ),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.get_estado_display()})"

    def clean(self):
        super().clean()
        from datetime import date

        if self.fecha_adquisicion and self.fecha_adquisicion > date.today():
            raise ValidationError({
                'fecha_adquisicion': 'La fecha de adquisición no puede ser futura'
            })

        if self.categoria and not self.categoria.activa:
            raise ValidationError({
                'categoria': f'La categoría "{self.categoria.nombre}" está inactiva'
            })

    @property
    def edad_en_dias(self):
        from datetime import date
        return (date.today() - self.fecha_adquisicion).days

    @property
    def edad_en_anios(self):
        return round(self.edad_en_dias / 365.25, 1)

    def esta_activo(self):
        return self.estado == self.EstadoActivo.ACTIVO

    def es_valioso(self):
        return self.valor_inicial > Decimal('5000.00')

    def requiere_revision(self):
        return self.edad_en_anios > 5

    def dar_de_baja(self, motivo=None):
        self.estado = self.EstadoActivo.DADO_BAJA
        if motivo:
            self.descripcion = f"{self.descripcion or ''}\n\nMotivo de baja: {motivo}".strip()
        self.save()

    def enviar_a_mantenimiento(self):
        self.estado = self.EstadoActivo.MANTENIMIENTO
        self.save()

from rest_framework import serializers
from django.utils import timezone
from datetime import date
from decimal import Decimal
from django.db.models import Sum
from .models import Categoria, Activo


class CategoriaSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Categoria.
    Incluye campos calculados y validaciones.
    """
    total_activos = serializers.SerializerMethodField()
    valor_total = serializers.SerializerMethodField()
    
    class Meta:
        model = Categoria
        fields = [
            'id', 
            'nombre', 
            'codigo', 
            'descripcion',
            'activa',
            'total_activos',
            'valor_total',
            'creado_en',
            'actualizado_en'
        ]
        read_only_fields = ['id', 'creado_en', 'actualizado_en', 'total_activos', 'valor_total']
    
    def get_total_activos(self, obj):
        """
        Devuelve el número de activos asociados a esta categoría.
        ✅ CORREGIDO: Siempre calcula el valor, no intenta acceder a atributo anotado
        """
        return obj.activos.count()
    
    def get_valor_total(self, obj):
        """
        Devuelve el valor total de los activos en esta categoría.
        ✅ CORREGIDO: Calcula la suma directamente en lugar de llamar método inexistente
        """
        resultado = obj.activos.aggregate(total=Sum('valor_inicial'))
        return float(resultado['total'] or 0)
    
    def validate_codigo(self, value):
        """Valida que el código esté en mayúsculas y sin espacios."""
        if not value:
            raise serializers.ValidationError("El código es obligatorio")
        
        # Normalizar
        value = value.upper().strip()
        
        if ' ' in value:
            raise serializers.ValidationError(
                "El código no puede contener espacios"
            )
        
        # Validar caracteres permitidos
        if not value.isalnum():
            raise serializers.ValidationError(
                "El código solo puede contener letras y números"
            )
        
        return value
    
    def validate_nombre(self, value):
        """Valida que el nombre no esté vacío y tenga formato apropiado."""
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError(
                "El nombre debe tener al menos 3 caracteres"
            )
        
        # Capitalizar primera letra de cada palabra
        return value.strip().title()

    def validate(self, data):
        """Validaciones a nivel de objeto"""
        instance = self.instance
        
        # Si estamos actualizando y desactivando la categoría
        if instance and 'activa' in data and not data['activa']:
            activos_activos = instance.activos.exclude( 
                estado=Activo.EstadoActivo.DADO_BAJA
            ).count()
            
            if activos_activos > 0:
                raise serializers.ValidationError({
                    'activa': f'No se puede desactivar la categoría porque tiene '
                             f'{activos_activos} activo(s) en uso. '
                             f'Da de baja los activos primero.'
                })
        
        return data


class ActivoSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo Activo.
    Incluye validaciones de negocio y campos calculados.
    """
    # Campos de solo lectura (calculados)
    categoria_nombre = serializers.CharField(
        source='categoria.nombre', 
        read_only=True
    )
    categoria_codigo = serializers.CharField(
        source='categoria.codigo', 
        read_only=True
    )
    estado_display = serializers.CharField(
        source='get_estado_display', 
        read_only=True
    )
    edad_en_dias = serializers.IntegerField(read_only=True)
    edad_en_anios = serializers.FloatField(read_only=True)
    
    es_valioso = serializers.SerializerMethodField()
    requiere_revision = serializers.SerializerMethodField()
    
    class Meta:
        model = Activo
        fields = [
            'id',
            'nombre',
            'descripcion',
            'fecha_adquisicion',
            'valor_inicial',
            'categoria',
            'categoria_nombre',
            'categoria_codigo',
            'estado',
            'estado_display',
            'numero_serie',
            'ubicacion',
            'responsable',
            'edad_en_dias',
            'edad_en_anios',
            'es_valioso',
            'requiere_revision',
            'creado_en',
            'actualizado_en'
        ]
        read_only_fields = ['id', 'creado_en', 'actualizado_en']
        extra_kwargs = {
            'categoria': {
                'required': True,
                'error_messages': {
                    'required': 'Debe seleccionar una categoría',
                    'does_not_exist': 'La categoría seleccionada no existe',
                    'incorrect_type': 'ID de categoría inválido'
                }
            },
            'nombre': {
                'required': True,
                'error_messages': {
                    'required': 'El nombre del activo es obligatorio',
                    'blank': 'El nombre no puede estar vacío'
                }
            },
            'valor_inicial': {
                'required': True,
                'error_messages': {
                    'required': 'El valor inicial es obligatorio',
                    'invalid': 'Ingrese un valor numérico válido'
                }
            },
            'fecha_adquisicion': {
                'required': True,
                'error_messages': {
                    'required': 'La fecha de adquisición es obligatoria',
                    'invalid': 'Formato de fecha inválido. Use YYYY-MM-DD'
                }
            }
        }
    
    def get_es_valioso(self, obj):
        """Campo calculado usando método del modelo"""
        return obj.es_valioso()
    
    def get_requiere_revision(self, obj):
        """Campo calculado usando método del modelo"""
        return obj.requiere_revision()
    
    def validate_fecha_adquisicion(self, value):
        """Valida que la fecha de adquisición no sea futura."""
        if value > date.today():
            raise serializers.ValidationError(
                f"La fecha de adquisición no puede ser futura. "
                f"Fecha ingresada: {value}, Fecha actual: {date.today()}"
            )
        
        # Validar que no sea muy antigua (ej: más de 50 años)
        diferencia_dias = (date.today() - value).days
        if diferencia_dias > 18250:  # ~50 años
            raise serializers.ValidationError(
                f"La fecha de adquisición parece incorrecta ({value}). "
                f"¿Está seguro de que el activo tiene {diferencia_dias // 365} años?"
            )
        
        return value
    
    def validate_valor_inicial(self, value):
        """Valida que el valor inicial sea positivo y razonable."""
        if value <= 0:
            raise serializers.ValidationError(
                "El valor inicial debe ser mayor que cero"
            )
        
        # Validar valor máximo razonable (ej: $10 millones)
        if value > Decimal('10000000.00'):
            raise serializers.ValidationError(
                f"El valor inicial ({value}) parece demasiado alto. "
                f"Si es correcto, contacte al administrador."
            )
        
        return value
    
    def validate_nombre(self, value):
        """Valida que el nombre tenga un formato apropiado."""
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError(
                "El nombre debe tener al menos 3 caracteres"
            )
        
        if len(value) > 200:
            raise serializers.ValidationError(
                "El nombre no puede exceder 200 caracteres"
            )
        
        return value.strip()
    
    def validate_numero_serie(self, value):
        """Valida el formato del número de serie (si se proporciona)."""
        if value:
            value = value.strip().upper()
            
            if len(value) < 5:
                raise serializers.ValidationError(
                    "El número de serie debe tener al menos 5 caracteres"
                )
        
        return value
    
    def validate_categoria(self, value):
        """Valida que la categoría esté activa."""
        if not value.activa:
            raise serializers.ValidationError(
                f"No se pueden crear activos en la categoría '{value.nombre}' "
                f"porque está inactiva."
            )
        
        return value
    
    def validate(self, data):
        """Validaciones a nivel de objeto (múltiples campos)."""
        # Validación: Si el activo es muy valioso, debe tener número de serie
        valor = data.get('valor_inicial')
        numero_serie = data.get('numero_serie')
        
        if valor and valor > Decimal('5000.00') and not numero_serie:
            raise serializers.ValidationError({
                'numero_serie': 'Los activos con valor mayor a $5,000 deben tener número de serie'
            })
        
        # Validación: Activos dados de baja deben tener descripción
        estado = data.get('estado')
        descripcion = data.get('descripcion')
        
        if estado == Activo.EstadoActivo.DADO_BAJA and not descripcion:
            raise serializers.ValidationError({
                'descripcion': 'Los activos dados de baja deben incluir una descripción del motivo'
            })
        
        # Validar que no se pueda dar de baja un activo recién adquirido
        fecha = data.get('fecha_adquisicion', getattr(self.instance, 'fecha_adquisicion', None))
        if estado == Activo.EstadoActivo.DADO_BAJA and fecha:
            dias_desde_adquisicion = (date.today() - fecha).days
            if dias_desde_adquisicion < 7:
                raise serializers.ValidationError({
                    'estado': 'No se puede dar de baja un activo con menos de 7 días de adquisición'
                })
        
        return data
    
    def to_representation(self, instance):
        """Personaliza la representación JSON del activo."""
        representation = super().to_representation(instance)
        
        # Formatear el valor con símbolo de moneda
        if representation.get('valor_inicial'):
            representation['valor_inicial_formatted'] = f"${float(representation['valor_inicial']):,.2f}"
        
        # Formatear fecha de manera más legible
        if representation.get('fecha_adquisicion'):
            from datetime import datetime
            fecha = datetime.strptime(representation['fecha_adquisicion'], '%Y-%m-%d')
            representation['fecha_adquisicion_formatted'] = fecha.strftime('%d/%m/%Y')
        
        return representation


class ActivoCreateUpdateSerializer(ActivoSerializer):
    """
    Serializer especializado para creación/actualización.
    Oculta campos calculados que no son necesarios en el input.
    """
    class Meta(ActivoSerializer.Meta):
        fields = [
            'id',
            'nombre',
            'descripcion',
            'fecha_adquisicion',
            'valor_inicial',
            'categoria',
            'estado',
            'numero_serie',
            'ubicacion',
            'responsable'
        ]
        read_only_fields = ['id']


class ActivoListSerializer(serializers.ModelSerializer):
    """
    Serializer ligero para listados (menos datos, más rápido).
    """
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    valor_inicial_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = Activo
        fields = [
            'id',
            'nombre',
            'valor_inicial',
            'valor_inicial_formatted',
            'categoria_nombre',
            'estado_display',
            'fecha_adquisicion'
        ]
    
    def get_valor_inicial_formatted(self, obj):
        """Formatear valor para listado"""
        return f"${float(obj.valor_inicial):,.2f}"


class CategoriaConActivosSerializer(CategoriaSerializer):
    """Serializer que incluye los activos de la categoría"""
    activos = ActivoListSerializer(many=True, read_only=True) 
    
    class Meta(CategoriaSerializer.Meta):
        fields = CategoriaSerializer.Meta.fields + ['activos']
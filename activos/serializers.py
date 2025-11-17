from rest_framework import serializers
from django.utils import timezone
from datetime import date
from decimal import Decimal
from django.db.models import Sum
from .models import Categoria, Activo


class CategoriaSerializer(serializers.ModelSerializer):
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
        return obj.activos.count()
    
    def get_valor_total(self, obj):
        resultado = obj.activos.aggregate(total=Sum('valor_inicial'))
        return float(resultado['total'] or 0)
    
    def validate_codigo(self, value):
        if not value:
            raise serializers.ValidationError("El código es obligatorio")
        value = value.upper().strip()
        if ' ' in value:
            raise serializers.ValidationError("El código no puede contener espacios")
        if not value.isalnum():
            raise serializers.ValidationError("El código solo puede contener letras y números")
        return value
    
    def validate_nombre(self, value):
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError("El nombre debe tener al menos 3 caracteres")
        return value.strip().title()

    def validate(self, data):
        instance = self.instance
        if instance and 'activa' in data and not data['activa']:
            activos_activos = instance.activos.exclude(
                estado=Activo.EstadoActivo.DADO_BAJA
            ).count()
            if activos_activos > 0:
                raise serializers.ValidationError({
                    'activa': f'No se puede desactivar la categoría porque tiene {activos_activos} activo(s) en uso.'
                })
        return data


class ActivoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    categoria_codigo = serializers.CharField(source='categoria.codigo', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
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
                    'required': 'Debe seleccionar una categoría'
                }
            },
            'nombre': {
                'required': True,
                'error_messages': {
                    'required': 'El nombre del activo es obligatorio'
                }
            },
            'valor_inicial': {
                'required': True,
                'error_messages': {
                    'required': 'El valor inicial es obligatorio'
                }
            },
            'fecha_adquisicion': {
                'required': True,
                'error_messages': {
                    'required': 'La fecha de adquisición es obligatoria'
                }
            }
        }
    
    def get_es_valioso(self, obj):
        return obj.es_valioso()
    
    def get_requiere_revision(self, obj):
        return obj.requiere_revision()
    
    def validate_fecha_adquisicion(self, value):
        if value > date.today():
            raise serializers.ValidationError("La fecha de adquisición no puede ser futura")
        diferencia = (date.today() - value).days
        if diferencia > 18250:
            raise serializers.ValidationError(f"La fecha de adquisición parece incorrecta ({value})")
        return value
    
    def validate_valor_inicial(self, value):
        if value <= 0:
            raise serializers.ValidationError("El valor inicial debe ser mayor que cero")
        if value > Decimal('10000000.00'):
            raise serializers.ValidationError("El valor inicial parece demasiado alto")
        return value
    
    def validate_nombre(self, value):
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError("El nombre debe tener al menos 3 caracteres")
        if len(value) > 200:
            raise serializers.ValidationError("El nombre no puede exceder 200 caracteres")
        return value.strip()
    
    def validate_numero_serie(self, value):
        if value:
            value = value.strip().upper()
            if len(value) < 5:
                raise serializers.ValidationError("El número de serie debe tener al menos 5 caracteres")
        return value
    
    def validate_categoria(self, value):
        if not value.activa:
            raise serializers.ValidationError(
                f"No se pueden crear activos en la categoría '{value.nombre}' porque está inactiva."
            )
        return value
    
    def validate(self, data):
        valor = data.get('valor_inicial')
        serie = data.get('numero_serie')
        if valor and valor > Decimal('5000.00') and not serie:
            raise serializers.ValidationError({
                'numero_serie': 'Los activos valiosos deben tener número de serie'
            })
        
        estado = data.get('estado')
        descripcion = data.get('descripcion')
        
        if estado == Activo.EstadoActivo.DADO_BAJA and not descripcion:
            raise serializers.ValidationError({
                'descripcion': 'Debe indicar el motivo de baja'
            })
        
        fecha = data.get(
            'fecha_adquisicion',
            getattr(self.instance, 'fecha_adquisicion', None)
        )
        if estado == Activo.EstadoActivo.DADO_BAJA and fecha:
            dias = (date.today() - fecha).days
            if dias < 7:
                raise serializers.ValidationError({
                    'estado': 'No se puede dar de baja un activo con menos de 7 días'
                })
        
        return data
    
    def to_representation(self, instance):
        rep = super().to_representation(instance)
        
        if rep.get('valor_inicial'):
            rep['valor_inicial_formatted'] = f"${float(rep['valor_inicial']):,.2f}"
        
        if rep.get('fecha_adquisicion'):
            from datetime import datetime
            f = datetime.strptime(rep['fecha_adquisicion'], '%Y-%m-%d')
            rep['fecha_adquisicion_formatted'] = f.strftime('%d/%m/%Y')
        
        return rep


class ActivoCreateUpdateSerializer(ActivoSerializer):
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
        return f"${float(obj.valor_inicial):,.2f}"


class CategoriaConActivosSerializer(CategoriaSerializer):
    activos = ActivoListSerializer(many=True, read_only=True)
    
    class Meta(CategoriaSerializer.Meta):
        fields = CategoriaSerializer.Meta.fields + ['activos']

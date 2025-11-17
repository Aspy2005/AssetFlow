from django.shortcuts import render
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import ProtectedError, Sum, Count, Q, Prefetch
from django.utils import timezone
from .models import Categoria, Activo
from .serializers import (
    CategoriaSerializer, 
    ActivoSerializer, 
    ActivoListSerializer,
    ActivoCreateUpdateSerializer
)


class CategoriaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para operaciones CRUD sobre Categorías.
    """
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [AllowAny] 
    
    # Filtrado y búsqueda
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'codigo', 'descripcion']
    ordering_fields = ['nombre', 'codigo', 'creado_en', 'total_activos', 'valor_total']
    ordering = ['nombre']

    def get_queryset(self):
        """
        CRÍTICO: Anotación para calcular total_activos y valor_total en el QuerySet.
        """
        queryset = Categoria.objects.all() 
        
        # ❌ Se eliminó: queryset = queryset.prefetch_related('activos') 
        # Razón: Es innecesario cuando solo se usan las anotaciones de Count/Sum.
        
        # ✅ CRÍTICO: Anotaciones para campos calculados
        queryset = queryset.annotate(
            total_activos=Count('activos'),
            # CRÍTICO: Sumar los valores. El nombre de la anotación DEBE coincidir con el serializador.
            valor_total=Sum('activos__valor_inicial') 
        )
        
        # Filtro opcional: solo categorías activas
        solo_activas = self.request.query_params.get('activas', None)
        if solo_activas == 'true':
            queryset = queryset.filter(activa=True)
            
        return queryset
    
    def destroy(self, request, *args, **kwargs):
        """
        Elimina una categoría solo si no tiene activos asociados.
        """
        instance = self.get_object()
        
        try:
            # Verificación adicional antes de intentar eliminar
            cantidad_activos = instance.activos.count()
            
            if cantidad_activos > 0:
                return Response(
                    {
                        "error": "CATEGORIA_CON_ACTIVOS",
                        "detail": f"No se puede eliminar la categoría '{instance.nombre}' porque tiene {cantidad_activos} activo(s) asociado(s).",
                        "categoria": instance.nombre,
                        "cantidad_activos": cantidad_activos,
                        "sugerencia": "Elimine o reasigne los activos primero."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            nombre_eliminado = instance.nombre
            instance.delete()
            
            return Response(
                {
                    "success": True,
                    "detail": f"Categoría '{nombre_eliminado}' eliminada exitosamente."
                },
                status=status.HTTP_200_OK
            )
            
        except ProtectedError:
            return Response(
                {
                    "error": "PROTECTED_ERROR",
                    "detail": "No se puede eliminar la categoría porque tiene activos asociados.",
                    "error_tecnico": "ProtectedError - Violación de integridad referencial"
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # MEJORA: Logging del error
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error al eliminar categoría {instance.id}: {str(e)}")
            
            return Response(
                {
                    "error": "INTERNAL_ERROR",
                    "detail": "Error inesperado al eliminar la categoría",
                    "error_tecnico": str(e) if request.user.is_staff else None
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def estadisticas(self, request, pk=None):
        """
        Endpoint personalizado: GET /api/v1/categorias/{id}/estadisticas/
        Retorna estadísticas detalladas de la categoría.
        """
        categoria = self.get_object()
        
        # MEJORA: Optimizar queries
        activos = categoria.activos.select_related('categoria').all()
        
        estadisticas = {
            'categoria': categoria.nombre,
            'codigo': categoria.codigo,
            'total_activos': activos.count(),
            'valor_total': float(activos.aggregate(total=Sum('valor_inicial'))['total'] or 0),
            'activos_por_estado': {
                'activos': activos.filter(estado=Activo.EstadoActivo.ACTIVO).count(),
                'en_mantenimiento': activos.filter(estado=Activo.EstadoActivo.MANTENIMIENTO).count(),
                'dados_de_baja': activos.filter(estado=Activo.EstadoActivo.DADO_BAJA).count(),
                'en_reparacion': activos.filter(estado=Activo.EstadoActivo.EN_REPARACION).count(),
            },
            'activo_mas_valioso': None,
            'activo_mas_antiguo': None,
        }
        
        # Activo más valioso
        activo_valioso = activos.order_by('-valor_inicial').first()
        if activo_valioso:
            estadisticas['activo_mas_valioso'] = {
                'id': activo_valioso.id,
                'nombre': activo_valioso.nombre,
                'valor': float(activo_valioso.valor_inicial)
            }
        
        # Activo más antiguo
        activo_antiguo = activos.order_by('fecha_adquisicion').first()
        if activo_antiguo:
            # Se asume que activo_antiguo.edad_en_anios está definido en el modelo Activo
            edad_anios = getattr(activo_antiguo, 'edad_en_anios', (timezone.now().date() - activo_antiguo.fecha_adquisicion).days / 365.25 if activo_antiguo.fecha_adquisicion else 0)
            estadisticas['activo_mas_antiguo'] = {
                'id': activo_antiguo.id,
                'nombre': activo_antiguo.nombre,
                'fecha': str(activo_antiguo.fecha_adquisicion),
                'edad_anios': round(edad_anios, 2)
            }
        
        return Response(estadisticas)


# El resto de ActivoViewSet queda igual, ya que no era el foco del problema.

class ActivoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para operaciones CRUD sobre Activos.
    """
    queryset = Activo.objects.select_related('categoria').all()
    serializer_class = ActivoSerializer
    permission_classes = [AllowAny]
    
    # Filtrado y búsqueda
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion', 'numero_serie', 'ubicacion']
    ordering_fields = ['fecha_adquisicion', 'valor_inicial', 'nombre']
    ordering = ['-fecha_adquisicion']

    # MEJORA: Usar serializers diferentes según la acción
    def get_serializer_class(self):
        """Retorna el serializer apropiado según la acción"""
        if self.action == 'list':
            return ActivoListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ActivoCreateUpdateSerializer
        return ActivoSerializer

    def get_queryset(self):
        """
        MEJORA: Optimización y filtrado dinámico
        """
        queryset = super().get_queryset()
        
        # CRÍTICO: Optimizar con select_related
        queryset = queryset.select_related('categoria')
        
        # Filtro por categoría
        categoria_id = self.request.query_params.get('categoria', None)
        if categoria_id:
            queryset = queryset.filter(categoria_id=categoria_id)
        
        # Filtro por estado
        estado = self.request.query_params.get('estado', None)
        if estado:
            queryset = queryset.filter(estado=estado)
        
        # Filtro por rango de valor
        valor_min = self.request.query_params.get('valor_min', None)
        if valor_min:
            try:
                queryset = queryset.filter(valor_inicial__gte=float(valor_min))
            except ValueError:
                pass 
        
        valor_max = self.request.query_params.get('valor_max', None)
        if valor_max:
            try:
                queryset = queryset.filter(valor_inicial__lte=float(valor_max))
            except ValueError:
                pass
        
        # MEJORA: Filtro por activos valiosos
        solo_valiosos = self.request.query_params.get('valiosos', None)
        if solo_valiosos == 'true':
            queryset = queryset.filter(valor_inicial__gt=5000)
        
        # MEJORA: Filtro por activos que requieren revisión
        requieren_revision = self.request.query_params.get('requieren_revision', None)
        if requieren_revision == 'true':
            from datetime import date, timedelta
            fecha_limite = date.today() - timedelta(days=365*5)
            queryset = queryset.filter(fecha_adquisicion__lte=fecha_limite)
        
        return queryset

    def perform_create(self, serializer):
        """
        Hook que se ejecuta antes de crear un activo.
        """
        # TODO: Agregar usuario que creó el activo cuando tengas autenticación
        # serializer.save(creado_por=self.request.user)
        
        # MEJORA: Logging de creación
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Creando nuevo activo: {serializer.validated_data.get('nombre')}")
        
        serializer.save()

    def perform_update(self, serializer):
        """Hook que se ejecuta antes de actualizar un activo."""
        # TODO: Agregar usuario que modificó el activo
        # serializer.save(modificado_por=self.request.user)
        
        # MEJORA: Logging de actualización
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Actualizando activo ID {self.get_object().id}")
        
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Elimina un activo con mensaje de confirmación."""
        instance = self.get_object()
        nombre_activo = instance.nombre
        
        try:
            instance.delete()
            return Response(
                {
                    "success": True,
                    "detail": f"Activo '{nombre_activo}' eliminado exitosamente."
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error al eliminar activo {instance.id}: {str(e)}")
            
            return Response(
                {
                    "error": "DELETE_ERROR",
                    "detail": "Error al eliminar el activo",
                    "error_tecnico": str(e) if request.user.is_staff else None
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """
        Endpoint personalizado: GET /api/v1/activos/resumen/
        Retorna un resumen general de todos los activos.
        """
        activos = self.get_queryset()
        
        # MEJORA: Usar aggregate para optimizar
        totales = activos.aggregate(
            total_activos=Count('id'),
            valor_total=Sum('valor_inicial')
        )
        
        resumen = {
            'total_activos': totales['total_activos'],
            'valor_total': float(totales['valor_total'] or 0),
            'por_categoria': [],
            'por_estado': {
                'activos': activos.filter(estado=Activo.EstadoActivo.ACTIVO).count(),
                'en_mantenimiento': activos.filter(estado=Activo.EstadoActivo.MANTENIMIENTO).count(),
                'dados_de_baja': activos.filter(estado=Activo.EstadoActivo.DADO_BAJA).count(),
                'en_reparacion': activos.filter(estado=Activo.EstadoActivo.EN_REPARACION).count(),
            },
            'rangos_de_valor': {
                'menos_1000': activos.filter(valor_inicial__lt=1000).count(),
                'entre_1000_y_10000': activos.filter(
                    valor_inicial__gte=1000, 
                    valor_inicial__lt=10000
                ).count(),
                'mas_de_10000': activos.filter(valor_inicial__gte=10000).count(),
            }
        }
        
        # Resumen por categoría
        categorias = Categoria.objects.annotate(
            cantidad=Count('activos'),
            valor=Sum('activos__valor_inicial')
        ).filter(cantidad__gt=0)
        
        resumen['por_categoria'] = [
            {
                'id': cat.id,
                'nombre': cat.nombre,
                'cantidad': cat.cantidad,
                'valor_total': float(cat.valor or 0)
            }
            for cat in categorias
        ]
        
        return Response(resumen)

    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """
        Endpoint personalizado: POST /api/v1/activos/{id}/cambiar_estado/
        Body: {"estado": "MA", "motivo": "Mantenimiento preventivo"}
        """
        activo = self.get_object()
        nuevo_estado = request.data.get('estado')
        motivo = request.data.get('motivo', None)
        
        if not nuevo_estado:
            return Response(
                {
                    "error": "MISSING_PARAMETER",
                    "detail": "Debe proporcionar el campo 'estado'"
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar que el estado es válido
        estados_validos = dict(Activo.EstadoActivo.choices)
        if nuevo_estado not in estados_validos:
            return Response(
                {
                    "error": "INVALID_STATE",
                    "detail": f"Estado inválido. Opciones válidas: {list(estados_validos.keys())}",
                    "estado_recibido": nuevo_estado,
                    "estados_disponibles": [
                        {"codigo": k, "nombre": v} 
                        for k, v in estados_validos.items()
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # MEJORA: Agregar motivo a la descripción si se proporciona
        estado_anterior = activo.get_estado_display()
        activo.estado = nuevo_estado
        
        if motivo and nuevo_estado in [Activo.EstadoActivo.DADO_BAJA, Activo.EstadoActivo.MANTENIMIENTO]:
            activo.descripcion = f"{activo.descripcion or ''}\n\n[{timezone.now().strftime('%Y-%m-%d %H:%M')}] Cambio de estado: {estado_anterior} → {activo.get_estado_display()}\nMotivo: {motivo}".strip()
        
        activo.save()
        
        serializer = self.get_serializer(activo)
        return Response({
            "success": True,
            "detail": f"Estado actualizado de '{estado_anterior}' a '{activo.get_estado_display()}'",
            "activo": serializer.data
        })

    # MEJORA: Endpoint adicional para dar de baja múltiples activos
    @action(detail=False, methods=['post'])
    def dar_de_baja_masiva(self, request):
        """
        POST /api/v1/activos/dar_de_baja_masiva/
        Body: {"ids": [1, 2, 3], "motivo": "Obsolescencia"}
        """
        ids = request.data.get('ids', [])
        motivo = request.data.get('motivo', 'Sin motivo especificado')
        
        if not ids or not isinstance(ids, list):
            return Response(
                {
                    "error": "INVALID_PARAMETER",
                    "detail": "Debe proporcionar una lista de IDs en el campo 'ids'"
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        activos = Activo.objects.filter(id__in=ids)
        cantidad_actualizada = activos.update(
            estado=Activo.EstadoActivo.DADO_BAJA
        )
        
        return Response({
            "success": True,
            "detail": f"{cantidad_actualizada} activo(s) dado(s) de baja",
            "ids_procesados": ids,
            "motivo": motivo
        })
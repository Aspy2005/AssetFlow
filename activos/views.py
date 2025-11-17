from django.shortcuts import render
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import ProtectedError, Sum, Count, Q
from django.utils import timezone
from .models import Categoria, Activo
from .serializers import (
    CategoriaSerializer, 
    ActivoSerializer, 
    ActivoListSerializer,
    ActivoCreateUpdateSerializer
)


# ======================================================================
#                           CATEGORIA VIEWSET
# ======================================================================
class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [AllowAny]

    # Búsqueda y orden
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'codigo', 'descripcion']
    ordering_fields = ['nombre', 'codigo', 'creado_en', 'total_activos', 'valor_total']
    ordering = ['nombre']

    def get_queryset(self):
        """
        Qs principal con anotaciones para total_activos y valor_total.
        """
        qs = Categoria.objects.annotate(
            total_activos=Count('activos'),
            valor_total=Sum('activos__valor_inicial')
        )

        if self.request.query_params.get('activas') == 'true':
            qs = qs.filter(activa=True)

        return qs

    def destroy(self, request, *args, **kwargs):
        """
        Elimina una categoría solo si no tiene activos asociados.
        """
        instance = self.get_object()
        cantidad_activos = instance.activos.count()

        if cantidad_activos > 0:
            return Response(
                {
                    "error": "CATEGORIA_CON_ACTIVOS",
                    "detail": f"No se puede eliminar la categoría '{instance.nombre}' "
                              f"porque tiene {cantidad_activos} activo(s) asociado(s).",
                    "sugerencia": "Elimine o reasigne los activos primero."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            nombre = instance.nombre
            instance.delete()
            return Response(
                {"success": True, "detail": f"Categoría '{nombre}' eliminada exitosamente."},
                status=status.HTTP_200_OK
            )
        except ProtectedError:
            return Response(
                {"error": "PROTECTED_ERROR",
                 "detail": "No se puede eliminar porque tiene activos protegidos."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": "INTERNAL_ERROR", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def estadisticas(self, request, pk=None):
        """
        GET /categorias/{id}/estadisticas/
        """
        categoria = self.get_object()
        activos = categoria.activos.all()

        estadisticas = {
            "categoria": categoria.nombre,
            "codigo": categoria.codigo,
            "total_activos": activos.count(),
            "valor_total": float(activos.aggregate(total=Sum('valor_inicial'))['total'] or 0),
            "activos_por_estado": {
                "activos": activos.filter(estado=Activo.EstadoActivo.ACTIVO).count(),
                "en_mantenimiento": activos.filter(estado=Activo.EstadoActivo.MANTENIMIENTO).count(),
                "dados_de_baja": activos.filter(estado=Activo.EstadoActivo.DADO_BAJA).count(),
                "en_reparacion": activos.filter(estado=Activo.EstadoActivo.EN_REPARACION).count(),
            },
            "activo_mas_valioso": None,
            "activo_mas_antiguo": None,
        }

        # Activo más valioso
        valioso = activos.order_by('-valor_inicial').first()
        if valioso:
            estadisticas['activo_mas_valioso'] = {
                'id': valioso.id,
                'nombre': valioso.nombre,
                'valor': float(valioso.valor_inicial)
            }

        # Activo más antiguo
        antiguo = activos.order_by('fecha_adquisicion').first()
        if antiguo:
            edad = (
                (timezone.now().date() - antiguo.fecha_adquisicion).days / 365.25
                if antiguo.fecha_adquisicion else 0
            )
            estadisticas['activo_mas_antiguo'] = {
                'id': antiguo.id,
                'nombre': antiguo.nombre,
                'fecha': str(antiguo.fecha_adquisicion),
                'edad_anios': round(edad, 2)
            }

        return Response(estadisticas)


# ======================================================================
#                             ACTIVO VIEWSET
# ======================================================================
class ActivoViewSet(viewsets.ModelViewSet):
    queryset = Activo.objects.select_related('categoria').all()
    serializer_class = ActivoSerializer
    permission_classes = [AllowAny]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion', 'numero_serie', 'ubicacion']
    ordering_fields = ['fecha_adquisicion', 'valor_inicial', 'nombre']
    ordering = ['-fecha_adquisicion']

    def get_serializer_class(self):
        if self.action == 'list':
            return ActivoListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return ActivoCreateUpdateSerializer
        return ActivoSerializer

    def get_queryset(self):
        qs = super().get_queryset().select_related('categoria')

        params = self.request.query_params

        if 'categoria' in params:
            qs = qs.filter(categoria_id=params['categoria'])

        if 'estado' in params:
            qs = qs.filter(estado=params['estado'])

        if 'valor_min' in params:
            try:
                qs = qs.filter(valor_inicial__gte=float(params['valor_min']))
            except ValueError:
                pass

        if 'valor_max' in params:
            try:
                qs = qs.filter(valor_inicial__lte=float(params['valor_max']))
            except ValueError:
                pass

        if params.get('valiosos') == 'true':
            qs = qs.filter(valor_inicial__gt=5000)

        if params.get('requieren_revision') == 'true':
            from datetime import date, timedelta
            limite = date.today() - timedelta(days=365 * 5)
            qs = qs.filter(fecha_adquisicion__lte=limite)

        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        nombre = instance.nombre

        try:
            instance.delete()
            return Response(
                {"success": True, "detail": f"Activo '{nombre}' eliminado exitosamente."},
                status=200
            )
        except Exception as e:
            return Response(
                {"error": "DELETE_ERROR", "detail": str(e)},
                status=500
            )

    # ---------------------- ENDPOINT RESUMEN ---------------------------
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        activos = self.get_queryset()

        totales = activos.aggregate(
            total_activos=Count('id'),
            valor_total=Sum('valor_inicial')
        )

        resumen = {
            "total_activos": totales['total_activos'],
            "valor_total": float(totales['valor_total'] or 0),
            "por_estado": {
                "activos": activos.filter(estado=Activo.EstadoActivo.ACTIVO).count(),
                "en_mantenimiento": activos.filter(estado=Activo.EstadoActivo.MANTENIMIENTO).count(),
                "dados_de_baja": activos.filter(estado=Activo.EstadoActivo.DADO_BAJA).count(),
                "en_reparacion": activos.filter(estado=Activo.EstadoActivo.EN_REPARACION).count(),
            },
            "rangos_de_valor": {
                "menos_1000": activos.filter(valor_inicial__lt=1000).count(),
                "entre_1000_y_10000": activos.filter(valor_inicial__gte=1000, valor_inicial__lt=10000).count(),
                "mas_de_10000": activos.filter(valor_inicial__gte=10000).count(),
            },
            "por_categoria": []
        }

        categorias = Categoria.objects.annotate(
            cantidad=Count('activos'),
            valor=Sum('activos__valor_inicial')
        ).filter(cantidad__gt=0)

        resumen['por_categoria'] = [
            {
                "id": c.id,
                "nombre": c.nombre,
                "cantidad": c.cantidad,
                "valor_total": float(c.valor or 0)
            }
            for c in categorias
        ]

        return Response(resumen)

    # ----------------- CAMBIO DE ESTADO ------------------------------
    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        activo = self.get_object()
        nuevo_estado = request.data.get('estado')
        motivo = request.data.get('motivo')

        # Validar entrada
        estados_validos = dict(Activo.EstadoActivo.choices)

        if not nuevo_estado:
            return Response({"error": "MISSING_PARAMETER", "detail": "Debe enviar 'estado'."}, status=400)

        if nuevo_estado not in estados_validos:
            return Response(
                {
                    "error": "INVALID_STATE",
                    "detail": "Estado no válido.",
                    "estados_validos": estados_validos
                },
                status=400
            )

        anterior = activo.get_estado_display()
        activo.estado = nuevo_estado

        if motivo and nuevo_estado in [Activo.EstadoActivo.DADO_BAJA, Activo.EstadoActivo.MANTENIMIENTO]:
            activo.descripcion = (
                f"{activo.descripcion or ''}\n\n"
                f"[{timezone.now()}] Cambio: {anterior} → {activo.get_estado_display()}\n"
                f"Motivo: {motivo}"
            ).strip()

        activo.save()

        return Response({
            "success": True,
            "detalle": f"Estado cambiado de {anterior} a {activo.get_estado_display()}",
            "activo": ActivoSerializer(activo).data
        })

    # ----------------- BAJA MASIVA -----------------------------------
    @action(detail=False, methods=['post'])
    def dar_de_baja_masiva(self, request):
        ids = request.data.get('ids')
        motivo = request.data.get('motivo', 'Sin motivo especificado')

        if not ids or not isinstance(ids, list):
            return Response({"error": "INVALID_PARAMETER", "detail": "Debe enviar una lista en 'ids'."}, status=400)

        cantidad = Activo.objects.filter(id__in=ids).update(
            estado=Activo.EstadoActivo.DADO_BAJA
        )

        return Response({
            "success": True,
            "detail": f"{cantidad} activo(s) dado(s) de baja.",
            "motivo": motivo,
            "ids": ids
        })

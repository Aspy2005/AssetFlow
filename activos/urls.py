from rest_framework.routers import DefaultRouter
from .views import ActivoViewSet, CategoriaViewSet

router = DefaultRouter()

router.register(r'activos', ActivoViewSet) 
router.register(r'categorias', CategoriaViewSet) 

urlpatterns = router.urls
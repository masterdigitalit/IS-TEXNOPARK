# files/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StorageFileViewSet, FileShareLinkViewSet,
    download_shared_file, preview_shared_file,
)

router = DefaultRouter()
router.register(r'files', StorageFileViewSet, basename='files')
router.register(r'share-links', FileShareLinkViewSet, basename='share-links')

urlpatterns = [
    path('', include(router.urls)),
    path('share/<str:token>/download/', download_shared_file, name='download-shared-file'),
    path('share/<str:token>/preview/', preview_shared_file, name='preview-shared-file'),
    
    # Если нужен endpoint для файлов события - используем action в StorageFileViewSet
    # Дополнительные endpoints не требуются
]
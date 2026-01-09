
from rest_framework import permissions
from .models import StorageFile


class IsOwnerOrPublic(permissions.BasePermission):
    """Разрешение на доступ к файлу владельцу или если файл публичный"""
    
    def has_object_permission(self, request, view, obj):
        # Разрешаем GET запросы всем для публичных файлов
        if request.method in permissions.SAFE_METHODS:
            return obj.is_public or obj.uploaded_by == request.user
        
        # Для остальных методов - только владельцу
        return obj.uploaded_by == request.user


class IsFileOwner(permissions.BasePermission):
    """Разрешение только для владельца файла"""
    
    def has_object_permission(self, request, view, obj):
        return obj.uploaded_by == request.user
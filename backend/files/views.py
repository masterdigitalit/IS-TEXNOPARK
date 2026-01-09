
from rest_framework import viewsets, permissions, status, generics, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, FileResponse
from django.core.files.storage import default_storage
import mimetypes
import os

from .models import StorageFile, FileShareLink
from .serializers import (
    StorageFileSerializer, FileUploadSerializer,
    FileShareLinkSerializer, FileSearchSerializer
)
from .permissions import IsOwnerOrPublic, IsFileOwner


class StorageFileViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с файлами"""
    queryset = StorageFile.objects.all()
    serializer_class = StorageFileSerializer
    parser_classes = (MultiPartParser, FormParser)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_public', 'uploaded_by']
    search_fields = ['name', 'original_name', 'description']
    ordering_fields = ['created_at', 'updated_at', 'file_size', 'name']
    ordering = ['-created_at']
    
    def get_permissions(self):
        """Разные права для разных действий"""
        if self.action in ['list', 'retrieve']:
            # Для просмотра списка и деталей - доступно всем
            permission_classes = [permissions.AllowAny]
        elif self.action in ['create', 'upload_multiple']:
            # Для загрузки - только аутентифицированным
            permission_classes = [permissions.IsAuthenticated]
        else:
            # Для остальных действий - только владельцу
            permission_classes = [IsOwnerOrPublic]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Фильтрация файлов"""
        queryset = super().get_queryset()
        
        # Для неавторизованных пользователей показываем только публичные файлы
        if not self.request.user.is_authenticated:
            queryset = queryset.filter(is_public=True)
        
        # Для авторизованных показываем их файлы + публичные
        elif not self.request.user.is_staff:
            queryset = queryset.filter(
                models.Q(is_public=True) | 
                models.Q(uploaded_by=self.request.user)
            )
        
        # Админы видят всё
        
        return queryset
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser])
    def upload(self, request):
        """Загрузка одного файла"""
        serializer = FileUploadSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            storage_file = serializer.save()
            return Response(
                StorageFileSerializer(storage_file, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser])
    def upload_multiple(self, request):
        """Загрузка нескольких файлов"""
        files = request.FILES.getlist('files')
        uploaded_files = []
        
        for file in files:
            serializer = FileUploadSerializer(data={
                'file': file,
                'name': request.data.get('name') or file.name,
                'category': request.data.get('category'),
                'description': request.data.get('description', ''),
                'is_public': request.data.get('is_public', True)
            }, context={'request': request})
            
            if serializer.is_valid():
                storage_file = serializer.save()
                uploaded_files.append(storage_file)
            else:
                return Response(
                    {'error': f'Ошибка загрузки файла {file.name}: {serializer.errors}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(
            StorageFileSerializer(uploaded_files, many=True, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def download(self, request, pk=None):
        """Скачивание файла"""
        storage_file = self.get_object()
        
        # Увеличиваем счетчик скачиваний
        storage_file.download_count += 1
        storage_file.save()
        
        # Возвращаем файл для скачивания
        response = FileResponse(
            storage_file.file.open('rb'),
            content_type=storage_file.mime_type or 'application/octet-stream'
        )
        response['Content-Disposition'] = f'attachment; filename="{storage_file.original_name}"'
        response['Content-Length'] = storage_file.file_size
        
        return response
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Поиск файлов"""
        serializer = FileSearchSerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        queryset = self.get_queryset()
        
        # Применяем фильтры
        if data.get('query'):
            queryset = queryset.filter(
                models.Q(name__icontains=data['query']) |
                models.Q(description__icontains=data['query']) |
                models.Q(original_name__icontains=data['query'])
            )
        
        if data.get('category'):
            queryset = queryset.filter(category=data['category'])
        
        if data.get('start_date'):
            queryset = queryset.filter(created_at__date__gte=data['start_date'])
        
        if data.get('end_date'):
            queryset = queryset.filter(created_at__date__lte=data['end_date'])
        
        if data.get('uploaded_by'):
            queryset = queryset.filter(uploaded_by=data['uploaded_by'])
        
        if data.get('is_public') is not None:
            queryset = queryset.filter(is_public=data['is_public'])
        
        # Пагинация
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def share_links(self, request, pk=None):
        """Получить ссылки для доступа к файлу"""
        storage_file = self.get_object()
        if not IsOwnerOrPublic().has_object_permission(request, self, storage_file):
            return Response(
                {'error': 'У вас нет прав на просмотр ссылок'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        share_links = storage_file.share_links.filter(created_by=request.user)
        serializer = FileShareLinkSerializer(
            share_links, many=True, context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def create_share_link(self, request, pk=None):
        """Создать ссылку для доступа"""
        storage_file = self.get_object()
        
        serializer = FileShareLinkSerializer(
            data=request.data, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(file=storage_file)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Статистика по файлу"""
        storage_file = self.get_object()
        
        stats = {
            'file_name': storage_file.name,
            'file_size': storage_file.file_size_display,
            'upload_date': storage_file.created_at,
            'download_count': storage_file.download_count,
            'mime_type': storage_file.mime_type,
            'category': storage_file.get_category_display(),
            'is_public': storage_file.is_public,
            'share_links_count': storage_file.share_links.count(),
            'active_share_links': storage_file.share_links.filter(is_active=True).count()
        }
        
        return Response(stats)


class FileShareLinkViewSet(viewsets.ModelViewSet):
    """ViewSet для управления ссылками доступа"""
    queryset = FileShareLink.objects.all()
    serializer_class = FileShareLinkSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'token'
    
    def get_queryset(self):
        """Показывать только свои ссылки"""
        return self.queryset.filter(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def disable(self, request, token=None):
        """Отключить ссылку"""
        share_link = self.get_object()
        share_link.is_active = False
        share_link.save()
        return Response({'status': 'Ссылка отключена'})
    
    @action(detail=True, methods=['post'])
    def enable(self, request, token=None):
        """Включить ссылку"""
        share_link = self.get_object()
        share_link.is_active = True
        share_link.save()
        return Response({'status': 'Ссылка включена'})


# Публичные эндпоинты
@api_view(['GET'])
@permission_classes([AllowAny])
def download_shared_file(request, token):
    """Скачать файл по публичной ссылке"""
    share_link = get_object_or_404(FileShareLink, token=token)
    
    # Проверяем валидность ссылки
    if not share_link.is_valid:
        return Response(
            {'error': 'Ссылка недействительна или истек срок действия'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Увеличиваем счетчик скачиваний
    share_link.download_count += 1
    share_link.save()
    
    storage_file = share_link.file
    
    # Возвращаем файл для скачивания
    response = FileResponse(
        storage_file.file.open('rb'),
        content_type=storage_file.mime_type or 'application/octet-stream'
    )
    response['Content-Disposition'] = f'attachment; filename="{storage_file.original_name}"'
    response['Content-Length'] = storage_file.file_size
    
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
def preview_shared_file(request, token):
    """Предпросмотр файла по публичной ссылке"""
    share_link = get_object_or_404(FileShareLink, token=token)
    
    if not share_link.is_valid:
        return Response(
            {'error': 'Ссылка недействительна или истек срок действия'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    storage_file = share_link.file
    
    # Проверяем, можно ли предпросматривать этот тип файла
    previewable_types = [
        'image/', 'text/', 'application/pdf',
        'application/json', 'application/xml'
    ]
    
    if not any(storage_file.mime_type.startswith(t) for t in previewable_types):
        return Response(
            {'error': 'Предпросмотр недоступен для этого типа файла'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Возвращаем файл для предпросмотра
    response = HttpResponse(
        storage_file.file.open('rb').read(),
        content_type=storage_file.mime_type
    )
    response['Content-Disposition'] = f'inline; filename="{storage_file.original_name}"'
    
    return response

# Create your views here.

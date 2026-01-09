# user/views.py
from rest_framework.viewsets import ModelViewSet
from rest_framework import permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import (
    UserSerializer, 
    UserRegistrationSerializer,
    UserLoginSerializer,
    ChangePasswordSerializer
)

User = get_user_model()


class UserViewSet(ModelViewSet):
    queryset = User.objects.all().order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserRegistrationSerializer
        elif self.action == 'login':
            return UserLoginSerializer
        elif self.action == 'change_password':
            return ChangePasswordSerializer
        return UserSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'login']:
            permission_classes = [permissions.AllowAny]
        elif self.action in ['update', 'partial_update', 'change_password', 'me', 'logout', 'update_profile']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def create(self, request, *args, **kwargs):
        """
        Регистрация нового пользователя
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Создаем пользователя
        user = serializer.save()
        
        # Создаем JWT токены
        refresh = RefreshToken.for_user(user)
        
        # Сериализуем данные пользователя
        user_data = UserSerializer(user).data
        
        # Возвращаем токены и данные пользователя
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': user_data,
            'message': 'Регистрация успешно завершена'
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny], url_path='login')
    def login(self, request):
        """
        Кастомный login endpoint с возвратом JWT токенов
        """
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """
        Получить информацию о текущем пользователе
        """
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        """
        Logout - добавление refresh токена в blacklist
        """
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Успешный выход из системы."})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def change_password(self, request):
        """
        Изменение пароля
        """
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']
        
        # Проверяем старый пароль
        if not user.check_password(old_password):
            return Response(
                {'old_password': ['Неверный текущий пароль.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Меняем пароль
        user.set_password(new_password)
        user.save()
        
        return Response({'message': 'Пароль успешно изменен.'})
    
    @action(detail=False, methods=['put', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def update_profile(self, request):
        """
        Обновление профиля пользователя
        """
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """
        Обновление пользователя (только для суперпользователей или владельца)
        """
        instance = self.get_object()
        
        # Проверяем права доступа
        if not request.user.is_staff and request.user != instance:
            return Response(
                {'detail': 'У вас нет прав для выполнения этого действия.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Удаление пользователя (только для суперпользователей)
        """
        instance = self.get_object()
        
        # Проверяем права доступа
        if not request.user.is_staff:
            return Response(
                {'detail': 'У вас нет прав для выполнения этого действия.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


# Создайте отдельный view для login без проверки аутентификации
from rest_framework.views import APIView

class UserLoginView(APIView):
    """
    Кастомный view для логина без проверки аутентификации
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



# user/views.py (добавить)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class UserRegistrationView(APIView):
    """
    Отдельный view для регистрации
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Создаем JWT токены
            refresh = RefreshToken.for_user(user)
            
            # Сериализуем данные пользователя
            user_data = UserSerializer(user).data
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': user_data,
                'message': 'Регистрация успешно завершена'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
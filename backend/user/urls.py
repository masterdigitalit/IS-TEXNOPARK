# user/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, UserLoginView, UserRegistrationView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
    TokenBlacklistView,

)

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    # JWT аутентификация (стандартные эндпоинты)
	path('', include(router.urls)),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('auth/token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('auth/register/', UserRegistrationView.as_view(), name='user-register'),
    # Кастомный login (если хотите)
    path('auth/login/', UserLoginView.as_view(), name='user-login'),
    
    # Включение всех эндпоинтов UserViewSet
    path('users/', include(router.urls)),
]
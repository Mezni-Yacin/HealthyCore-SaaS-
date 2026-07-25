# apps/users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    user_me,
    user_profile,
    patient_profile,
    upload_document,
    delete_document,
    CustomTokenObtainPairView,
    SubscriptionPlanViewSet,
    SubscriptionViewSet,
    UserManagementViewSet,
    CityViewSet,
    GovernorateViewSet,
    MedicalSpecialtyViewSet,
)

router = DefaultRouter()
# === CORRECTION ICI ===
router.register(r'user-management', UserManagementViewSet, basename='user-management')
router.register(r'subscription-plans', SubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'cities', CityViewSet, basename='city')
router.register(r'governorates', GovernorateViewSet, basename='governorate')
router.register(r'specialties', MedicalSpecialtyViewSet, basename='medical-specialty')

urlpatterns = [
    # Auth
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Profils
    path('me/', user_me, name='user_me'),
    path('profile/', user_profile, name='user_profile'),
    path('patient-profile/', patient_profile, name='patient_profile'),

    # Documents
    path('documents/', upload_document, name='upload_document'),
    path('documents/<int:pk>/', delete_document, name='delete_document'),
    
    # ViewSets
    path('', include(router.urls)),
]
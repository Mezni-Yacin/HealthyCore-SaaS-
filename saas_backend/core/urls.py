# core/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Ton app users
    path('api/users/', include('apps.users.urls')),
     # API Cabinets (NOUVEAU)
    path('api/cabinets/', include('apps.cabinets.urls')),
]

# Servir les médias en développement (photos de profil)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
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
    path('api/medical-records/', include('apps.medical_records.urls')),
    path('api/appointments/', include('apps.appointments.urls')),
    path('api/messaging/', include('apps.messaging.urls')),
    path('api/waiting-queue/', include('apps.waiting_queue.urls')),
    path('api/billing/', include('apps.billing.urls')),
    path('api/laboratories/', include('apps.laboratories.urls')),
    path('api/ai/', include('apps.ai.urls')),
    path('api/pharmacy/', include('apps.pharmacy.urls')), 

    

]

# Servir les médias en développement (photos de profil)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
from django.contrib import admin
from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'patient', 'doctor', 'cabinet',
        'date_time', 'duration', 'status',
        'is_teleconsultation', 'consultation_type',
        'is_deleted', 'created_at',
    ]
    list_filter = [
        'status', 'is_teleconsultation', 'consultation_type',
        'is_deleted', 'created_at', 'date_time',
    ]
    search_fields = [
        'patient__user__first_name', 'patient__user__last_name',
        'doctor__user__first_name', 'doctor__user__last_name',
        'cabinet__name', 'symptoms', 'notes',
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'deleted_at',
        'reminder_sent_24h', 'reminder_sent_1h',
    ]
    date_hierarchy = 'date_time'
    ordering = ['-date_time']

    fieldsets = (
        ('Informations principales', {
            'fields': (
                'patient', 'doctor', 'cabinet',
                'date_time', 'duration', 'status',
            )
        }),
        ('Type de consultation', {
            'fields': (
                'is_teleconsultation', 'consultation_type',
            )
        }),
        ('Détails', {
            'fields': (
                'symptoms', 'notes',
            )
        }),
        ('Annulation', {
            'fields': (
                'cancellation_reason', 'cancellation_notes',
            ),
            'classes': ('collapse',),
        }),
        ('Métadonnées', {
            'fields': (
                'created_by', 'last_modified_by', 'approved_by',
                'reminder_sent_24h', 'reminder_sent_1h',
                'is_deleted', 'deleted_at',
                'created_at', 'updated_at',
            ),
            'classes': ('collapse',),
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'patient', 'patient__user', 'doctor', 'doctor__user', 'cabinet'
        )
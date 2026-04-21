# -*- coding: utf-8 -*-
from django.contrib import admin
from .models import WaitingQueueEntry


@admin.register(WaitingQueueEntry)
class WaitingQueueEntryAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'position', 'patient', 'doctor', 'cabinet', 'status',
        'priority', 'reason', 'joined_at', 'ended_at',
    )
    list_filter = ('status', 'priority', 'reason')
    date_hierarchy = 'joined_at'
    search_fields = (
        'patient__user__first_name',
        'patient__user__last_name',
        'doctor__user__first_name',
        'doctor__user__last_name',
        'reason_details',
        'notes',
    )
    list_editable = ('status', 'priority')
    readonly_fields = (
        'position', 'estimated_wait_minutes', 'joined_at', 'called_at',
        'started_at', 'ended_at', 'actual_wait_minutes',
        'consultation_duration_minutes', 'created_at', 'updated_at',
    )
    fieldsets = (
        ('Patient & Médecin', {
            'fields': ('patient', 'doctor', 'cabinet', 'appointment'),
        }),
        ("File d'attente", {
            'fields': ('status', 'priority', 'reason', 'reason_details', 'position'),
        }),
        ('Timing', {
            'fields': (
                'estimated_wait_minutes', 'joined_at', 'called_at',
                'started_at', 'ended_at', 'actual_wait_minutes',
                'consultation_duration_minutes',
            ),
            'classes': ('collapse',),
        }),
        ('Notes', {
            'fields': ('notes', 'doctor_notes'),
        }),
        ('Métadonnées', {
            'fields': ('created_by', 'is_deleted', 'deleted_at'),
            'classes': ('collapse',),
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'patient__user', 'doctor__user', 'cabinet',
        )
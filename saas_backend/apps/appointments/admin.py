from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from .models import Appointment
from apps.users.models import User, Patient
from apps.cabinets.models import Doctor, Cabinet


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    """Administration des rendez-vous médicaux"""
    list_display = (
        'id', 'patient_link', 'doctor_link', 'cabinet',
        'date_time_formatted', 'status', 'is_teleconsultation',
        'duration', 'approved_by_link', 'created_at'
    )
    list_filter = (
        'status', 'is_teleconsultation', 'consultation_type',
        'reminder_sent_24h', 'reminder_sent_1h',
        'is_deleted', 'cabinet'
    )  # ← 'priority' supprimé car inexistant
    search_fields = (
        'patient__user__first_name', 'patient__user__last_name',
        'doctor__user__first_name', 'doctor__user__last_name',
        'notes', 'symptoms', 'cancellation_notes'
    )
    list_select_related = ('patient', 'doctor', 'cabinet', 'approved_by', 'created_by')
    readonly_fields = ('created_at', 'updated_at', 'reminder_sent_24h', 'reminder_sent_1h')
    ordering = ('-date_time',)
    date_hierarchy = 'date_time'
    
    fieldsets = (
        (_('Participants'), {
            'fields': ('patient', 'doctor', 'cabinet')
        }),
        (_('Détails du rendez-vous'), {
            'fields': ('date_time', 'duration', 'status', 'consultation_type', 'is_teleconsultation')
        }),
        (_('Gestion administrative'), {
            'fields': ('created_by', 'last_modified_by', 'approved_by')
        }),
        (_('Annulation'), {
            'fields': ('cancellation_reason', 'cancellation_notes')
        }),
        (_('Notes médicales'), {
            'fields': ('symptoms', 'notes')
        }),
        (_('Rappels'), {
            'fields': ('reminder_sent_24h', 'reminder_sent_1h')
        }),
        (_('Statut'), {
            'fields': ('is_deleted', 'deleted_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def patient_link(self, obj):
        return obj.patient.user.get_full_name() if obj.patient.user else "Anonyme"
    patient_link.short_description = "Patient"
    
    def doctor_link(self, obj):
        return f"Dr. {obj.doctor.user.get_full_name()}" if obj.doctor else "-"
    doctor_link.short_description = "Médecin"
    
    def approved_by_link(self, obj):
        return obj.approved_by.get_full_name() if obj.approved_by else "-"
    approved_by_link.short_description = "Approuvé par"
    
    def date_time_formatted(self, obj):
        return obj.date_time.strftime("%d/%m/%Y %H:%M")
    date_time_formatted.short_description = "Date & Heure"
    date_time_formatted.admin_order_field = 'date_time'
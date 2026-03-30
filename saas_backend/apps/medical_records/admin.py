from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from .models import MedicalRecord, Prescription, MedicalAttachment
from apps.users.models import User, Patient
from apps.cabinets.models import Doctor
from apps.appointments.models import Appointment


# ────────────────────────────────────────────────
# Dossier Médical (MedicalRecord) – le plus important
# ────────────────────────────────────────────────
@admin.register(MedicalRecord)
class MedicalRecordAdmin(admin.ModelAdmin):
    list_display = (
        'patient_link', 'doctor_link', 'date', 'priority',
        'confidentiality_level', 'follow_up_needed', 'is_deleted'
    )
    list_filter = ('priority', 'confidentiality_level', 'follow_up_needed', 'is_deleted')
    search_fields = (
        'patient__user__first_name', 'patient__user__last_name',
        'doctor__user__first_name', 'doctor__user__last_name',
        'diagnosis_code', 'symptoms'
    )
    list_select_related = ('patient', 'doctor', 'appointment')
    readonly_fields = ('date', 'created_at', 'updated_at')
    ordering = ('-date', '-created_at')
    
    fieldsets = (
        (_('Lien'), {
            'fields': ('patient', 'doctor', 'appointment')
        }),
        (_('Clinique'), {
            'fields': ('symptoms', 'diagnosis', 'diagnosis_code', 'treatment')
        }),
        (_('Suivi'), {
            'fields': ('follow_up_needed', 'follow_up_date')
        }),
        (_('Constantes vitales'), {
            'fields': (
                'temperature', 'blood_pressure_systolic', 'blood_pressure_diastolic',
                'heart_rate', 'respiratory_rate', 'oxygen_saturation'
            )
        }),
        (_('Notes'), {
            'fields': ('notes',)
        }),
        (_('Priorité & Confidentialité'), {
            'fields': ('priority', 'confidentiality_level')
        }),
        (_('Statut'), {
            'fields': ('is_deleted', 'deleted_at', 'date', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def patient_link(self, obj):
        return obj.patient.user.get_full_name() if obj.patient.user else "Anonyme"
    patient_link.short_description = "Patient"
    
    def doctor_link(self, obj):
        return f"Dr. {obj.doctor.user.get_full_name()}" if obj.doctor else "-"
    doctor_link.short_description = "Médecin"


# ────────────────────────────────────────────────
# Prescription
# ────────────────────────────────────────────────
@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = (
        'medication_name', 'medical_record_patient', 'dosage',
        'form', 'frequency', 'duration', 'quantity', 'is_active'
    )
    list_filter = ('form', 'is_active', 'is_generic_allowed', 'is_electronic')
    search_fields = (
        'medication_name', 'dosage', 'frequency',
        'medical_record__patient__user__first_name',
        'medical_record__patient__user__last_name'
    )
    list_select_related = ('medical_record', 'medical_record__patient')
    readonly_fields = ('prescribed_at',)
    ordering = ('-prescribed_at',)
    
    fieldsets = (
        (_('Dossier lié'), {
            'fields': ('medical_record',)
        }),
        (_('Médicament'), {
            'fields': ('medication_name', 'dosage', 'form')
        }),
        (_('Posologie'), {
            'fields': ('frequency', 'duration', 'quantity')
        }),
        (_('Instructions'), {
            'fields': ('instructions', 'with_meals', 'before_meals', 'after_meals')
        }),
        (_('Options'), {
            'fields': ('is_generic_allowed', 'refills_allowed', 'is_active', 'is_electronic')
        }),
        (_('Métadonnées'), {
            'fields': ('prescribed_at',)
        }),
    )
    
    def medical_record_patient(self, obj):
        patient = obj.medical_record.patient
        return patient.user.get_full_name() if patient.user else "Anonyme"
    medical_record_patient.short_description = "Patient"


# ────────────────────────────────────────────────
# Pièce Jointe Médicale (MedicalAttachment)
# ────────────────────────────────────────────────
@admin.register(MedicalAttachment)
class MedicalAttachmentAdmin(admin.ModelAdmin):
    list_display = (
        'file_type', 'medical_record_patient', 'description_short',
        'uploaded_by_link', 'uploaded_at'
    )
    list_filter = ('file_type',)
    search_fields = (
        'description', 'medical_record__patient__user__first_name',
        'medical_record__patient__user__last_name'
    )
    list_select_related = ('medical_record', 'uploaded_by')
    readonly_fields = ('uploaded_at',)
    ordering = ('-uploaded_at',)
    
    fieldsets = (
        (_('Dossier lié'), {
            'fields': ('medical_record',)
        }),
        (_('Fichier'), {
            'fields': ('file', 'file_type')
        }),
        (_('Description'), {
            'fields': ('description',)
        }),
        (_('Upload'), {
            'fields': ('uploaded_by', 'uploaded_at')
        }),
    )
    
    def medical_record_patient(self, obj):
        patient = obj.medical_record.patient
        return patient.user.get_full_name() if patient.user else "Anonyme"
    medical_record_patient.short_description = "Patient"
    
    def description_short(self, obj):
        return (obj.description[:40] + "...") if obj.description else "-"
    description_short.short_description = "Description"
    
    def uploaded_by_link(self, obj):
        return obj.uploaded_by.get_full_name() if obj.uploaded_by else "-"
    uploaded_by_link.short_description = "Uploadé par"
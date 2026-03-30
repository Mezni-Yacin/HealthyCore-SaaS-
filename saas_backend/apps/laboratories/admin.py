from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Laboratory, LabTestType, LabTestRequest, LabResult
from apps.users.models import User, Patient
from apps.cabinets.models import Doctor


# ────────────────────────────────────────────────
# Laboratoire
# ────────────────────────────────────────────────
@admin.register(Laboratory)
class LaboratoryAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'owner_link', 'city', 'cnam_affiliated',
        'is_active', 'created_at'
    )
    list_filter = ('cnam_affiliated', 'is_active', 'city__governorate')
    search_fields = ('name', 'owner__username', 'owner__first_name', 'owner__last_name')
    list_select_related = ('owner', 'city')
    readonly_fields = ('created_at', 'deleted_at')
    ordering = ('name',)
    
    fieldsets = (
        (_('Informations principales'), {
            'fields': ('name', 'owner', 'secretaries')
        }),
        (_('Localisation'), {
            'fields': ('address', 'city')
        }),
        (_('Contact'), {
            'fields': ('phone_number', 'email', 'website')
        }),
        (_('Professionnel'), {
            'fields': ('accreditation', 'accreditation_number', 'cnam_affiliated', 'cnam_code')
        }),
        (_('Services et spécialités'), {
            'fields': ('services_offered', 'specialties')
        }),
        (_('Horaires'), {
            'fields': ('opening_hours', 'sample_collection_hours', 'timezone')
        }),
        (_('Visuel'), {
            'fields': ('logo',)
        }),
        (_('Statut'), {
            'fields': ('is_active', 'is_deleted', 'deleted_at', 'created_at')
        }),
    )
    
    def owner_link(self, obj):
        return f"{obj.owner.get_full_name()} ({obj.owner.username})"
    owner_link.short_description = "Propriétaire"


# ────────────────────────────────────────────────
# Type d'analyse (LabTestType)
# ────────────────────────────────────────────────
@admin.register(LabTestType)
class LabTestTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'category', 'price', 'cnam_coverage', 'cnam_price')
    list_filter = ('category', 'cnam_coverage')
    search_fields = ('name', 'code', 'description')
    ordering = ('category', 'name')
    
    fieldsets = (
        (_('Informations'), {
            'fields': ('name', 'code', 'category')
        }),
        (_('Détails'), {
            'fields': ('description', 'preparation_instructions', 'turnaround_time')
        }),
        (_('Tarification'), {
            'fields': ('price', 'cnam_coverage', 'cnam_price')
        }),
    )


# ────────────────────────────────────────────────
# Demande d'analyse (LabTestRequest)
# ────────────────────────────────────────────────
@admin.register(LabTestRequest)
class LabTestRequestAdmin(admin.ModelAdmin):
    list_display = (
        'patient_link', 'doctor_link', 'laboratory', 'priority',
        'status', 'request_date', 'total_price_display'
    )
    list_filter = ('priority', 'status', 'laboratory')
    search_fields = (
        'patient__user__first_name', 'patient__user__last_name',
        'doctor__user__first_name', 'doctor__user__last_name',
        'clinical_history', 'diagnosis_suspected'
    )
    list_select_related = ('patient', 'doctor', 'laboratory')
    readonly_fields = ('request_date',)
    ordering = ('-request_date',)
    
    fieldsets = (
        (_('Participants'), {
            'fields': ('patient', 'doctor', 'laboratory')
        }),
        (_('Détails de la demande'), {
            'fields': ('tests', 'priority', 'status', 'request_date')
        }),
        (_('Clinique'), {
            'fields': ('clinical_history', 'diagnosis_suspected', 'notes')
        }),
        (_('Prélèvement'), {
            'fields': ('sample_collected_at', 'sample_collected_by')
        }),
        (_('Statut'), {
            'fields': ('is_deleted', 'deleted_at')
        }),
    )
    
    def patient_link(self, obj):
        return obj.patient.user.get_full_name() if obj.patient.user else "Anonyme"
    patient_link.short_description = "Patient"
    
    def doctor_link(self, obj):
        return f"Dr. {obj.doctor.user.get_full_name()}"
    doctor_link.short_description = "Médecin"
    
    def total_price_display(self, obj):
        return f"{obj.total_price:,.3f} TND"
    total_price_display.short_description = "Prix total"


# ────────────────────────────────────────────────
# Résultat d'analyse (LabResult)
# ────────────────────────────────────────────────
@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = (
        'request_patient', 'analysis_date', 'is_abnormal',
        'critical_finding', 'validated_by_link'
    )
    list_filter = ('is_abnormal', 'critical_finding')
    search_fields = (
        'test_request__patient__user__first_name',
        'test_request__patient__user__last_name',
        'conclusion', 'recommendations'
    )
    list_select_related = ('test_request', 'analyzed_by', 'validated_by')
    readonly_fields = ('analysis_date', 'validation_date')
    ordering = ('-analysis_date',)
    
    fieldsets = (
        (_('Demande liée'), {
            'fields': ('test_request',)
        }),
        (_('Résultats'), {
            'fields': ('results', 'conclusion', 'recommendations')
        }),
        (_('Validation'), {
            'fields': ('analyzed_by', 'validated_by', 'validation_date')
        }),
        (_('Rapport'), {
            'fields': ('pdf_report',)
        }),
        (_('Alertes'), {
            'fields': ('is_abnormal', 'critical_finding')
        }),
        (_('Statut'), {
            'fields': ('is_deleted', 'deleted_at')
        }),
    )
    
    def request_patient(self, obj):
        patient = obj.test_request.patient
        return patient.user.get_full_name() if patient.user else "Anonyme"
    request_patient.short_description = "Patient"
    
    def validated_by_link(self, obj):
        return obj.validated_by.get_full_name() if obj.validated_by else "-"
    validated_by_link.short_description = "Validé par"
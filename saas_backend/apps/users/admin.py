# apps/users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import (
    Governorate, City, InsuranceCompany, MedicalSpecialty,
    User, SubscriptionPlan, Subscription, Patient, UserDocument
)

# --- INLINES ---

class UserDocumentInline(admin.TabularInline):
    """Permet de voir/ajouter les documents directement depuis la fiche d'un utilisateur"""
    model = UserDocument
    fk_name = 'user'  # <--- AJOUTE CETTE LIGNE POUR RÉSOUDRE L'ERREUR
    extra = 0
    readonly_fields = ('created_at',)
    fields = ('title', 'document_type', 'file', 'is_verified', 'created_at')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('uploaded_by')


# --- ADMIN BASIQUES (Tables de référence) ---

@admin.register(Governorate)
class GovernorateAdmin(admin.ModelAdmin):
    list_display = ('name', 'code')
    search_fields = ('name', 'code')
    ordering = ('name',)


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ('name', 'governorate', 'postal_code')
    list_filter = ('governorate',)
    search_fields = ('name',)
    ordering = ('name',)


@admin.register(InsuranceCompany)
class InsuranceCompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_cnam')
    list_filter = ('is_cnam',)
    search_fields = ('name', 'code')


@admin.register(MedicalSpecialty)
class MedicalSpecialtyAdmin(admin.ModelAdmin):
    list_display = ('name', 'code')
    search_fields = ('name', 'code')


# --- ADMIN UTILISATEUR ---

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = (
        'username', 'email', 'first_name', 'last_name', 
        'role', 'phone_number', 'is_active', 'is_verified', 'language_preference'
    )
    list_filter = (
        'role', 'is_active', 'is_verified', 'two_factor_enabled', 'language_preference'
    )
    search_fields = ('username', 'first_name', 'last_name', 'email', 'phone_number')
    
    # Utilisation de raw_id_fields pour les clés étrangères vers de grosses tables
    raw_id_fields = ('city',)
    
    # Affichage de l'image de profil dans la liste
    def thumbnail(self, obj):
        if obj.profile_picture:
            return format_html('<img src="{}" width="30" height="30" style="border-radius:50%;" />', obj.profile_picture.url)
        return "-"
    thumbnail.short_description = "Photo"

    # On réorganise les fieldsets pour intégrer nos champs personnalisés
    fieldsets = UserAdmin.fieldsets + (
        ("Informations Complémentaires", {
            'fields': ('role', 'phone_number', 'address', 'city', 'profile_picture')
        }),
        ("Vérification & Sécurité", {
            'fields': ('is_verified', 'verification_token', 'two_factor_enabled', 'last_2fa_code', 'last_2fa_sent')
        }),
        ("Préférences", {
            'fields': ('language_preference',)
        }),
        ("Métadonnées", {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',) # Regroupé par défaut pour alléger la vue
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'verification_token')
    inlines = [UserDocumentInline]


# --- ADMIN ABONNEMENTS ---

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = (
        'display_name', 'name', 'monthly_price', 'yearly_price', 
        'is_active', 'is_popular', 'order'
    )
    list_filter = ('is_active', 'is_popular', 'name')
    search_fields = ('display_name',)
    ordering = ('order', 'monthly_price')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ("Informations Générales", {
            'fields': ('name', 'display_name', 'description')
        }),
        ("Tarification", {
            'fields': ('monthly_price', 'yearly_price', 'discount_percentage')
        }),
        ("Limites & Fonctionnalités", {
            'fields': ('max_doctors', 'max_secretaries', 'max_patients', 'features')
        }),
        ("Options d'affichage", {
            'fields': ('is_active', 'is_popular', 'order')
        }),
    )


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'plan', 'period', 'start_date', 'end_date', 
        'is_active', 'auto_renew', 'payment_method'
    )
    list_filter = ('is_active', 'auto_renew', 'period', 'plan')
    search_fields = ('user__username', 'user__email', 'stripe_subscription_id')
    raw_id_fields = ('user', 'plan') # Très important pour les perfs
    readonly_fields = ('start_date',)


# --- ADMIN PATIENT ---

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        'get_full_name', 'date_of_birth', 'get_age', 'gender', 
        'blood_type', 'insurance_company', 'is_deleted'
    )
    list_filter = ('gender', 'blood_type', 'insurance_company', 'is_deleted', 'consent_given')
    search_fields = (
        'user__first_name', 'user__last_name', 'user__email', 'insurance_number'
    )
    raw_id_fields = ('user', 'insurance_company')
    readonly_fields = ('created_at', 'updated_at', 'deleted_at')

    @admin.display(description='Nom complet', ordering='user__last_name')
    def get_full_name(self, obj):
        return obj.user.get_full_name() if obj.user else 'Patient anonyme'

    @admin.display(description='Âge')
    def get_age(self, obj):
        return f"{obj.age} ans"

    fieldsets = (
        ("Lien Utilisateur", {
            'fields': ('user',)
        }),
        ("Informations Personnelles", {
            'fields': ('date_of_birth', 'gender', 'blood_type', 'height', 'weight')
        }),
        ("Antécédents Médicaux", {
            'fields': ('allergies', 'chronic_diseases', 'current_medications', 'family_history'),
            'classes': ('wide',) # Classe large pour les textarea
        }),
        ("Assurance", {
            'fields': ('insurance_company', 'insurance_number')
        }),
        ("Contact d'Urgence", {
            'fields': ('emergency_contact_name', 'emergency_contact_phone')
        }),
        ("Consentement & Statut", {
            'fields': ('consent_given', 'consent_date', 'consent_version', 'is_deleted', 'deleted_at')
        }),
    )


# --- ADMIN DOCUMENT ---

@admin.register(UserDocument)
class UserDocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'document_type', 'is_verified', 'uploaded_by', 'created_at')
    list_filter = ('document_type', 'is_verified')
    search_fields = ('title', 'user__username', 'user__first_name', 'user__last_name')
    raw_id_fields = ('user', 'uploaded_by')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at' # Ajoute une navigation par dates pratique pour les documents
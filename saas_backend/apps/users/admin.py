# apps/users/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import (
    User, Governorate, City, InsuranceCompany, 
    MedicalSpecialty, SubscriptionPlan, Subscription, 
    Patient, UserDocument
)


@admin.register(Governorate)
class GovernorateAdmin(admin.ModelAdmin):
    list_display = ['name', 'code']
    search_fields = ['name', 'code']


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ['name', 'governorate', 'postal_code']
    list_filter = ['governorate']
    search_fields = ['name']


@admin.register(InsuranceCompany)
class InsuranceCompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_cnam']
    list_filter = ['is_cnam']
    search_fields = ['name', 'code']


@admin.register(MedicalSpecialty)
class MedicalSpecialtyAdmin(admin.ModelAdmin):
    list_display = ['name', 'code']
    search_fields = ['name', 'code']


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'name', 'monthly_price', 'yearly_price', 
                    'max_doctors', 'max_patients', 'is_active', 'is_popular', 'order']
    list_filter = ['name', 'is_active', 'is_popular']
    search_fields = ['display_name', 'description']
    list_editable = ['monthly_price', 'yearly_price', 'is_active', 'order']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'period', 'start_date', 'end_date', 'is_active', 'auto_renew']
    list_filter = ['plan', 'period', 'is_active', 'auto_renew']
    search_fields = ['user__username', 'user__email', 'plan__display_name']
    date_hierarchy = 'start_date'


class PatientInline(admin.StackedInline):
    model = Patient
    can_delete = False
    verbose_name_plural = 'Profil Patient'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'get_role_display', 'is_verified', 'is_active', 'created_at']
    list_filter = ['role', 'is_verified', 'is_active', 'city']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone_number']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Informations personnelles'), {
            'fields': ('first_name', 'last_name', 'email', 'phone_number', 'address', 'city', 'profile_picture')
        }),
        (_('Rôle et permissions'), {
            'fields': ('role', 'is_verified', 'two_factor_enabled', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        (_('Préférences'), {
            'fields': ('language_preference',)
        }),
        (_('Dates importantes'), {
            'fields': ('last_login', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'last_login']
    
    inlines = [PatientInline]


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['user', 'date_of_birth', 'gender', 'blood_type', 'insurance_company', 'consent_given']
    list_filter = ['gender', 'blood_type', 'insurance_company', 'consent_given']
    search_fields = ['user__username', 'user__email', 'insurance_number']
    date_hierarchy = 'date_of_birth'


@admin.register(UserDocument)
class UserDocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'document_type', 'is_verified', 'uploaded_by', 'created_at']
    list_filter = ['document_type', 'is_verified']
    search_fields = ['title', 'user__username', 'user__email', 'description']
    date_hierarchy = 'created_at'
    raw_id_fields = ['user', 'uploaded_by']
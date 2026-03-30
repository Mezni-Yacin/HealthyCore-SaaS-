from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from .models import Invoice, Payment
from apps.users.models import Patient
from apps.appointments.models import Appointment
from apps.laboratories.models import LabTestRequest
from apps.cabinets.models import Cabinet
from apps.laboratories.models import Laboratory


# ────────────────────────────────────────────────
# Facture (Invoice)
# ────────────────────────────────────────────────
@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        'invoice_number', 'patient_link', 'total_amount_display',
        'status', 'due_date', 'is_validated', 'payment_method',
        'issue_date'
    )
    list_filter = ('status', 'payment_method', 'is_validated', 'is_deleted')
    search_fields = (
        'invoice_number', 'patient__user__first_name', 'patient__user__last_name',
        'patient__user__email', 'notes'
    )
    list_select_related = ('patient', 'appointment', 'lab_test_request', 'issued_by_cabinet', 'issued_by_lab')
    readonly_fields = ('invoice_number', 'issue_date', 'created_at', 'total_amount')
    ordering = ('-issue_date',)
    
    fieldsets = (
        (_('Informations générales'), {
            'fields': ('invoice_number', 'patient', 'status', 'issue_date', 'due_date')
        }),
        (_('Origine'), {
            'fields': ('appointment', 'lab_test_request', 'issued_by_cabinet', 'issued_by_lab')
        }),
        (_('Montants'), {
            'fields': (
                'subtotal', 'tax_amount', 'discount_amount',
                'total_amount', 'cnam_contribution', 'insurance_contribution',
                'patient_contribution'
            )
        }),
        (_('Paiement'), {
            'fields': ('payment_method', 'is_validated')
        }),
        (_('Notes'), {
            'fields': ('notes', 'terms_and_conditions')
        }),
        (_('Statut'), {
            'fields': ('is_deleted', 'deleted_at', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def patient_link(self, obj):
        return obj.patient.user.get_full_name() if obj.patient.user else "Anonyme"
    patient_link.short_description = "Patient"
    
    def total_amount_display(self, obj):
        return format_html('<strong>{:,.3f} TND</strong>', obj.total_amount)
    total_amount_display.short_description = "Total"


# ────────────────────────────────────────────────
# Paiement (Payment)
# ────────────────────────────────────────────────
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'invoice_number', 'amount_display', 'payment_method',
        'status', 'payment_date', 'transaction_id_short'
    )
    list_filter = ('status', 'payment_method')
    search_fields = (
        'invoice__invoice_number', 'transaction_id',
        'invoice__patient__user__first_name', 'invoice__patient__user__last_name',
        'cnam_transaction_number'
    )
    list_select_related = ('invoice', 'invoice__patient')
    readonly_fields = ('payment_date',)
    ordering = ('-payment_date',)
    
    fieldsets = (
        (_('Facture liée'), {
            'fields': ('invoice',)
        }),
        (_('Montant et méthode'), {
            'fields': ('amount', 'payment_method')
        }),
        (_('Statut'), {
            'fields': ('status',)
        }),
        (_('Références'), {
            'fields': ('transaction_id', 'cnam_transaction_number')
        }),
        (_('Notes'), {
            'fields': ('notes',)
        }),
        (_('Date'), {
            'fields': ('payment_date',)
        }),
    )
    
    def invoice_number(self, obj):
        return obj.invoice.invoice_number
    invoice_number.short_description = "N° Facture"
    
    def amount_display(self, obj):
        return format_html('<strong>{:,.3f} TND</strong>', obj.amount)
    amount_display.short_description = "Montant"
    
    def transaction_id_short(self, obj):
        return obj.transaction_id[:12] + '...' if obj.transaction_id and len(obj.transaction_id) > 12 else obj.transaction_id or "-"
    transaction_id_short.short_description = "Transaction ID"
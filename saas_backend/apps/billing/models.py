from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from decimal import Decimal
from datetime import date
from apps.users.models import User, Patient
from apps.appointments.models import Appointment
from apps.laboratories.models import LabTestRequest
from apps.cabinets.models import Cabinet
from apps.laboratories.models import Laboratory


class Invoice(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Brouillon'),
        ('pending', 'En Attente'),
        ('partially_paid', 'Partiellement Payé'),
        ('paid', 'Payé'),
        ('overdue', 'En Retard'),
        ('cancelled', 'Annulée'),
    )

    PAYMENT_METHOD_CHOICES = (
        ('cash', 'Espèces'),
        ('check', 'Chèque'),
        ('card', 'Carte Bancaire'),
        ('transfer', 'Virement'),
        ('cnam', 'CNAM'),
        ('insurance', 'Assurance'),
        ('online', 'Paiement en ligne'),
    )

    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name='invoices')

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices'
    )
    lab_test_request = models.ForeignKey(
        LabTestRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices'
    )

    issued_by_cabinet = models.ForeignKey(
        Cabinet,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='invoices'
    )
    issued_by_lab = models.ForeignKey(
        Laboratory,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='invoices'
    )

    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0'))]
    )
    tax_amount = models.DecimalField(max_digits=10, decimal_places=3, default=Decimal('0.000'))
    discount_amount = models.DecimalField(max_digits=10, decimal_places=3, default=Decimal('0.000'))
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0'))]
    )

    cnam_contribution = models.DecimalField(max_digits=10, decimal_places=3, default=Decimal('0.000'))
    insurance_contribution = models.DecimalField(max_digits=10, decimal_places=3, default=Decimal('0.000'))
    patient_contribution = models.DecimalField(max_digits=10, decimal_places=3, default=Decimal('0.000'))

    issue_date = models.DateField(auto_now_add=True)
    due_date = models.DateField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_validated = models.BooleanField(default=False)
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        blank=True,
        null=True
    )

    invoice_number = models.CharField(max_length=50, unique=True, editable=False)
    notes = models.TextField(blank=True, null=True)
    terms_and_conditions = models.TextField(blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Facture")
        verbose_name_plural = _("Factures")
        ordering = ['-issue_date']
        indexes = [
            models.Index(fields=['patient', 'status']),
            models.Index(fields=['invoice_number']),
            models.Index(fields=['due_date', 'status']),
        ]

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            today = date.today()
            last_invoice = Invoice.objects.filter(
                issue_date__year=today.year
            ).order_by('-invoice_number').first()

            if last_invoice and last_invoice.invoice_number:
                last_number = int(last_invoice.invoice_number.split('-')[-1])
                new_number = last_number + 1
            else:
                new_number = 1

            self.invoice_number = f"FAC-{today.year}-{new_number:06d}"

        self.total_amount = (
            self.subtotal +
            self.tax_amount -
            self.discount_amount
        )

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Facture {self.invoice_number} - {self.patient}"


# apps/billing/models.py

class Payment(models.Model):
    STATUS_CHOICES = (
        ('pending', 'En Attente'),
        ('completed', 'Complété'),
        ('failed', 'Échoué'),
        ('refunded', 'Remboursé'),
    )

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(
        max_digits=10, decimal_places=3,
        validators=[MinValueValidator(Decimal('0'))]
    )
    payment_method = models.CharField(max_length=20, choices=Invoice.PAYMENT_METHOD_CHOICES)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, null=True)
    payment_date = models.DateTimeField(auto_now_add=True)

    cnam_transaction_number = models.CharField(max_length=50, blank=True, null=True)
    
    # ✅ NOUVEAUX CHAMPS STRIPE
    stripe_payment_intent_id = models.CharField(max_length=200, blank=True, null=True, db_index=True)
    stripe_checkout_session_id = models.CharField(max_length=200, blank=True, null=True, db_index=True)
    stripe_customer_email = models.EmailField(blank=True, null=True)

    class Meta:
        verbose_name = _("Paiement")
        verbose_name_plural = _("Paiements")
        ordering = ['-payment_date']

    def __str__(self):
        return f"Paiement de {self.amount} TND pour {self.invoice}"
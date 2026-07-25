# apps/billing/serializers.py
# ──────────────────────────────────────────────────────────────
# Serializers Invoice + Payment — MedSaaS Pro
# ──────────────────────────────────────────────────────────────

from rest_framework import serializers
from django.db.models import Sum
from .models import Invoice, Payment
from django.core.validators import MinValueValidator
from decimal import Decimal
from datetime import date, timedelta


# ══════════════════ Payment Serializers ══════════════════

class PaymentListSerializer(serializers.ModelSerializer):
    """Serializer léger pour lister les paiements."""
    payment_method_display = serializers.CharField(
        source='get_payment_method_display', read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )

    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'payment_method', 'payment_method_display',
            'status', 'status_display', 'transaction_id',
            'cnam_transaction_number', 'payment_date', 'notes',
        ]
        read_only_fields = ['id', 'payment_date']


class PaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer un paiement."""
    class Meta:
        model = Payment
        fields = [
            'amount', 'payment_method', 'transaction_id',
            'cnam_transaction_number', 'notes',
        ]

    def validate_amount(self, value):
        invoice = self.context.get('invoice')
        if invoice:
            total_paid = invoice.payments.filter(
                status='completed'
            ).aggregate(sum_paid=Sum('amount'))['sum_paid'] or Decimal('0')
            remaining = invoice.total_amount - total_paid
            if value > remaining:
                raise serializers.ValidationError(
                    f"Le montant dépasse le reste à payer ({remaining:.3f} TND)."
                )
        return value


# ══════════════════ Invoice Serializers ══════════════════

class InvoiceListSerializer(serializers.ModelSerializer):
    """Serializer léger pour les listes de factures."""
    patient_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )
    payment_method_display = serializers.CharField(
        source='get_payment_method_display', read_only=True
    )
    total_paid = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    payments_count = serializers.IntegerField(
        source='payments.count', read_only=True
    )
    cabinet_name = serializers.CharField(
        source='issued_by_cabinet.name', read_only=True, default=None
    )

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'patient_name',
            'status', 'status_display',
            'subtotal', 'tax_amount', 'discount_amount', 'total_amount',
            'cnam_contribution', 'insurance_contribution', 'patient_contribution',
            'total_paid', 'remaining_amount', 'payments_count',
            'payment_method', 'payment_method_display',
            'issue_date', 'due_date', 'is_validated',
            'cabinet_name',
        ]
        read_only_fields = ['id', 'invoice_number', 'issue_date']

    def get_patient_name(self, obj):
        user = obj.patient.user
        return f"{user.first_name} {user.last_name}".strip() or user.username

    def get_total_paid(self, obj):
        return obj.payments.filter(status='completed').aggregate(
            sum_paid=Sum('amount')
        )['sum_paid'] or Decimal('0')

    def get_remaining_amount(self, obj):
        paid = self.get_total_paid(obj)
        return max(float(obj.total_amount) - float(paid), 0)


class InvoiceDetailSerializer(InvoiceListSerializer):
    """Serializer complet pour le détail d'une facture."""
    appointment_info = serializers.SerializerMethodField()
    lab_test_info = serializers.SerializerMethodField()
    payments = PaymentListSerializer(many=True, read_only=True)

    class Meta(InvoiceListSerializer.Meta):
        fields = InvoiceListSerializer.Meta.fields + [
            'appointment', 'lab_test_request',
            'appointment_info', 'lab_test_info',
            'issued_by_cabinet', 'issued_by_lab',
            'notes', 'terms_and_conditions',
            'payments',
            'created_at',
        ]

    def get_appointment_info(self, obj):
        if obj.appointment:
            # Récupérer le nom du médecin depuis doctor.user (le modèle Doctor n'a pas get_full_name)
            doctor_name = None
            if hasattr(obj.appointment, 'doctor') and obj.appointment.doctor:
                doc = obj.appointment.doctor
                if hasattr(doc, 'user') and doc.user:
                    doctor_name = doc.user.get_full_name()
                elif hasattr(doc, 'get_full_name'):
                    doctor_name = doc.get_full_name()
                else:
                    doctor_name = f"{getattr(doc, 'first_name', '')} {getattr(doc, 'last_name', '')}".strip() or None

            return {
                'id': obj.appointment.id,
                'date': str(obj.appointment.date) if hasattr(obj.appointment, 'date') else None,
                'time': str(obj.appointment.time_slot) if hasattr(obj.appointment, 'time_slot') else None,
                'doctor': doctor_name,
                'status': getattr(obj.appointment, 'status', None),
            }
        return None

    def get_lab_test_info(self, obj):
        if obj.lab_test_request:
            return {
                'id': obj.lab_test_request.id,
                'test_name': getattr(obj.lab_test_request, 'test_name', None),
                'status': getattr(obj.lab_test_request, 'status', None),
            }
        return None


class InvoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une facture (Doctor / Secretary)."""
    class Meta:
        model = Invoice
        fields = [
            'patient', 'appointment', 'lab_test_request',
            'issued_by_cabinet', 'issued_by_lab',
            'subtotal', 'tax_amount', 'discount_amount',
            'cnam_contribution', 'insurance_contribution', 'patient_contribution',
            'due_date', 'status', 'payment_method',
            'notes', 'terms_and_conditions',
        ]
        extra_kwargs = {
            'patient': {'required': False},
            'due_date': {'required': False},
        }

    def validate(self, attrs):
        """Auto-remplir patient depuis appointment + due_date par défaut."""
        appointment = attrs.get('appointment')

        # ── 1) Dériver le patient depuis le rendez-vous ──
        if not attrs.get('patient') and appointment:
            if hasattr(appointment, 'patient') and appointment.patient:
                attrs['patient'] = appointment.patient
            else:
                from apps.appointments.models import Appointment
                appt_id = appointment.pk if hasattr(appointment, 'pk') else appointment
                try:
                    appt = Appointment.objects.select_related('patient').get(pk=appt_id)
                    if appt.patient:
                        attrs['patient'] = appt.patient
                except Appointment.DoesNotExist:
                    pass

        # Vérification finale
        if not attrs.get('patient'):
            raise serializers.ValidationError({
                'patient': 'Le patient est requis. Sélectionnez un rendez-vous valide.'
            })

        # ── 2) Date d'échéance par défaut = 30 jours ──
        if not attrs.get('due_date'):
            attrs['due_date'] = date.today() + timedelta(days=30)

        return attrs

    def validate_due_date(self, value):
        """Vérifier que l'échéance n'est pas dans le passé."""
        if value and value < date.today():
            raise serializers.ValidationError(
                "La date d'échéance ne peut pas être dans le passé."
            )
        return value


class InvoiceUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour mettre à jour une facture."""
    class Meta:
        model = Invoice
        fields = [
            'subtotal', 'tax_amount', 'discount_amount',
            'cnam_contribution', 'insurance_contribution', 'patient_contribution',
            'due_date', 'status', 'payment_method', 'is_validated',
            'notes', 'terms_and_conditions',
        ]

    def validate_status(self, value):
        instance = self.instance
        if instance and instance.is_validated and value == 'draft':
            raise serializers.ValidationError(
                "Impossible de repasser en brouillon après validation."
            )
        return value


class InvoicePaySerializer(serializers.Serializer):
    """Serializer pour enregistrer un paiement sur une facture."""
    amount = serializers.DecimalField(
        max_digits=10, decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))]
    )
    payment_method = serializers.ChoiceField(
        choices=Invoice.PAYMENT_METHOD_CHOICES
    )
    transaction_id = serializers.CharField(
        required=False, allow_blank=True, default=''
    )
    cnam_transaction_number = serializers.CharField(
        required=False, allow_blank=True, default=''
    )
    notes = serializers.CharField(
        required=False, allow_blank=True, default=''
    )

    def validate_amount(self, value):
        invoice = self.context.get('invoice')
        if invoice:
            total_paid = invoice.payments.filter(
                status='completed'
            ).aggregate(s=Sum('amount'))['s'] or Decimal('0')
            remaining = invoice.total_amount - total_paid
            if value > remaining:
                raise serializers.ValidationError(
                    f"Le montant ({value:.3f} TND) dépasse le reste à payer "
                    f"({remaining:.3f} TND)."
                )
        return value
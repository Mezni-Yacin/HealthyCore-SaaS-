# apps/billing/views.py
# ──────────────────────────────────────────────────────────────
# ViewSets Invoice + Payment par rôle — MedSaaS Pro
# ──────────────────────────────────────────────────────────────

# ══════════════════ PATCH PYTHON 3.8 MD5 ══════════════════
# Corrige l'erreur "usedforsecurity is an invalid keyword argument for openssl_md5()"
import hashlib
try:
    hashlib.md5(usedforsecurity=False)
except TypeError:
    _orig_md5 = hashlib.md5
    def _patched_md5(*args, **kwargs):
        kwargs.pop('usedforsecurity', None)
        return _orig_md5(*args, **kwargs)
    hashlib.md5 = _patched_md5
# ══════════════════════════════════════════════════════════

import os
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Sum, Count, Q, DecimalField
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.http import HttpResponse
from django.template.loader import render_to_string
from datetime import date, timedelta
from decimal import Decimal

from .models import Invoice, Payment
from .serializers import (
    InvoiceListSerializer,
    InvoiceDetailSerializer,
    InvoiceCreateSerializer,
    InvoiceUpdateSerializer,
    InvoicePaySerializer,
    PaymentListSerializer,
    PaymentCreateSerializer,
)


# ══════════════════ HELPERS ══════════════════

def _stats_from_qs(qs):
    """Calcule les stats communes à partir d'un queryset Invoice."""
    total = qs.count()
    revenue = float(qs.filter(status='paid').aggregate(
        s=Coalesce(Sum('total_amount'), Decimal('0'), output_field=DecimalField())
    )['s'])
    pending_amount = float(qs.filter(
        status__in=['pending', 'partially_paid']
    ).aggregate(
        s=Coalesce(Sum('total_amount'), Decimal('0'), output_field=DecimalField())
    )['s'])
    overdue_count = qs.filter(status='overdue').count()
    overdue_amount = float(qs.filter(status='overdue').aggregate(
        s=Coalesce(Sum('total_amount'), Decimal('0'), output_field=DecimalField())
    )['s'])
    draft_count = qs.filter(status='draft').count()

    invoice_ids = qs.values_list('id', flat=True)
    payments_total = float(Payment.objects.filter(
        invoice_id__in=invoice_ids, status='completed'
    ).aggregate(
        s=Coalesce(Sum('amount'), Decimal('0'), output_field=DecimalField())
    )['s'])
    cnam = float(qs.aggregate(
        s=Coalesce(Sum('cnam_contribution'), Decimal('0'), output_field=DecimalField())
    )['s'])
    insurance = float(qs.aggregate(
        s=Coalesce(Sum('insurance_contribution'), Decimal('0'), output_field=DecimalField())
    )['s'])

    return {
        'total_invoices': total,
        'total_revenue': revenue,
        'total_pending_amount': pending_amount,
        'overdue_count': overdue_count,
        'overdue_amount': overdue_amount,
        'draft_count': draft_count,
        'total_payments_received': payments_total,
        'cnam_total': cnam,
        'insurance_total': insurance,
    }


def _auto_status(invoice):
    """Met à jour le statut de la facture selon les paiements."""
    paid = float(invoice.payments.filter(status='completed').aggregate(
        s=Sum('amount')
    )['s'] or Decimal('0'))
    total = float(invoice.total_amount)

    if paid >= total and total > 0:
        invoice.status = 'paid'
    elif paid > 0:
        invoice.status = 'partially_paid'
    invoice.save(update_fields=['status'])


def _generate_pdf_response(invoice):
    """Génère et retourne une réponse HTTP avec le PDF de la facture."""
    from xhtml2pdf import pisa

    # Préparer le contexte pour le template
    patient_name = f"{invoice.patient.user.first_name} {invoice.patient.user.last_name}".strip() or invoice.patient.user.username
    doctor_name = "--"
    appointment_date = None
    cabinet_name = "--"
    cabinet_address = "Tunisie"
    cabinet_phone = "--"
    cabinet_matricule = "--"

    if invoice.appointment:
        appointment_date = invoice.appointment.date if hasattr(invoice.appointment, 'date') else None
        if appointment_date:
            from django.utils.formats import localize
            appointment_date = localize(appointment_date)
            
        if hasattr(invoice.appointment, 'doctor') and invoice.appointment.doctor:
            doc = invoice.appointment.doctor
            if hasattr(doc, 'user') and doc.user:
                doctor_name = doc.user.get_full_name()

    if invoice.issued_by_cabinet:
        cabinet = invoice.issued_by_cabinet
        cabinet_name = cabinet.name
        cabinet_address = getattr(cabinet, 'address', 'Tunisie') or 'Tunisie'
        cabinet_phone = getattr(cabinet, 'phone', '--')
        cabinet_matricule = getattr(cabinet, 'matricule_fiscal', '--')

    context = {
        'invoice': invoice,
        'patient_name': patient_name,
        'doctor_name': doctor_name,
        'appointment_date': appointment_date,
        'cabinet_name': cabinet_name,
        'cabinet_address': cabinet_address,
        'cabinet_phone': cabinet_phone,
        'cabinet_matricule': cabinet_matricule,
        'patient_contribution': invoice.patient_contribution if str(invoice.patient_contribution) != '0.000' else None
    }

    # Rendre le HTML
    html_string = render_to_string('billing/invoice_pdf.html', context)

    # Créer la réponse PDF
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Facture_{invoice.invoice_number}.pdf"'
    
    # Générer le PDF
    pisa_status = pisa.CreatePDF(
        html_string, 
        dest=response,
        encoding='utf-8'
    )
    
    if pisa_status.err:
        return HttpResponse('Erreur lors de la génération du PDF', status=500)
        
    return response


# ══════════════════ DOCTOR VIEWSET ══════════════════

class DoctorInvoiceViewSet(viewsets.ViewSet):
    """Factures — vue Médecin."""
    permission_classes = [permissions.IsAuthenticated]

    def _get_cabinets(self, request):
        from apps.cabinets.models import Doctor
        try:
            doctor = Doctor.objects.get(user=request.user)
            return doctor.cabinets.filter(is_deleted=False).values_list('id', flat=True)
        except Doctor.DoesNotExist:
            raise PermissionDenied("Vous n'avez pas de profil médecin.")

    def _get_qs(self, request):
        cabinet_ids = self._get_cabinets(request)
        return Invoice.objects.filter(
            issued_by_cabinet_id__in=cabinet_ids,
            is_deleted=False,
        ).select_related('patient__user', 'issued_by_cabinet').prefetch_related('payments')

    def list(self, request):
        qs = self._get_qs(request)
        status_filter = request.query_params.get('status')
        if status_filter: qs = qs.filter(status=status_filter)
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(Q(invoice_number__icontains=search) | Q(patient__user__first_name__icontains=search) | Q(patient__user__last_name__icontains=search))
        date_from = request.query_params.get('date_from')
        if date_from: qs = qs.filter(issue_date__gte=date_from)
        date_to = request.query_params.get('date_to')
        if date_to: qs = qs.filter(issue_date__lte=date_to)
        qs = qs.order_by('-issue_date')
        page = self.paginate_queryset(qs) if hasattr(self, 'paginate_queryset') else None
        if page is not None:
            serializer = InvoiceListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = InvoiceListSerializer(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        return Response(InvoiceDetailSerializer(invoice).data)

    def create(self, request):
        data = request.data.copy()
        cabinet_ids = list(self._get_cabinets(request))
        if not data.get('issued_by_cabinet') and cabinet_ids: data['issued_by_cabinet'] = cabinet_ids[0]
        if not cabinet_ids: raise PermissionDenied("Aucun cabinet trouvé pour ce médecin.")
        serializer = InvoiceCreateSerializer(data=data, context={'today': date.today(), 'request': request})
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        return Response(InvoiceDetailSerializer(invoice).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        serializer = InvoiceUpdateSerializer(invoice, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(InvoiceDetailSerializer(serializer.save()).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = self._get_qs(request)
        data = _stats_from_qs(qs)
        today = date.today()
        this_month = qs.filter(issue_date__month=today.month, issue_date__year=today.year)
        data['monthly_invoices'] = this_month.count()
        data['monthly_revenue'] = float(this_month.filter(status='paid').aggregate(s=Coalesce(Sum('total_amount'), Decimal('0'), output_field=DecimalField()))['s'])
        return Response(data)

    @action(detail=True, methods=['post'], url_path='validate')
    def validate_invoice(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        invoice.is_validated = True
        if invoice.status == 'draft': invoice.status = 'pending'
        invoice.save(update_fields=['is_validated', 'status'])
        return Response(InvoiceDetailSerializer(invoice).data)

    @action(detail=True, methods=['post'], url_path='pay')
    def pay(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        serializer = InvoicePaySerializer(data=request.data, context={'invoice': invoice})
        serializer.is_valid(raise_exception=True)
        payment = Payment.objects.create(invoice=invoice, amount=serializer.validated_data['amount'], payment_method=serializer.validated_data['payment_method'], transaction_id=serializer.validated_data.get('transaction_id', ''), cnam_transaction_number=serializer.validated_data.get('cnam_transaction_number', ''), notes=serializer.validated_data.get('notes', ''), status='completed')
        _auto_status(invoice)
        return Response({'payment': PaymentListSerializer(payment).data, 'invoice': InvoiceDetailSerializer(invoice).data}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='pdf')
    def generate_pdf(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        return _generate_pdf_response(invoice)


# ══════════════════ SECRETARY VIEWSET ══════════════════

class SecretaryInvoiceViewSet(viewsets.ViewSet):
    """Factures — vue Secrétaire."""
    permission_classes = [permissions.IsAuthenticated]

    def _get_cabinet_ids(self, request):
        from apps.cabinets.models import Cabinet
        return Cabinet.objects.filter(secretaries=request.user, is_deleted=False).values_list('id', flat=True)

    def _get_qs(self, request):
        cabinet_ids = self._get_cabinet_ids(request)
        return Invoice.objects.filter(issued_by_cabinet_id__in=cabinet_ids, is_deleted=False).select_related('patient__user', 'issued_by_cabinet').prefetch_related('payments')

    def list(self, request):
        qs = self._get_qs(request)
        status_filter = request.query_params.get('status')
        if status_filter: qs = qs.filter(status=status_filter)
        search = request.query_params.get('search')
        if search: qs = qs.filter(Q(invoice_number__icontains=search) | Q(patient__user__first_name__icontains=search) | Q(patient__user__last_name__icontains=search))
        date_from = request.query_params.get('date_from')
        if date_from: qs = qs.filter(issue_date__gte=date_from)
        date_to = request.query_params.get('date_to')
        if date_to: qs = qs.filter(issue_date__lte=date_to)
        qs = qs.order_by('-issue_date')
        page = self.paginate_queryset(qs) if hasattr(self, 'paginate_queryset') else None
        if page is not None: return self.get_paginated_response(InvoiceListSerializer(page, many=True).data)
        return Response(InvoiceListSerializer(qs, many=True).data)

    def retrieve(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        return Response(InvoiceDetailSerializer(invoice).data)

    def create(self, request):
        data = request.data.copy()
        cabinet_ids = list(self._get_cabinet_ids(request))
        if not data.get('issued_by_cabinet') and cabinet_ids: data['issued_by_cabinet'] = cabinet_ids[0]
        if not cabinet_ids: raise PermissionDenied("Aucun cabinet trouvé pour cette secrétaire.")
        serializer = InvoiceCreateSerializer(data=data, context={'today': date.today()})
        serializer.is_valid(raise_exception=True)
        return Response(InvoiceDetailSerializer(serializer.save()).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        serializer = InvoiceUpdateSerializer(invoice, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(InvoiceDetailSerializer(serializer.save()).data)

    def destroy(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        invoice.is_deleted = True; invoice.deleted_at = timezone.now(); invoice.save()
        return Response({'detail': 'Facture supprimée.'})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = self._get_qs(request)
        data = _stats_from_qs(qs)
        today = date.today()
        this_month = qs.filter(issue_date__month=today.month, issue_date__year=today.year)
        data['monthly_invoices'] = this_month.count()
        data['monthly_revenue'] = float(this_month.filter(status='paid').aggregate(s=Coalesce(Sum('total_amount'), Decimal('0'), output_field=DecimalField()))['s'])
        return Response(data)

    @action(detail=True, methods=['post'], url_path='validate')
    def validate_invoice(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        invoice.is_validated = True
        if invoice.status == 'draft': invoice.status = 'pending'
        invoice.save(update_fields=['is_validated', 'status'])
        return Response(InvoiceDetailSerializer(invoice).data)

    @action(detail=True, methods=['post'], url_path='pay')
    def pay(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        serializer = InvoicePaySerializer(data=request.data, context={'invoice': invoice})
        serializer.is_valid(raise_exception=True)
        payment = Payment.objects.create(invoice=invoice, amount=serializer.validated_data['amount'], payment_method=serializer.validated_data['payment_method'], transaction_id=serializer.validated_data.get('transaction_id', ''), cnam_transaction_number=serializer.validated_data.get('cnam_transaction_number', ''), notes=serializer.validated_data.get('notes', ''), status='completed')
        _auto_status(invoice)
        return Response({'payment': PaymentListSerializer(payment).data, 'invoice': InvoiceDetailSerializer(invoice).data}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='pdf')
    def generate_pdf(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        return _generate_pdf_response(invoice)


# ══════════════════ PATIENT VIEWSET ══════════════════

class PatientInvoiceViewSet(viewsets.ViewSet):
    """Factures — vue Patient."""
    permission_classes = [permissions.IsAuthenticated]

    def _get_patient(self, request):
        from apps.users.models import Patient
        try: return Patient.objects.get(user=request.user)
        except Patient.DoesNotExist: return None

    def _get_qs(self, request):
        patient = self._get_patient(request)
        if not patient: return Invoice.objects.none()
        return Invoice.objects.filter(patient=patient, is_deleted=False).select_related('patient__user', 'issued_by_cabinet').prefetch_related('payments')

    def list(self, request):
        qs = self._get_qs(request)
        if request.query_params.get('status'): qs = qs.filter(status=request.query_params.get('status'))
        qs = qs.order_by('-issue_date')
        page = self.paginate_queryset(qs) if hasattr(self, 'paginate_queryset') else None
        if page is not None: return self.get_paginated_response(InvoiceListSerializer(page, many=True).data)
        return Response(InvoiceListSerializer(qs, many=True).data)

    def retrieve(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        return Response(InvoiceDetailSerializer(invoice).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = self._get_qs(request)
        if not self._get_patient(request): return Response({'detail': 'Profil patient introuvable.'}, status=404)
        data = _stats_from_qs(qs)
        data['my_total_billed'] = float(qs.aggregate(s=Coalesce(Sum('total_amount'), Decimal('0'), output_field=DecimalField()))['s'])
        data['my_total_paid'] = float(qs.filter(status='paid').aggregate(s=Coalesce(Sum('total_amount'), Decimal('0'), output_field=DecimalField()))['s'])
        data['my_pending_invoices'] = qs.filter(status__in=['pending', 'partially_paid']).count()
        data['my_overdue_invoices'] = qs.filter(status='overdue').count()
        return Response(data)

    @action(detail=True, methods=['get'], url_path='payments')
    def invoice_payments(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        return Response(PaymentListSerializer(invoice.payments.order_by('-payment_date'), many=True).data)

    @action(detail=True, methods=['get'], url_path='pdf')
    def generate_pdf(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        return _generate_pdf_response(invoice)


# ══════════════════ SUPER ADMIN VIEWSET ══════════════════

class SuperAdminInvoiceViewSet(viewsets.ViewSet):
    """Factures — vue Super Admin."""
    permission_classes = [permissions.IsAuthenticated]

    def _get_qs(self, request):
        return Invoice.objects.filter(is_deleted=False).select_related('patient__user', 'issued_by_cabinet', 'issued_by_lab').prefetch_related('payments')

    def list(self, request):
        qs = self._get_qs(request)
        if request.query_params.get('status'): qs = qs.filter(status=request.query_params.get('status'))
        if request.query_params.get('cabinet'): qs = qs.filter(issued_by_cabinet_id=request.query_params.get('cabinet'))
        search = request.query_params.get('search')
        if search: qs = qs.filter(Q(invoice_number__icontains=search) | Q(patient__user__first_name__icontains=search) | Q(patient__user__last_name__icontains=search))
        if request.query_params.get('date_from'): qs = qs.filter(issue_date__gte=request.query_params.get('date_from'))
        if request.query_params.get('date_to'): qs = qs.filter(issue_date__lte=request.query_params.get('date_to'))
        if request.query_params.get('payment_method'): qs = qs.filter(payment_method=request.query_params.get('payment_method'))
        qs = qs.order_by('-issue_date')
        page = self.paginate_queryset(qs) if hasattr(self, 'paginate_queryset') else None
        if page is not None: return self.get_paginated_response(InvoiceListSerializer(page, many=True).data)
        return Response(InvoiceListSerializer(qs, many=True).data)

    def retrieve(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        return Response(InvoiceDetailSerializer(invoice).data)

    def create(self, request):
        serializer = InvoiceCreateSerializer(data=request.data, context={'today': date.today()})
        serializer.is_valid(raise_exception=True)
        return Response(InvoiceDetailSerializer(serializer.save()).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        serializer = InvoiceUpdateSerializer(invoice, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(InvoiceDetailSerializer(serializer.save()).data)

    def destroy(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        invoice.is_deleted = True; invoice.deleted_at = timezone.now(); invoice.save()
        return Response({'detail': 'Facture supprimée.'})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = self._get_qs(request)
        data = _stats_from_qs(qs)
        today = date.today()
        this_month = qs.filter(issue_date__month=today.month, issue_date__year=today.year)
        data['monthly_invoices'] = this_month.count()
        data['monthly_revenue'] = float(this_month.filter(status='paid').aggregate(s=Coalesce(Sum('total_amount'), Decimal('0'), output_field=DecimalField()))['s'])
        from apps.cabinets.models import Cabinet
        data['top_cabinets'] = list(qs.filter(status='paid').values('issued_by_cabinet__id', 'issued_by_cabinet__name').annotate(total=Coalesce(Sum('total_amount'), Decimal('0'), output_field=DecimalField()), count=Count('id')).order_by('-total')[:10])
        data['by_payment_method'] = list(qs.values('payment_method').annotate(total=Coalesce(Sum('total_amount'), Decimal('0'), output_field=DecimalField()), count=Count('id')).order_by('-total'))
        data['overdue_total'] = float(qs.filter(due_date__lt=today).exclude(status='paid').aggregate(s=Coalesce(Sum('total_amount'), Decimal('0'), output_field=DecimalField()))['s'])
        return Response(data)

    @action(detail=True, methods=['post'], url_path='validate')
    def validate_invoice(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        invoice.is_validated = True
        if invoice.status == 'draft': invoice.status = 'pending'
        invoice.save(update_fields=['is_validated', 'status'])
        return Response(InvoiceDetailSerializer(invoice).data)

    @action(detail=True, methods=['post'], url_path='pay')
    def pay(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        serializer = InvoicePaySerializer(data=request.data, context={'invoice': invoice})
        serializer.is_valid(raise_exception=True)
        payment = Payment.objects.create(invoice=invoice, amount=serializer.validated_data['amount'], payment_method=serializer.validated_data['payment_method'], transaction_id=serializer.validated_data.get('transaction_id', ''), cnam_transaction_number=serializer.validated_data.get('cnam_transaction_number', ''), notes=serializer.validated_data.get('notes', ''), status='completed')
        _auto_status(invoice)
        return Response({'payment': PaymentListSerializer(payment).data, 'invoice': InvoiceDetailSerializer(invoice).data}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='pdf')
    def generate_pdf(self, request, pk=None):
        qs = self._get_qs(request)
        try: invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist: return Response({'detail': 'Facture introuvable.'}, status=404)
        return _generate_pdf_response(invoice)

    @action(detail=False, methods=['get'], url_path='overdue')
    def overdue_list(self, request):
        today = date.today()
        qs = self._get_qs(request).filter(due_date__lt=today).exclude(status__in=['paid', 'cancelled'])
        return Response(InvoiceListSerializer(qs, many=True).data)
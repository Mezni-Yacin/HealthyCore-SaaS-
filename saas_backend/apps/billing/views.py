# apps/billing/views.py

# ══════════════════ PATCH PYTHON 3.8 MD5 ══════════════════
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
import stripe
import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.views import APIView  # ✅ NOUVEAU
from django.db.models import Sum, Count, Q, DecimalField
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.http import HttpResponse, JsonResponse  # ✅ NOUVEAU
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt  # ✅ NOUVEAU
from django.utils.decorators import method_decorator  # ✅ NOUVEAU
from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings  # ✅ NOUVEAU

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

# ✅ CONFIGURATION STRIPE
stripe.api_key = settings.STRIPE_SECRET_KEY

# ✅ LOGGER POUR STRIPE
logger = logging.getLogger(__name__)


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

    html_string = render_to_string('billing/invoice_pdf.html', context)

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Facture_{invoice.invoice_number}.pdf"'
    
    pisa_status = pisa.CreatePDF(
        html_string, 
        dest=response,
        encoding='utf-8'
    )
    
    if pisa_status.err:
        return HttpResponse('Erreur lors de la génération du PDF', status=500)
        
    return response


# ══════════════════ STRIPE WEBHOOK VIEW ══════════════════

@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    Webhook pour recevoir les événements Stripe.
    IMPORTANT: Cette vue NE DOIT PAS avoir d'authentification.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            logger.error(f"Stripe webhook - Payload invalide: {e}")
            return JsonResponse({'error': 'Payload invalide'}, status=400)
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Stripe webhook - Signature invalide: {e}")
            return JsonResponse({'error': 'Signature invalide'}, status=400)

        # Traiter l'événement
        try:
            if event['type'] == 'checkout.session.completed':
                self._handle_checkout_completed(event['data']['object'])
            
            elif event['type'] == 'payment_intent.succeeded':
                self._handle_payment_intent_succeeded(event['data']['object'])
            
            elif event['type'] == 'payment_intent.payment_failed':
                self._handle_payment_failed(event['data']['object'])
            
            elif event['type'] == 'charge.refunded':
                self._handle_refund(event['data']['object'])
            
            else:
                logger.info(f"Stripe webhook - Événement non traité: {event['type']}")

        except Exception as e:
            logger.error(f"Stripe webhook - Erreur de traitement: {e}")
            return JsonResponse({'error': 'Erreur de traitement'}, status=500)

        return JsonResponse({'status': 'success'}, status=200)

    def _handle_checkout_completed(self, session):
        """Traite un checkout complété."""
        checkout_session_id = session.get('id')
        payment_intent_id = session.get('payment_intent')
        
        logger.info(f"Stripe checkout completed: {checkout_session_id}")
        
        # Trouver le paiement par session ID
        try:
            payment = Payment.objects.get(
                stripe_checkout_session_id=checkout_session_id
            )
            payment.stripe_payment_intent_id = payment_intent_id
            payment.transaction_id = payment_intent_id
            payment.status = 'completed'
            payment.save(update_fields=[
                'stripe_payment_intent_id', 
                'transaction_id', 
                'status'
            ])
            
            # Mettre à jour le statut de la facture
            _auto_status(payment.invoice)
            
            logger.info(f"Paiement {payment.id} marqué comme complété")
            
        except Payment.DoesNotExist:
            logger.error(f"Paiement non trouvé pour checkout session: {checkout_session_id}")

    def _handle_payment_intent_succeeded(self, payment_intent):
        """Traite un payment intent réussi."""
        intent_id = payment_intent.get('id')
        
        logger.info(f"Stripe payment intent succeeded: {intent_id}")
        
        try:
            payment = Payment.objects.get(
                stripe_payment_intent_id=intent_id
            )
            payment.transaction_id = intent_id
            payment.status = 'completed'
            payment.save(update_fields=['transaction_id', 'status'])
            
            _auto_status(payment.invoice)
            
        except Payment.DoesNotExist:
            # Peut arriver si le checkout a déjà été traité
            logger.info(f"Paiement déjà traité ou non trouvé pour intent: {intent_id}")

    def _handle_payment_failed(self, payment_intent):
        """Traite un paiement échoué."""
        intent_id = payment_intent.get('id')
        
        logger.warning(f"Stripe payment failed: {intent_id}")
        
        try:
            payment = Payment.objects.get(
                stripe_payment_intent_id=intent_id
            )
            payment.status = 'failed'
            payment.notes = (payment.notes or '') + f"\n[Paiement Stripe échoué le {timezone.now().strftime('%Y-%m-%d %H:%M')}]"
            payment.save(update_fields=['status', 'notes'])
            
        except Payment.DoesNotExist:
            logger.error(f"Paiement non trouvé pour intent échoué: {intent_id}")

    def _handle_refund(self, charge):
        """Traite un remboursement."""
        payment_intent_id = charge.get('payment_intent')
        
        logger.info(f"Stripe refund: {payment_intent_id}")
        
        try:
            payment = Payment.objects.get(
                stripe_payment_intent_id=payment_intent_id
            )
            payment.status = 'refunded'
            payment.notes = (payment.notes or '') + f"\n[Remboursé le {timezone.now().strftime('%Y-%m-%d %H:%M')}]"
            payment.save(update_fields=['status', 'notes'])
            
            # Mettre à jour la facture (repasse en partially_paid ou pending)
            invoice = payment.invoice
            paid = float(invoice.payments.filter(status='completed').aggregate(
                s=Sum('amount')
            )['s'] or Decimal('0'))
            total = float(invoice.total_amount)
            
            if paid <= 0:
                invoice.status = 'pending'
            else:
                invoice.status = 'partially_paid'
            invoice.save(update_fields=['status'])
            
        except Payment.DoesNotExist:
            logger.error(f"Paiement non trouvé pour remboursement: {payment_intent_id}")


# ══════════════════ PATIENT VIEWSET (AVEC STRIPE) ══════════════════

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
        
        # ✅ Ajouter le total restant
        total_billed = data['my_total_billed']
        total_paid = data['my_total_paid']
        data['total_remaining'] = max(total_billed - total_paid, 0)
        
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

    # ═══════════════════════════════════════════════════════════════
    # ✅ NOUVELLE ACTION : PAYER AVEC STRIPE
    # ═══════════════════════════════════════════════════════════════
    @action(detail=True, methods=['post'], url_path='pay-stripe')
    def pay_with_stripe(self, request, pk=None):
        """
        Crée une session Checkout Stripe pour payer la facture.
        
        POST /billing/patient/invoices/<pk>/pay-stripe/
        Body optionnel: { "amount": 50.000 }  # Si paiement partiel
        """
        qs = self._get_qs(request)
        
        try:
            invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({'detail': 'Facture introuvable.'}, status=404)
        
        # Vérifier que la facture est valide pour le paiement
        if invoice.status == 'paid':
            return Response({
                'error': 'Cette facture est déjà payée intégralement.'
            }, status=400)
        
        if invoice.status == 'cancelled':
            return Response({
                'error': 'Cette facture est annulée.'
            }, status=400)
        
        if not invoice.is_validated:
            return Response({
                'error': 'Cette facture n\'est pas encore validée.'
            }, status=400)
        
        # Calculer le montant restant
        total_paid = float(invoice.payments.filter(status='completed').aggregate(
            s=Sum('amount')
        )['s'] or Decimal('0'))
        remaining = float(invoice.total_amount) - total_paid
        
        if remaining <= 0:
            return Response({
                'error': 'Aucun montant restant à payer.'
            }, status=400)
        
        # Déterminer le montant à payer (total ou partiel)
        requested_amount = request.data.get('amount')
        if requested_amount:
            try:
                amount_to_pay = float(requested_amount)
            except (ValueError, TypeError):
                return Response({'error': 'Montant invalide.'}, status=400)
            
            if amount_to_pay <= 0:
                return Response({'error': 'Le montant doit être positif.'}, status=400)
            
            if amount_to_pay > remaining:
                return Response({
                    'error': f'Le montant demandé ({amount_to_pay:.3f} TND) dépasse le reste à payer ({remaining:.3f} TND).'
                }, status=400)
        else:
            amount_to_pay = remaining  # Paiement intégral par défaut
        
        # ✅ Vérifier s'il y a déjà un paiement Stripe en attente pour cette facture
        pending_stripe_payment = Payment.objects.filter(
            invoice=invoice,
            payment_method='online',
            status='pending',
            stripe_checkout_session_id__isnull=False
        ).first()
        
        if pending_stripe_payment:
            # Vérifier si la session est encore valide
            try:
                session = stripe.checkout.Session.retrieve(
                    pending_stripe_payment.stripe_checkout_session_id
                )
                
                if session.status == 'open':
                    # La session est encore valide, retourner l'URL
                    return Response({
                        'checkout_url': session.url,
                        'payment_id': pending_stripe_payment.id,
                        'amount': float(pending_stripe_payment.amount),
                        'message': 'Une session de paiement est déjà en cours.'
                    })
                else:
                    # La session a expiré, la marquer comme échouée
                    pending_stripe_payment.status = 'failed'
                    pending_stripe_payment.notes = (pending_stripe_payment.notes or '') + '\n[Session expirée]'
                    pending_stripe_payment.save(update_fields=['status', 'notes'])
            except stripe.error.StripeError as e:
                logger.error(f"Erreur Stripe lors de la vérification de session: {e}")
                # Continuer avec la création d'une nouvelle session
        
        # ✅ Convertir le montant en centimes (Stripe utilise les plus petites unités)
        # Pour TND, on utilise 1000 comme multiplicateur car 3 décimales
        amount_cents = int(round(amount_to_pay * 1000))
        
        if amount_cents < 50:  # Minimum Stripe (équivalent à 0.050 TND)
            return Response({
                'error': 'Le montant est trop petit pour un paiement en ligne (minimum 0.050 TND).'
            }, status=400)
        
        # ✅ Préparer les métadonnées
        patient = invoice.patient
        patient_email = patient.user.email if patient and patient.user else None
        patient_name = f"{patient.user.first_name} {patient.user.last_name}".strip() if patient and patient.user else 'Patient'
        
        cabinet_name = invoice.issued_by_cabinet.name if invoice.issued_by_cabinet else 'Cabinet Médical'
        
        try:
            # ✅ Créer la session Checkout Stripe
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': settings.STRIPE_CURRENCY,
                        'unit_amount': amount_cents,
                        'product_data': {
                            'name': f'Facture {invoice.invoice_number}',
                            'description': f'Paiement - {cabinet_name}',
                            'metadata': {
                                'invoice_id': str(invoice.id),
                                'invoice_number': invoice.invoice_number,
                                'patient_name': patient_name,
                            }
                        }
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f"{settings.STRIPE_SUCCESS_URL}?session_id={{CHECKOUT_SESSION_ID}}&invoice={invoice.id}",
                cancel_url=f"{settings.STRIPE_CANCEL_URL}?invoice={invoice.id}",
                customer_email=patient_email,
                metadata={
                    'invoice_id': str(invoice.id),
                    'invoice_number': invoice.invoice_number,
                    'patient_id': str(patient.id) if patient else '',
                    'amount_tnd': str(amount_to_pay),
                },
                # Options de locale pour le français
                locale='fr',
            )
            
            # ✅ Créer le paiement en base (statut pending)
            payment = Payment.objects.create(
                invoice=invoice,
                amount=Decimal(str(amount_to_pay)),
                payment_method='online',
                transaction_id='',  # Sera rempli par le webhook
                status='pending',
                notes=f'Session Stripe créée le {timezone.now().strftime("%Y-%m-%d %H:%M")}',
                stripe_checkout_session_id=checkout_session.id,
                stripe_payment_intent_id=checkout_session.payment_intent,
                stripe_customer_email=patient_email,
            )
            
            logger.info(f"Session Stripe créée: {checkout_session.id} pour facture {invoice.invoice_number}")
            
            return Response({
                'checkout_url': checkout_session.url,
                'payment_id': payment.id,
                'amount': amount_to_pay,
                'currency': settings.STRIPE_CURRENCY,
                'message': 'Session de paiement créée avec succès.'
            })
            
        except stripe.error.StripeError as e:
            logger.error(f"Erreur Stripe lors de la création de session: {e}")
            return Response({
                'error': f'Erreur lors de la création du paiement: {str(e)}'
            }, status=500)
        except Exception as e:
            logger.error(f"Erreur inattendue lors de la création Stripe: {e}")
            return Response({
                'error': 'Une erreur inattendue est survenue.'
            }, status=500)

    # ═══════════════════════════════════════════════════════════════
    # ✅ ACTION : VÉRIFIER LE STATUT STRIPE (AVEC FALLBACK)
    # ═══════════════════════════════════════════════════════════════
    @action(detail=True, methods=['get'], url_path='stripe-status')
    def check_stripe_status(self, request, pk=None):
        """
        Vérifie le statut d'un paiement Stripe après redirection.
        Si le webhook n'a pas encore mis à jour la DB, on le fait manuellement ici.
        """
        session_id = request.query_params.get('session_id')
        
        if not session_id:
            return Response({'error': 'session_id est requis.'}, status=400)
        
        qs = self._get_qs(request)
        try:
            invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({'detail': 'Facture introuvable.'}, status=404)
        
        try:
            payment = Payment.objects.get(
                stripe_checkout_session_id=session_id,
                invoice=invoice
            )
        except Payment.DoesNotExist:
            return Response({'error': 'Paiement non trouvé pour cette session.'}, status=404)
        
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            
            # ✅ FALLBACK : Si Stripe indique "paid" mais que notre DB est encore "pending"
            if session.payment_status == 'paid' and payment.status != 'completed':
                payment.status = 'completed'
                payment.stripe_payment_intent_id = session.payment_intent
                payment.transaction_id = session.payment_intent
                payment.save(update_fields=['status', 'stripe_payment_intent_id', 'transaction_id'])
                
                # Mettre à jour le statut de la facture
                _auto_status(invoice)
                invoice.refresh_from_db()  # Recharger la facture avec le nouveau statut
                logger.info(f"[Fallback] Facture {invoice.id} mise à jour à 'paid' via check_stripe_status")
            
            return Response({
                'payment_status': payment.status,
                'stripe_status': session.status,
                'payment': PaymentListSerializer(payment).data,
                'invoice': InvoiceListSerializer(invoice).data,
                'is_completed': payment.status == 'completed',
            })
            
        except stripe.error.StripeError as e:
            logger.error(f"Erreur Stripe vérification statut: {e}")
            return Response({
                'payment_status': payment.status,
                'error': 'Impossible de vérifier le statut auprès de Stripe.',
                'is_completed': payment.status == 'completed',
            })
    # ═══════════════════════════════════════════════════════════════
    # ✅ NOUVELLE ACTION : VÉRIFIER MANUELLEMENT LES PAIEMENTS EN ATTENTE
    # ═══════════════════════════════════════════════════════════════
    @action(detail=True, methods=['post'], url_path='verify-payments')
    def verify_payments(self, request, pk=None):
        """
        Vérifie manuellement auprès de Stripe si des paiements en attente ont été complétés.
        Utile si le webhook Stripe ne fonctionne pas en local.
        """
        qs = self._get_qs(request)
        try:
            invoice = qs.get(pk=pk)
        except Invoice.DoesNotExist:
            return Response({'detail': 'Facture introuvable.'}, status=404)
        
        # Chercher tous les paiements en attente avec un ID de session Stripe
        pending_payments = invoice.payments.filter(
            status='pending',
            payment_method='online',
            stripe_checkout_session_id__isnull=False
        )
        
        updated = False
        for payment in pending_payments:
            try:
                session = stripe.checkout.Session.retrieve(payment.stripe_checkout_session_id)
                
                # Si Stripe dit que c'est payé, on met à jour notre base de données
                if session.payment_status == 'paid' and payment.status != 'completed':
                    payment.status = 'completed'
                    payment.stripe_payment_intent_id = session.payment_intent
                    payment.transaction_id = session.payment_intent
                    payment.save(update_fields=['status', 'stripe_payment_intent_id', 'transaction_id'])
                    updated = True
                    logger.info(f"[Verify] Paiement {payment.id} mis à jour à 'completed'")
            except stripe.error.StripeError as e:
                logger.error(f"Erreur Stripe verify_payments: {e}")
        
        # Si au moins un paiement a été mis à jour, on recalcule le statut de la facture
        if updated:
            _auto_status(invoice)
            invoice.refresh_from_db()
            
        return Response({
            'updated': updated,
            'invoice': InvoiceDetailSerializer(invoice).data
        })
# ══════════════════ DOCTOR VIEWSET ══════════════════
# (reste identique à ton code original)
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
# (reste identique à ton code original)
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


# ══════════════════ SUPER ADMIN VIEWSET ══════════════════
# (reste identique à ton code original)
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
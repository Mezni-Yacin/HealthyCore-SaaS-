from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from decimal import Decimal
from datetime import date

from .models import Pharmacy, Medication, PharmacyStock, Prescription, Dispensation, DispensationItem
from .serializers import (
    PharmacySerializer, MedicationSerializer, PharmacyStockSerializer, PharmacyStockCreateSerializer,
    PrescriptionSerializer, PrescriptionCreateSerializer,
    DispensationSerializer, DispensationCreateSerializer
)

# ══════════════════ HELPERS ══════════════════
def _get_pharmacy(request):
    try:
        return Pharmacy.objects.get(owner=request.user, is_deleted=False)
    except Pharmacy.DoesNotExist:
        raise PermissionDenied("Profil pharmacie introuvable.")

def _get_doctor(request):
    try:
        return request.user.doctor_profile
    except:
        raise PermissionDenied("Profil médecin introuvable.")

def _get_patient(request):
    try:
        return request.user.patient_profile
    except:
        return None

# ══════════════════ PHARMACIEN ══════════════════
class PharmacistViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    # --- Villes ---
    @action(detail=False, methods=['get'], url_path='cities')
    def list_cities(self, request):
        from apps.users.models import City
        cities = City.objects.all().order_by('name')
        return Response([{'id': c.id, 'name': c.name} for c in cities])

    # --- Création de pharmacie ---
    @action(detail=False, methods=['post'], url_path='create-pharmacy')
    def create_pharmacy(self, request):
        user = request.user
        if Pharmacy.objects.filter(owner=user, is_deleted=False).exists():
            return Response({'detail': 'Vous avez déjà une pharmacie.'}, status=400)
        
        data = request.data.copy()
        phone = str(data.get('phone_number', ''))
        if phone and not phone.startswith('+'):
            clean_phone = ''.join(filter(str.isdigit, phone))
            if clean_phone.startswith('216'):
                data['phone_number'] = f'+{clean_phone}'
            else:
                data['phone_number'] = f'+216{clean_phone}'

        s = PharmacySerializer(data=data)
        s.is_valid(raise_exception=True)
        pharmacy = s.save(owner=user)
        return Response(PharmacySerializer(pharmacy).data, status=201)

    # --- Pharmacie Profile ---
    @action(detail=False, methods=['get', 'patch'], url_path='my-pharmacy')
    def my_pharmacy(self, request):
        pharmacy = _get_pharmacy(request)
        if request.method == 'PATCH':
            s = PharmacySerializer(pharmacy, data=request.data, partial=True)
            s.is_valid(raise_exception=True)
            s.save()
            return Response(s.data)
        return Response(PharmacySerializer(pharmacy).data)

    # --- Catalogue Médicaments (Global) ---
    @action(detail=False, methods=['get', 'post'], url_path='medications')
    def medications_manage(self, request):
        if request.method == 'POST':
            s = MedicationSerializer(data=request.data)
            s.is_valid(raise_exception=True)
            s.save()
            return Response(s.data, status=201)
        
        qs = Medication.objects.all().order_by('name')
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return Response(MedicationSerializer(qs, many=True).data)

    # --- Stock Management ---
    @action(detail=False, methods=['get', 'post'], url_path='stock')
    def stock_manage(self, request):
        pharmacy = _get_pharmacy(request)
        if request.method == 'POST':
            s = PharmacyStockCreateSerializer(data=request.data)
            s.is_valid(raise_exception=True)
            med = s.validated_data['medication']
            obj, created = PharmacyStock.objects.update_or_create(
                pharmacy=pharmacy, medication=med,
                defaults={
                    'quantity': s.validated_data.get('quantity', 0),
                    'buying_price': s.validated_data.get('buying_price', 0),
                    'selling_price': s.validated_data['selling_price'],
                    'batch_number': s.validated_data.get('batch_number'),
                    'expiry_date': s.validated_data['expiry_date']
                }
            )
            return Response(PharmacyStockSerializer(obj).data, status=201)
        else:
            qs = PharmacyStock.objects.filter(pharmacy=pharmacy).select_related('medication')
            return Response(PharmacyStockSerializer(qs, many=True).data)

    @action(detail=True, methods=['patch', 'delete'], url_path='stock-item')
    def stock_item_manage(self, request, pk=None):
        pharmacy = _get_pharmacy(request)
        try:
            item = PharmacyStock.objects.get(pk=pk, pharmacy=pharmacy)
        except PharmacyStock.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
            
        if request.method == 'DELETE':
            item.delete()
            return Response({'detail': 'Supprimé du stock.'})
        else:
            s = PharmacyStockCreateSerializer(item, data=request.data, partial=True)
            s.is_valid(raise_exception=True)
            s.save()
            return Response(PharmacyStockSerializer(item).data)

    # --- Ordonnances entrantes ---
    @action(detail=False, methods=['get'], url_path='prescriptions')
    def list_prescriptions(self, request):
        qs = Prescription.objects.filter(status__in=['pending', 'partially_dispensed']).select_related('patient__user', 'doctor__user').prefetch_related('items')
        return Response(PrescriptionSerializer(qs, many=True).data)

    # --- Ventes (Dispensations) ---
    @action(detail=False, methods=['get'], url_path='sales')
    def list_sales(self, request):
        pharmacy = _get_pharmacy(request)
        qs = Dispensation.objects.filter(pharmacy=pharmacy).select_related('patient__user').prefetch_related('items').order_by('-dispensation_date')
        return Response(DispensationSerializer(qs, many=True).data)

    @action(detail=False, methods=['post'], url_path='create-sale')
    def create_sale(self, request):
        pharmacy = _get_pharmacy(request)
        s = DispensationCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        
        data = s.validated_data
        total_amount = Decimal('0.000')
        
        with transaction.atomic():
            dispensation = Dispensation.objects.create(
                pharmacy=pharmacy,
                pharmacist=request.user,
                patient_id=data.get('patient_id'),
                prescription_id=data.get('prescription_id'),
                payment_method=data['payment_method'],
                payment_status='paid'
            )
            
            for item_data in data['items']:
                med_id = item_data.get('medication_id')
                qty = int(item_data.get('quantity'))
                price = Decimal(str(item_data.get('unit_price')))
                
                try:
                    stock = PharmacyStock.objects.get(pharmacy=pharmacy, medication_id=med_id)
                    if stock.quantity < qty:
                        raise ValueError(f"Stock insuffisant pour {stock.medication.name}")
                    stock.quantity -= qty
                    stock.save(update_fields=['quantity'])
                except PharmacyStock.DoesNotExist:
                    raise ValueError("Médicament non en stock.")
                
                total_amount += (price * qty)
                DispensationItem.objects.create(
                    dispensation=dispensation,
                    medication_id=med_id,
                    quantity=qty,
                    unit_price=price,
                    stock_item=stock
                )
            
            dispensation.total_amount = total_amount
            dispensation.save()
            
            if dispensation.prescription:
                dispensation.prescription.status = 'dispensed'
                dispensation.prescription.save()

        return Response(DispensationSerializer(dispensation).data, status=201)

    # --- Dashboard Stats ---
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        pharmacy = _get_pharmacy(request)
        today = date.today()
        sales = Dispensation.objects.filter(pharmacy=pharmacy, payment_status='paid')
        
        return Response({
            'today_sales_count': sales.filter(dispensation_date__date=today).count(),
            'today_revenue': float(sales.filter(dispensation_date__date=today).aggregate(t=Sum('total_amount'))['t'] or 0),
            'total_revenue': float(sales.aggregate(t=Sum('total_amount'))['t'] or 0),
            'pending_prescriptions': Prescription.objects.filter(status='pending').count(),
            'low_stock_items': PharmacyStock.objects.filter(pharmacy=pharmacy, quantity__lte=10).count(),
        })

# ══════════════════ MÉDECIN ══════════════════
class DoctorPrescriptionViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='patients')
    def list_patients(self, request):
        from apps.users.models import Patient
        qs = Patient.objects.select_related('user').all()
        data = [{'id': p.id, 'name': f"{p.user.first_name} {p.user.last_name}".strip() or p.user.username} for p in qs]
        return Response(data)

    def list(self, request):
        doctor = _get_doctor(request)
        qs = Prescription.objects.filter(doctor=doctor).select_related('patient__user').prefetch_related('items').order_by('-prescription_date')
        return Response(PrescriptionSerializer(qs, many=True).data)

    def create(self, request):
        doctor = _get_doctor(request)
        s = PrescriptionCreateSerializer(data=request.data, context={'request': request})
        s.is_valid(raise_exception=True)
        prescription = s.save(doctor=doctor)
        return Response(PrescriptionSerializer(prescription).data, status=201)

# ══════════════════ PATIENT ══════════════════
class PatientPharmacyViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='my-prescriptions')
    def my_prescriptions(self, request):
        patient = _get_patient(request)
        if not patient: return Response([])
        qs = Prescription.objects.filter(patient=patient).prefetch_related('items').order_by('-prescription_date')
        return Response(PrescriptionSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'], url_path='my-purchases')
    def my_purchases(self, request):
        patient = _get_patient(request)
        if not patient: return Response([])
        qs = Dispensation.objects.filter(patient=patient).prefetch_related('items').order_by('-dispensation_date')
        return Response(DispensationSerializer(qs, many=True).data)

# ══════════════════ ANNUAIRE PUBLIC ══════════════════
class PublicPharmacyViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        qs = Pharmacy.objects.filter(is_active=True, is_deleted=False).select_related('city')
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        city = request.query_params.get('city')
        if city:
            qs = qs.filter(city_id=city)
        on_duty = request.query_params.get('on_duty')
        if on_duty == 'true':
            qs = qs.filter(is_on_duty=True)
        return Response(PharmacySerializer(qs, many=True).data)

    # ✅ NOUVELLE MÉTHODE POUR VOIR LE DÉTAIL D'UNE PHARMACIE
    def retrieve(self, request, pk=None):
        try:
            pharma = Pharmacy.objects.get(pk=pk, is_active=True, is_deleted=False)
            return Response(PharmacySerializer(pharma).data)
        except Pharmacy.DoesNotExist:
            return Response({'detail': 'Pharmacie introuvable.'}, status=404)
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Sum, Count, Q, DecimalField
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

from .models import Laboratory, LabTestType, LabTestRequest, LabResult
from .serializers import (
    LabTestTypeListSerializer, LabTestTypeDetailSerializer, LabTestTypeCreateUpdateSerializer,
    LaboratoryListSerializer, LaboratoryDetailSerializer, LaboratoryCreateUpdateSerializer,
    LabTestRequestListSerializer, LabTestRequestDetailSerializer, LabTestRequestCreateSerializer, LabStatusUpdateSerializer,
    LabResultListSerializer, LabResultDetailSerializer, LabResultCreateUpdateSerializer
)

# ══════════════════ HELPERS ══════════════════
def _get_doctor(request):
    from apps.cabinets.models import Doctor
    try:
        return Doctor.objects.get(user=request.user)
    except Doctor.DoesNotExist:
        raise PermissionDenied("Profil médecin introuvable.")

def _get_lab_for_staff(request):
    lab = Laboratory.objects.filter(Q(owner=request.user) | Q(secretaries=request.user), is_deleted=False, is_active=True).first()
    if not lab:
        raise PermissionDenied("Aucun laboratoire assigné.")
    return lab

def _get_patient(request):
    from apps.users.models import Patient
    try:
        return Patient.objects.get(user=request.user)
    except Patient.DoesNotExist:
        return None

def _get_city_model():
    return Laboratory._meta.get_field('city').related_model

def _base_request_qs():
    return LabTestRequest.objects.filter(is_deleted=False).select_related('patient__user', 'doctor__user', 'laboratory').prefetch_related('tests')


# ══════════════════ DOCTOR ══════════════════
class DoctorLabViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def catalog_list(self, request):
        qs = LabTestType.objects.all().order_by('category', 'name')
        s = request.query_params.get('search')
        if s:
            qs = qs.filter(Q(name__icontains=s) | Q(code__icontains=s))
        c = request.query_params.get('category')
        if c:
            qs = qs.filter(category=c)
        return Response(LabTestTypeListSerializer(qs, many=True).data)

    def catalog_detail(self, request, pk=None):
        try:
            t = LabTestType.objects.get(pk=pk)
        except LabTestType.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        return Response(LabTestTypeDetailSerializer(t).data)

    def labs_list(self, request):
        qs = Laboratory.objects.filter(is_deleted=False, is_active=True).select_related('city')
        return Response(LaboratoryListSerializer(qs, many=True).data)

    def requests_list(self, request):
        qs = _base_request_qs().filter(doctor=_get_doctor(request))
        st = request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        return Response(LabTestRequestListSerializer(qs.order_by('-request_date'), many=True).data)

    def requests_create(self, request):
        serializer = LabTestRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        req = serializer.save(doctor=_get_doctor(request))
        return Response(LabTestRequestDetailSerializer(req).data, status=201)

    def requests_retrieve(self, request, pk=None):
        try:
            req = _base_request_qs().filter(doctor=_get_doctor(request), pk=pk).get()
        except LabTestRequest.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        return Response(LabTestRequestDetailSerializer(req).data)

    def request_result(self, request, pk=None):
        try:
            req = _base_request_qs().filter(doctor=_get_doctor(request), pk=pk).get()
        except LabTestRequest.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        try:
            if req.result.is_deleted:
                return Response({'detail': 'Supprimé.'}, status=404)
            return Response(LabResultDetailSerializer(req.result).data)
        except LabResult.DoesNotExist:
            return Response({'detail': 'Résultat non disponible.'}, status=404)


# ══════════════════ LAB STAFF ══════════════════
class LabStaffLabViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def _get_qs(self, request):
        return _base_request_qs().filter(laboratory=_get_lab_for_staff(request))

    @action(detail=False, methods=['get'], url_path='cities')
    def cities_list(self, request):
        CityModel = _get_city_model()
        cities = CityModel.objects.all().order_by('name')
        data = [{'id': c.id, 'name': c.name} for c in cities]
        return Response(data)

    @action(detail=False, methods=['post'], url_path='create-lab')
    def create_my_lab(self, request):
        if Laboratory.objects.filter(Q(owner=request.user) | Q(secretaries=request.user), is_deleted=False).first():
            return Response({'detail': 'Vous avez déjà un laboratoire.'}, status=400)
        s = LaboratoryCreateUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(LaboratoryDetailSerializer(s.save(owner=request.user)).data, status=201)

    @action(detail=False, methods=['get'], url_path='my-lab')
    def my_lab_detail(self, request):
        lab = Laboratory.objects.filter(
            Q(owner=request.user) | Q(secretaries=request.user),
            is_deleted=False, is_active=True
        ).first()
        if not lab:
            return Response({'detail': 'Aucun laboratoire trouvé.'}, status=404)
        return Response(LaboratoryDetailSerializer(lab).data)

    @action(detail=False, methods=['patch'], url_path='my-lab')
    def my_lab_update(self, request):
        lab = _get_lab_for_staff(request)
        s = LaboratoryCreateUpdateSerializer(lab, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(LaboratoryDetailSerializer(s.save()).data)

    def tests_list(self, request):
        return Response(LabTestTypeListSerializer(LabTestType.objects.all().order_by('category'), many=True).data)

    def tests_create(self, request):
        s = LabTestTypeCreateUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(LabTestTypeDetailSerializer(s.save()).data, status=201)

    def tests_retrieve(self, request, pk=None):
        try:
            return Response(LabTestTypeDetailSerializer(LabTestType.objects.get(pk=pk)).data)
        except LabTestType.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)

    def tests_update(self, request, pk=None):
        try:
            t = LabTestType.objects.get(pk=pk)
        except LabTestType.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        s = LabTestTypeCreateUpdateSerializer(t, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(LabTestTypeDetailSerializer(s.save()).data)

    def tests_destroy(self, request, pk=None):
        try:
            LabTestType.objects.get(pk=pk).delete()
        except LabTestType.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        return Response({'detail': 'Supprimé.'})

    def requests_list(self, request):
        qs = self._get_qs(request)
        st = request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        return Response(LabTestRequestListSerializer(qs.order_by('-request_date'), many=True).data)

    def requests_retrieve(self, request, pk=None):
        try:
            return Response(LabTestRequestDetailSerializer(self._get_qs(request).get(pk=pk)).data)
        except LabTestRequest.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        try:
            req = self._get_qs(request).get(pk=pk)
        except LabTestRequest.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        s = LabStatusUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        ns = s.validated_data['status']
        valid = {
            'requested': ['sample_collected', 'cancelled'],
            'sample_collected': ['in_progress', 'cancelled'],
            'in_progress': ['completed', 'cancelled']
        }
        if ns not in valid.get(req.status, []):
            return Response({'detail': 'Transition invalide.'}, status=400)
        req.status = ns
        if ns == 'sample_collected' and not req.sample_collected_at:
            req.sample_collected_at = timezone.now()
            req.sample_collected_by = request.user
        req.save()
        return Response(LabTestRequestDetailSerializer(req).data)

    @action(detail=True, methods=['get'], url_path='result')
    def get_result(self, request, pk=None):
        try:
            req = self._get_qs(request).get(pk=pk)
        except LabTestRequest.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        try:
            res = req.result
            if res.is_deleted:
                return Response({'detail': 'Supprimé.'}, status=404)
            return Response(LabResultDetailSerializer(res).data)
        except LabResult.DoesNotExist:
            return Response({'detail': 'Résultat non disponible.'}, status=404)

    @action(detail=True, methods=['post', 'put'], url_path='results')
    def create_update_results(self, request, pk=None):
        try:
            req = self._get_qs(request).get(pk=pk)
        except LabTestRequest.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        if req.status == 'cancelled':
            return Response({'detail': 'Annulé.'}, status=400)
        s = LabResultCreateUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        result, created = LabResult.objects.update_or_create(
            test_request=req,
            defaults={**s.validated_data, 'analyzed_by': request.user}
        )
        if req.status != 'completed':
            req.status = 'completed'
            req.save(update_fields=['status'])
        return Response(LabResultDetailSerializer(result).data, status=201 if created else 200)

    @action(detail=True, methods=['post'], url_path='results/validate')
    def validate_results(self, request, pk=None):
        try:
            req = self._get_qs(request).get(pk=pk)
        except LabTestRequest.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        try:
            res = req.result
        except LabResult.DoesNotExist:
            return Response({'detail': 'Saisissez les résultats d\'abord.'}, status=400)
        if res.validation_date:
            return Response({'detail': 'Déjà validé.'}, status=400)
        res.validated_by = request.user
        res.validation_date = timezone.now()
        res.save()
        return Response(LabResultDetailSerializer(res).data)

    # ✅ NOUVELLE ACTION : Marquer comme payé
    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        try:
            req = self._get_qs(request).get(pk=pk)
        except LabTestRequest.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        
        payment_method = request.data.get('payment_method')
        if payment_method not in ['cash', 'card', 'cnam', 'insurance']:
            return Response({'detail': 'Méthode de paiement invalide.'}, status=400)
        
        req.payment_status = 'paid'
        req.payment_method = payment_method
        req.save(update_fields=['payment_status', 'payment_method'])
        
        return Response(LabTestRequestDetailSerializer(req).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        lab = _get_lab_for_staff(request)
        today = date.today()
        qs = LabTestRequest.objects.filter(laboratory=lab, is_deleted=False)
        return Response({
            'today_count': qs.filter(request_date__date=today).count(),
            'pending_sample': qs.filter(status='requested').count(),
            'in_progress': qs.filter(status='in_progress').count(),
            'urgent': qs.filter(priority='urgent', status__in=['requested', 'sample_collected', 'in_progress']).count(),
            'month_revenue': float(
                LabTestRequest.objects.filter(
                    laboratory=lab, status='completed',
                    request_date__month=today.month, request_date__year=today.year
                ).annotate(
                    t=Sum('tests__price', output_field=DecimalField())
                ).aggregate(
                    s=Coalesce(Sum('t'), Decimal('0'), output_field=DecimalField())
                )['s']
            ),
            'abnormal_count': LabResult.objects.filter(
                test_request__laboratory=lab, is_abnormal=True, is_deleted=False
            ).count(),
        })


# ══════════════════ PATIENT ══════════════════
class PatientLabViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def _get_qs(self, request):
        p = _get_patient(request)
        return _base_request_qs().filter(patient=p) if p else LabTestRequest.objects.none()

    def requests_list(self, request):
        qs = self._get_qs(request)
        st = request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        return Response(LabTestRequestListSerializer(qs.order_by('-request_date'), many=True).data)

    def requests_retrieve(self, request, pk=None):
        try:
            return Response(LabTestRequestDetailSerializer(self._get_qs(request).get(pk=pk)).data)
        except LabTestRequest.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)

    def request_result(self, request, pk=None):
        try:
            req = self._get_qs(request).get(pk=pk)
        except LabTestRequest.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        try:
            if req.result.is_deleted:
                return Response({'detail': 'Supprimé.'}, status=404)
            return Response(LabResultDetailSerializer(req.result).data)
        except LabResult.DoesNotExist:
            return Response({'detail': 'Non disponible.'}, status=404)


# ══════════════════ SUPER ADMIN ══════════════════
class SuperAdminLabViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def labs_list(self, request):
        return Response(LaboratoryListSerializer(Laboratory.objects.filter(is_deleted=False).select_related('city'), many=True).data)

    def labs_create(self, request):
        s = LaboratoryCreateUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(LaboratoryDetailSerializer(s.save(owner=request.user)).data, status=201)

    def labs_retrieve(self, request, pk=None):
        try:
            return Response(LaboratoryDetailSerializer(Laboratory.objects.filter(is_deleted=False).select_related('city').get(pk=pk)).data)
        except Laboratory.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)

    def labs_update(self, request, pk=None):
        try:
            lab = Laboratory.objects.get(pk=pk, is_deleted=False)
        except Laboratory.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        s = LaboratoryCreateUpdateSerializer(lab, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(LaboratoryDetailSerializer(s.save()).data)

    def labs_destroy(self, request, pk=None):
        try:
            lab = Laboratory.objects.get(pk=pk, is_deleted=False)
        except Laboratory.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        lab.is_deleted = True
        lab.deleted_at = timezone.now()
        lab.save()
        return Response({'detail': 'Supprimé.'})

    def tests_list(self, request):
        return Response(LabTestTypeListSerializer(LabTestType.objects.all().order_by('category'), many=True).data)

    def tests_create(self, request):
        s = LabTestTypeCreateUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(LabTestTypeDetailSerializer(s.save()).data, status=201)

    def tests_retrieve(self, request, pk=None):
        try:
            return Response(LabTestTypeDetailSerializer(LabTestType.objects.get(pk=pk)).data)
        except LabTestType.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)

    def tests_update(self, request, pk=None):
        try:
            t = LabTestType.objects.get(pk=pk)
        except LabTestType.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        s = LabTestTypeCreateUpdateSerializer(t, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(LabTestTypeDetailSerializer(s.save()).data)

    def tests_destroy(self, request, pk=None):
        try:
            LabTestType.objects.get(pk=pk).delete()
        except LabTestType.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        return Response({'detail': 'Supprimé.'})

    def requests_list(self, request):
        qs = _base_request_qs()
        st = request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)
        return Response(LabTestRequestListSerializer(qs.order_by('-request_date'), many=True).data)

    def requests_retrieve(self, request, pk=None):
        try:
            return Response(LabTestRequestDetailSerializer(_base_request_qs().get(pk=pk)).data)
        except LabTestRequest.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)

    def requests_destroy(self, request, pk=None):
        try:
            req = LabTestRequest.objects.get(pk=pk, is_deleted=False)
        except LabTestRequest.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)
        req.is_deleted = True
        req.deleted_at = timezone.now()
        req.save()
        return Response({'detail': 'Supprimé.'})

    def results_list(self, request):
        return Response(LabResultListSerializer(LabResult.objects.filter(is_deleted=False), many=True).data)

    def results_retrieve(self, request, pk=None):
        try:
            return Response(LabResultDetailSerializer(LabResult.objects.get(pk=pk, is_deleted=False)).data)
        except LabResult.DoesNotExist:
            return Response({'detail': 'Introuvable.'}, status=404)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        today = date.today()
        return Response({
            'total_labs': Laboratory.objects.filter(is_deleted=False, is_active=True).count(),
            'total_tests': LabTestType.objects.count(),
            'total_requests': LabTestRequest.objects.filter(is_deleted=False).count(),
            'month_revenue': float(
                LabTestRequest.objects.filter(
                    is_deleted=False, status='completed', request_date__month=today.month
                ).annotate(
                    t=Sum('tests__price', output_field=DecimalField())
                ).aggregate(
                    s=Coalesce(Sum('t'), Decimal('0'), output_field=DecimalField())
                )['s']
            ),
        })
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied

from django.utils import timezone
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404

from .models import MedicalRecord, Prescription, MedicalAttachment
from apps.users.models import Patient
from apps.cabinets.models import Cabinet, Doctor
from .serializers import (
    MedicalRecordListSerializer,
    MedicalRecordDetailSerializer,
    MedicalRecordWriteSerializer,
    PrescriptionDetailSerializer,
    PrescriptionWriteSerializer,
    MedicalAttachmentSerializer,
    MedicalAttachmentUploadSerializer,
)


class MedicalRecordPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ====================== MÉDECIN ======================

class DoctorMedicalRecordViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = MedicalRecordPagination

    def get_queryset(self):
        return MedicalRecord.objects.filter(
            doctor__user=self.request.user,
            is_deleted=False,
        ).select_related(
            'patient', 'patient__user', 'doctor', 'doctor__user', 'doctor__specialty', 'appointment',
        ).prefetch_related(
            'prescriptions', 'attachments',
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return MedicalRecordListSerializer
        if self.action == 'retrieve':
            return MedicalRecordDetailSerializer
        if self.action in ('create', 'partial_update'):
            return MedicalRecordWriteSerializer
        return MedicalRecordListSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def _get_doctor_profile(self):
        try:
            return Doctor.objects.get(user=self.request.user)
        except Doctor.DoesNotExist:
            raise PermissionDenied("Vous n'avez pas de profil médecin.")

    # ── LIST ──

    def list(self, request):
        queryset = self.get_queryset()
        params = request.query_params

        patient_id = params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        priority = params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

        date_from = params.get('date_from')
        if date_from:
            queryset = queryset.filter(date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(diagnosis__icontains=search)
                | Q(symptoms__icontains=search)
                | Q(notes__icontains=search)
                | Q(diagnosis_code__icontains=search)
                | Q(treatment__icontains=search)
                | Q(patient__user__first_name__icontains=search)
                | Q(patient__user__last_name__icontains=search)
            )

        has_prescriptions = params.get('has_prescriptions')
        if has_prescriptions and has_prescriptions.lower() == 'true':
            queryset = queryset.filter(prescriptions__isnull=False).distinct()

        follow_up_only = params.get('follow_up')
        if follow_up_only and follow_up_only.lower() in ('true', '1', 'oui'):
            queryset = queryset.filter(follow_up_needed=True)

        ordering = params.get('ordering', '-date')
        allowed_orderings = ['date', '-date', 'created_at', '-created_at', 'updated_at', '-updated_at', 'priority', '-priority', 'patient', '-patient']
        if ordering not in allowed_orderings:
            ordering = '-date'
        if ordering == 'patient':
            queryset = queryset.order_by('patient__user__first_name', 'patient__user__last_name')
        elif ordering == '-patient':
            queryset = queryset.order_by('-patient__user__first_name', '-patient__user__last_name')
        else:
            queryset = queryset.order_by(ordering)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    # ── DETAIL ──

    def retrieve(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = MedicalRecordDetailSerializer(record, context={'request': request})
        return Response(serializer.data)

    # ── CREATE ──

    def create(self, request):
        doctor = self._get_doctor_profile()

        # Vérifier si le rendez-vous est déjà lié
        appointment_id = request.data.get('appointment')
        if appointment_id:
            try:
                existing = MedicalRecord.objects.filter(appointment_id=appointment_id, is_deleted=False).exists()
                if existing:
                    return Response(
                        {"appointment": ["Ce rendez-vous est déjà lié à un dossier médical existant."]},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception:
                pass

        serializer = MedicalRecordWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # FIX: Créer d'abord, puis assigner le doctor manuellement
        # car 'doctor' n'est pas dans les fields du WriteSerializer
        record = serializer.save()
        record.doctor = doctor
        record.save(update_fields=['doctor'])

        detail_serializer = MedicalRecordDetailSerializer(record, context={'request': request})
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

    # ── UPDATE ──

    def partial_update(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = MedicalRecordWriteSerializer(record, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        record = serializer.save()
        detail_serializer = MedicalRecordDetailSerializer(record, context={'request': request})
        return Response(detail_serializer.data)

    # ── DELETE ──

    def destroy(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        record.is_deleted = True
        record.deleted_at = timezone.now()
        record.save()
        return Response({"detail": "Dossier médical supprimé avec succès."})

    # ── STATS ──

    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        today = timezone.now().date()

        return Response({
            'total': queryset.count(),
            'total_records': queryset.count(),
            'patients_count': queryset.values('patient').distinct().count(),
            'total_patients': queryset.values('patient').distinct().count(),
            'this_month': queryset.filter(date__year=today.year, date__month=today.month).count(),
            'records_this_month': queryset.filter(date__year=today.year, date__month=today.month).count(),
            'follow_ups_pending': queryset.filter(follow_up_needed=True, follow_up_date__gte=today).count(),
            'upcoming_followups': queryset.filter(follow_up_needed=True, follow_up_date__gte=today).count(),
            'urgencies': queryset.filter(priority='emergency').count(),
            'by_priority': dict(queryset.values('priority').annotate(count=Count('id')).values_list('priority', 'count')),
        })

    # ── PATIENTS DROPDOWN ──

    @action(detail=False, methods=['get'])
    def patients_dropdown(self, request):
        search = request.query_params.get('search', '')
        patients_qs = Patient.objects.all().select_related('user').order_by('user__first_name', 'user__last_name')

        if search:
            patients_qs = patients_qs.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__email__icontains=search)
                | Q(cin__icontains=search)
            )

        doctor_records = self.get_queryset()
        result = []
        for p in patients_qs:
            info = {'id': p.id}
            if p.user:
                info['full_name'] = p.user.get_full_name()
                if hasattr(p.user, 'phone_number') and p.user.phone_number:
                    info['phone_number'] = str(p.user.phone_number)
                if hasattr(p.user, 'email') and p.user.email:
                    info['email'] = p.user.email
            if hasattr(p, 'date_of_birth') and p.date_of_birth:
                info['date_of_birth'] = str(p.date_of_birth)
            if hasattr(p, 'gender'):
                info['gender'] = p.gender
            info['records_count'] = doctor_records.filter(patient=p).count()
            result.append(info)

        return Response(result)

    # ── ATTACHMENTS ──

    @action(detail=True, methods=['post'], url_path='attachments/upload')
    def upload_attachment(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = MedicalAttachmentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        attachment = serializer.save(medical_record=record, uploaded_by=request.user)
        result_serializer = MedicalAttachmentSerializer(attachment, context={'request': request})
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='attachments/(?P<attachment_id>[^/.]+)')
    def remove_attachment(self, request, pk=None, attachment_id=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        try:
            attachment = record.attachments.get(id=attachment_id)
        except MedicalAttachment.DoesNotExist:
            return Response({"detail": "Pièce jointe introuvable."}, status=status.HTTP_404_NOT_FOUND)
        if attachment.file:
            try:
                attachment.file.delete(save=False)
            except Exception:
                pass
        attachment.delete()
        return Response({"detail": "Pièce jointe supprimée avec succès."})

    # ── PRESCRIPTIONS ──

    @action(detail=True, methods=['get'])
    def prescriptions_list(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        prescriptions = record.prescriptions.all().order_by('-prescribed_at')
        serializer = PrescriptionDetailSerializer(prescriptions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def prescriptions_create(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = PrescriptionWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        prescription = serializer.save(medical_record=record)
        result = PrescriptionDetailSerializer(prescription)
        return Response(result.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='prescriptions/(?P<prescription_id>[^/.]+)')
    def prescription_update(self, request, pk=None, prescription_id=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        try:
            prescription = record.prescriptions.get(id=prescription_id)
        except Prescription.DoesNotExist:
            return Response({"detail": "Prescription introuvable."}, status=status.HTTP_404_NOT_FOUND)
        serializer = PrescriptionWriteSerializer(prescription, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        prescription = serializer.save()
        result = PrescriptionDetailSerializer(prescription)
        return Response(result.data)

    @action(detail=True, methods=['delete'], url_path='prescriptions/(?P<prescription_id>[^/.]+)')
    def prescription_delete(self, request, pk=None, prescription_id=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        try:
            prescription = record.prescriptions.get(id=prescription_id)
        except Prescription.DoesNotExist:
            return Response({"detail": "Prescription introuvable."}, status=status.HTTP_404_NOT_FOUND)
        prescription.delete()
        return Response({"detail": "Prescription supprimée avec succès."})


# ====================== PATIENT ======================

class PatientMedicalRecordViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = MedicalRecordPagination

    def get_queryset(self):
        patient = Patient.objects.filter(user=self.request.user).first()
        if not patient:
            return MedicalRecord.objects.none()
        return MedicalRecord.objects.filter(
            patient=patient, is_deleted=False,
        ).select_related(
            'patient', 'patient__user', 'doctor', 'doctor__user', 'doctor__specialty', 'appointment',
        ).prefetch_related(
            'prescriptions', 'attachments',
        )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MedicalRecordDetailSerializer
        return MedicalRecordListSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def list(self, request):
        queryset = self.get_queryset()
        params = request.query_params

        priority = params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

        date_from = params.get('date_from')
        if date_from:
            queryset = queryset.filter(date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(diagnosis__icontains=search)
                | Q(symptoms__icontains=search)
                | Q(notes__icontains=search)
                | Q(diagnosis_code__icontains=search)
                | Q(treatment__icontains=search)
            )

        ordering = params.get('ordering', '-date')
        allowed = ['date', '-date', 'created_at', '-created_at', 'updated_at', '-updated_at', 'priority', '-priority']
        if ordering not in allowed:
            ordering = '-date'
        queryset = queryset.order_by(ordering)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = MedicalRecordDetailSerializer(record, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        today = timezone.now().date()

        return Response({
            'total': queryset.count(),
            'total_records': queryset.count(),
            'this_month': queryset.filter(date__year=today.year, date__month=today.month).count(),
            'records_this_month': queryset.filter(date__year=today.year, date__month=today.month).count(),
            'upcoming_followups': queryset.filter(follow_up_needed=True, follow_up_date__gte=today).count(),
        })

    @action(detail=True, methods=['get'], url_path='prescriptions')
    def prescriptions(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        prescriptions = record.prescriptions.all().order_by('-prescribed_at')
        serializer = PrescriptionDetailSerializer(prescriptions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='attachments/(?P<attachment_id>[^/.]+)/download')
    def download_attachment(self, request, pk=None, attachment_id=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        try:
            attachment = record.attachments.get(id=attachment_id)
        except MedicalAttachment.DoesNotExist:
            return Response({"detail": "Pièce jointe introuvable."}, status=status.HTTP_404_NOT_FOUND)
        if not attachment.file:
            return Response({"detail": "Aucun fichier associé."}, status=status.HTTP_404_NOT_FOUND)
        serializer = MedicalAttachmentSerializer(attachment, context={'request': request})
        return Response({
            'id': attachment.id,
            'file_name': attachment.file.name.split('/')[-1] if attachment.file else None,
            'file_type': attachment.file_type,
            'file_size': attachment.file.size if attachment.file else None,
            'download_url': serializer.data.get('file'),
            'uploaded_at': attachment.uploaded_at,
        })


# ====================== SECRÉTAIRE ======================

class SecretaryMedicalRecordViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = MedicalRecordPagination

    def get_queryset(self):
        return MedicalRecord.objects.filter(
            doctor__cabinets__secretaries=self.request.user,
            is_deleted=False,
        ).select_related(
            'patient', 'patient__user', 'doctor', 'doctor__user', 'doctor__specialty', 'appointment',
        ).prefetch_related(
            'prescriptions', 'attachments',
        ).distinct()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MedicalRecordDetailSerializer
        return MedicalRecordListSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def list(self, request):
        queryset = self.get_queryset()
        params = request.query_params

        patient_id = params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        priority = params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

        date_from = params.get('date_from')
        if date_from:
            queryset = queryset.filter(date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(diagnosis__icontains=search)
                | Q(symptoms__icontains=search)
                | Q(notes__icontains=search)
                | Q(diagnosis_code__icontains=search)
                | Q(treatment__icontains=search)
                | Q(patient__user__first_name__icontains=search)
                | Q(patient__user__last_name__icontains=search)
            )

        ordering = params.get('ordering', '-date')
        allowed = ['date', '-date', 'created_at', '-created_at', 'updated_at', '-updated_at', 'priority', '-priority', 'patient', '-patient']
        if ordering not in allowed:
            ordering = '-date'
        if ordering == 'patient':
            queryset = queryset.order_by('patient__user__first_name', 'patient__user__last_name')
        elif ordering == '-patient':
            queryset = queryset.order_by('-patient__user__first_name', '-patient__user__last_name')
        else:
            queryset = queryset.order_by(ordering)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = MedicalRecordDetailSerializer(record, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        today = timezone.now().date()

        return Response({
            'total': queryset.count(),
            'total_records': queryset.count(),
            'patients_count': queryset.values('patient').distinct().count(),
            'total_patients': queryset.values('patient').distinct().count(),
            'this_week': queryset.filter(date__gte=today - timezone.timedelta(days=today.weekday())).count(),
            'records_this_month': queryset.filter(date__year=today.year, date__month=today.month).count(),
            'upcoming_followups': queryset.filter(follow_up_needed=True, follow_up_date__gte=today).count(),
            'by_priority': dict(queryset.values('priority').annotate(count=Count('id')).values_list('priority', 'count')),
        })

    @action(detail=True, methods=['get'], url_path='prescriptions')
    def prescriptions(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        prescriptions = record.prescriptions.all().order_by('-prescribed_at')
        serializer = PrescriptionDetailSerializer(prescriptions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='attachments/(?P<attachment_id>[^/.]+)/download')
    def download_attachment(self, request, pk=None, attachment_id=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        try:
            attachment = record.attachments.get(id=attachment_id)
        except MedicalAttachment.DoesNotExist:
            return Response({"detail": "Pièce jointe introuvable."}, status=status.HTTP_404_NOT_FOUND)
        if not attachment.file:
            return Response({"detail": "Aucun fichier associé."}, status=status.HTTP_404_NOT_FOUND)
        serializer = MedicalAttachmentSerializer(attachment, context={'request': request})
        return Response({
            'id': attachment.id,
            'file_name': attachment.file.name.split('/')[-1] if attachment.file else None,
            'file_type': attachment.file_type,
            'file_size': attachment.file.size if attachment.file else None,
            'download_url': serializer.data.get('file'),
            'uploaded_at': attachment.uploaded_at,
        })
# -*- coding: utf-8 -*-
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from django.db.models import Q, Avg
from django.shortcuts import get_object_or_404

from .models import WaitingQueueEntry, _today_range
from apps.users.models import Patient
from apps.cabinets.models import Doctor, Cabinet
from .serializers import (
    WaitingQueueListSerializer,
    WaitingQueueDetailSerializer,
    WaitingQueueWriteSerializer,
)

try:
    from apps.appointments.models import Appointment
    _HAS_APPOINTMENTS = True
except (ImportError, LookupError):
    Appointment = None
    _HAS_APPOINTMENTS = False


class WaitingQueuePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ══════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════

def _clean_data(data, nullable_keys=('cabinet', 'appointment')):
    for key in nullable_keys:
        val = data.get(key)
        if val is None or val == '' or val == 'undefined':
            data.pop(key, None)


def _get_doctor_cabinet(doctor):
    cabinet = doctor.cabinets.filter(is_active=True).first()
    if not cabinet:
        cabinet = doctor.cabinets.first()
    return cabinet


def _find_pending_appointment(patient, doctor):
    if not _HAS_APPOINTMENTS:
        return None
    try:
        today_start, today_end = _today_range()
        return Appointment.objects.filter(
            patient=patient, doctor=doctor,
            date_time__gte=today_start,
            date_time__lt=today_end,
            status__in=['scheduled', 'confirmed'],
            is_deleted=False,
        ).first()
    except Exception:
        return None


def _recalculate_positions(doctor):
    """✅ CORRIGÉ : utilise _today_range() au lieu de joined_at__date=today."""
    today_start, today_end = _today_range()
    waiting = WaitingQueueEntry.objects.filter(
        doctor=doctor, status='waiting', is_deleted=False,
        joined_at__gte=today_start, joined_at__lt=today_end,
    ).order_by('joined_at')

    updated = []
    for i, entry in enumerate(waiting, 1):
        if entry.position != i:
            entry.position = i
            updated.append(entry)
    if updated:
        WaitingQueueEntry.objects.bulk_update(updated, ['position'])


# ══════════════════════════════════════════
#  MÉDECIN
# ══════════════════════════════════════════

class DoctorWaitingQueueViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = WaitingQueuePagination

    def _get_doctor_profile(self):
        try:
            return Doctor.objects.get(user=self.request.user)
        except Doctor.DoesNotExist:
            raise PermissionDenied("Vous n'avez pas de profil médecin.")

    def get_queryset(self):
        doctor = self._get_doctor_profile()
        return WaitingQueueEntry.objects.filter(
            doctor=doctor, is_deleted=False,
        ).select_related(
            'patient', 'patient__user',
            'doctor', 'doctor__user', 'doctor__specialty',
            'cabinet',
        )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WaitingQueueDetailSerializer
        if self.action in ('create', 'partial_update'):
            return WaitingQueueWriteSerializer
        return WaitingQueueListSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        try:
            context['doctor'] = self._get_doctor_profile()
        except PermissionDenied:
            pass
        context['created_by'] = self.request.user
        return context

    # ── LIST ──
    def list(self, request):
        queryset = self.get_queryset()
        params = request.query_params

        status_filter = params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        priority = params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(patient__user__first_name__icontains=search)
                | Q(patient__user__last_name__icontains=search)
                | Q(reason_details__icontains=search)
            )

        ordering = params.get('ordering', 'position')
        if ordering == 'position':
            if not status_filter:
                queryset = queryset.filter(status='waiting')
            queryset = queryset.order_by('position', 'joined_at')
        elif ordering == '-joined_at':
            queryset = queryset.order_by('-joined_at')
        else:
            queryset = queryset.order_by('position', 'joined_at')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    # ── DETAIL ──
    def retrieve(self, request, pk=None):
        entry = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = WaitingQueueDetailSerializer(entry)
        return Response(serializer.data)

    # ── CRÉATION ──
    def create(self, request):
        doctor = self._get_doctor_profile()
        data = request.data.copy()
        _clean_data(data)

        if 'cabinet' not in data:
            cabinet = _get_doctor_cabinet(doctor)
            if cabinet:
                data['cabinet'] = cabinet.id

        if 'appointment' not in data and data.get('patient'):
            try:
                patient_obj = Patient.objects.get(id=int(data['patient']))
                appointment = _find_pending_appointment(patient_obj, doctor)
                if appointment:
                    data['appointment'] = appointment.id
            except (Patient.DoesNotExist, ValueError, TypeError):
                pass

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            entry = serializer.save()
        except Exception as e:
            return Response(
                {'detail': f"Erreur lors de la création : {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        detail = WaitingQueueDetailSerializer(entry)
        return Response(detail.data, status=status.HTTP_201_CREATED)

    # ── TODAY ──
    @action(detail=False, methods=['get'])
    def today(self, request):
        # ✅ CORRIGÉ CRITIQUE : _today_range() au lieu de joined_at__date=today
        today_start, today_end = _today_range()
        queryset = self.get_queryset().filter(
            joined_at__gte=today_start,
            joined_at__lt=today_end,
        ).order_by('position', 'joined_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        serializer = WaitingQueueDetailSerializer(queryset, many=True)
        return Response(serializer.data)

    # ── STATS ──
    @action(detail=False, methods=['get'])
    def stats(self, request):
        # ✅ CORRIGÉ CRITIQUE
        today_start, today_end = _today_range()
        today_qs = self.get_queryset().filter(
            joined_at__gte=today_start,
            joined_at__lt=today_end,
        )

        waiting = today_qs.filter(status='waiting').count()
        in_progress = today_qs.filter(status='in_progress').count()
        completed = today_qs.filter(status='completed').count()
        no_show = today_qs.filter(status='no_show').count()
        cancelled = today_qs.filter(status='cancelled').count()

        avg_wait = today_qs.filter(
            status__in=('completed', 'no_show'),
            actual_wait_minutes__isnull=False,
        ).aggregate(avg=Avg('actual_wait_minutes'))['avg']

        avg_duration = today_qs.filter(
            status='completed',
            consultation_duration_minutes__isnull=False,
        ).aggregate(avg=Avg('consultation_duration_minutes'))['avg']

        currently_serving = today_qs.filter(status='in_progress').first()

        return Response({
            'today_waiting': waiting,
            'today_in_progress': in_progress,
            'today_completed': completed,
            'today_total': waiting + in_progress + completed,
            'today_no_show': no_show,
            'today_cancelled': cancelled,
            'avg_wait_minutes': round(avg_wait) if avg_wait else None,
            'avg_consultation_minutes': round(avg_duration) if avg_duration else None,
            'currently_serving': (
                WaitingQueueListSerializer(currently_serving).data
                if currently_serving else None
            ),
        })

    # ── PATIENTS DROPDOWN ──
    @action(detail=False, methods=['get'])
    def patients_dropdown(self, request):
        search = request.query_params.get('search', '')
        patients_qs = (
            Patient.objects.all()
            .select_related('user')
            .order_by('user__first_name')
        )
        if search:
            patients_qs = patients_qs.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__email__icontains=search)
            )
        result = []
        for p in patients_qs[:50]:
            info = {'id': p.id}
            if p.user:
                info['full_name'] = p.user.get_full_name()
                if p.user.phone_number:
                    info['phone_number'] = str(p.user.phone_number)
            result.append(info)
        return Response(result)

    # ── MISE À JOUR ──
    def partial_update(self, request, pk=None):
        entry = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = WaitingQueueWriteSerializer(entry, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        entry = serializer.save()
        detail = WaitingQueueDetailSerializer(entry)
        return Response(detail.data)

    # ── SUPPRESSION ──
    def destroy(self, request, pk=None):
        entry = get_object_or_404(self.get_queryset(), pk=pk)
        entry.is_deleted = True
        entry.deleted_at = timezone.now()
        if entry.status == 'waiting':
            entry.status = 'cancelled'
        entry.save()
        _recalculate_positions(entry.doctor)
        return Response({'detail': 'Entrée supprimée avec succès.'})

    # ── ACTIONS ──
    @action(detail=True, methods=['post'])
    def call_patient(self, request, pk=None):
        entry = get_object_or_404(self.get_queryset(), pk=pk)
        if entry.status != 'waiting':
            return Response({'detail': 'Ce patient n\'est plus en attente.'}, status=status.HTTP_400_BAD_REQUEST)
        WaitingQueueEntry.objects.filter(doctor=entry.doctor, status='in_progress', is_deleted=False).update(
            status='completed', ended_at=timezone.now()
        )
        entry.status = 'in_progress'
        entry.called_at = timezone.now()
        entry.started_at = timezone.now()
        entry.save()
        _recalculate_positions(entry.doctor)
        return Response(WaitingQueueDetailSerializer(entry).data)

    @action(detail=True, methods=['post'])
    def complete_consultation(self, request, pk=None):
        entry = get_object_or_404(self.get_queryset(), pk=pk)
        if entry.status != 'in_progress':
            return Response({'detail': 'Cette consultation n\'est pas en cours.'}, status=status.HTTP_400_BAD_REQUEST)
        entry.status = 'completed'
        entry.ended_at = timezone.now()
        doctor_notes = request.data.get('doctor_notes', '')
        if doctor_notes:
            entry.doctor_notes = doctor_notes
        if entry.started_at and entry.joined_at:
            entry.actual_wait_minutes = int((entry.started_at - entry.joined_at).total_seconds() / 60)
        if entry.started_at and entry.ended_at:
            entry.consultation_duration_minutes = int((entry.ended_at - entry.started_at).total_seconds() / 60)
        entry.save()
        _recalculate_positions(entry.doctor)
        if entry.appointment:
            try:
                entry.appointment.status = 'completed'
                entry.appointment.save(update_fields=['status'])
            except Exception:
                pass
        return Response(WaitingQueueDetailSerializer(entry).data)

    @action(detail=True, methods=['post'])
    def mark_no_show(self, request, pk=None):
        entry = get_object_or_404(self.get_queryset(), pk=pk)
        if entry.status != 'waiting':
            return Response({'detail': 'Ce patient n\'est plus en attente.'}, status=status.HTTP_400_BAD_REQUEST)
        entry.status = 'no_show'
        entry.ended_at = timezone.now()
        entry.save()
        _recalculate_positions(entry.doctor)
        if entry.appointment:
            try:
                entry.appointment.status = 'no_show'
                entry.appointment.save(update_fields=['status'])
            except Exception:
                pass
        return Response(WaitingQueueDetailSerializer(entry).data)


# ══════════════════════════════════════════
#  PATIENT
# ══════════════════════════════════════════

class PatientWaitingQueueViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    def _get_patient(self):
        return Patient.objects.filter(user=self.request.user).first()

    def get_queryset(self):
        patient = self._get_patient()
        if not patient:
            return WaitingQueueEntry.objects.none()
        return WaitingQueueEntry.objects.filter(
            patient=patient, is_deleted=False,
        ).select_related(
            'patient', 'patient__user',
            'doctor', 'doctor__user', 'doctor__specialty',
        )

    def list(self, request):
        queryset = self.get_queryset().order_by('-joined_at')
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        serializer = WaitingQueueDetailSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def current(self, request):
        patient = self._get_patient()
        if not patient:
            return Response({'detail': 'Profil patient introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        entry = WaitingQueueEntry.objects.filter(
            patient=patient, status='waiting', is_deleted=False,
        ).order_by('joined_at').first()
        if not entry:
            return Response({'in_queue': False, 'message': "Vous n'êtes pas dans une file d'attente."})
        ahead_count = WaitingQueueEntry.objects.filter(
            doctor=entry.doctor, status='waiting', is_deleted=False,
            joined_at__lt=entry.joined_at,
        ).count()
        serializer = WaitingQueueDetailSerializer(entry)
        data = serializer.data
        data['in_queue'] = True
        data['people_ahead'] = ahead_count
        return Response(data)

    @action(detail=False, methods=['post'])
    def join(self, request):
        patient = self._get_patient()
        if not patient:
            return Response({'detail': 'Profil patient introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        doctor_id = request.data.get('doctor')
        if not doctor_id:
            return Response({'doctor': 'Veuillez sélectionner un médecin.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            doctor = Doctor.objects.get(id=int(doctor_id))
        except (Doctor.DoesNotExist, ValueError):
            return Response({'doctor': 'Médecin introuvable.'}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ CORRIGÉ CRITIQUE
        today_start, today_end = _today_range()
        exists = WaitingQueueEntry.objects.filter(
            patient=patient, doctor=doctor, status='waiting', is_deleted=False,
            joined_at__gte=today_start, joined_at__lt=today_end,
        ).exists()
        if exists:
            return Response({'detail': 'Vous êtes déjà dans la file d\'attente de ce médecin.'}, status=status.HTTP_400_BAD_REQUEST)

        cabinet = _get_doctor_cabinet(doctor)
        appointment = _find_pending_appointment(patient, doctor)
        entry = WaitingQueueEntry.objects.create(
            patient=patient, doctor=doctor, cabinet=cabinet,
            appointment=appointment, priority=request.data.get('priority', 'normal'),
            reason=request.data.get('reason', 'consultation'),
            reason_details=request.data.get('reason_details', ''),
            notes=request.data.get('notes', ''), created_by=request.user,
        )
        if appointment:
            try:
                appointment.status = 'in_progress'
                appointment.save(update_fields=['status'])
            except Exception:
                pass
        return Response(WaitingQueueDetailSerializer(entry).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        entry = get_object_or_404(self.get_queryset(), pk=pk)
        if entry.status != 'waiting':
            return Response({'detail': 'Vous ne pouvez plus quitter cette file.'}, status=status.HTTP_400_BAD_REQUEST)
        entry.status = 'cancelled'
        entry.ended_at = timezone.now()
        entry.save()
        _recalculate_positions(entry.doctor)
        if entry.appointment and entry.appointment.status == 'in_progress':
            try:
                entry.appointment.status = 'scheduled'
                entry.appointment.save(update_fields=['status'])
            except Exception:
                pass
        return Response({'detail': 'Vous avez quitté la file d\'attente.'})

    @action(detail=False, methods=['get'])
    def doctors_available(self, request):
        doctors = Doctor.objects.filter(user__is_active=True).select_related('user', 'specialty')[:20]
        result = []
        for d in doctors:
            waiting_count = WaitingQueueEntry.objects.filter(doctor=d, status='waiting', is_deleted=False).count()
            result.append({
                'id': d.id,
                'full_name': d.user.get_full_name() if d.user else str(d),
                'specialty': d.specialty.name if d.specialty else '',
                'waiting_count': waiting_count,
            })
        return Response(result)


# ══════════════════════════════════════════
#  SECRÉTAIRE
# ══════════════════════════════════════════

class SecretaryWaitingQueueViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WaitingQueueEntry.objects.filter(
            doctor__cabinets__secretaries=self.request.user, is_deleted=False,
        ).select_related(
            'patient', 'patient__user',
            'doctor', 'doctor__user', 'doctor__specialty',
            'cabinet',
        ).distinct()

    def list(self, request):
        queryset = self.get_queryset()
        params = request.query_params
        doctor_id = params.get('doctor')
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        status_filter = params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        date_from = params.get('date')
        if date_from:
            queryset = queryset.filter(joined_at__date=date_from)
        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(patient__user__first_name__icontains=search)
                | Q(patient__user__last_name__icontains=search)
            )
        ordering = params.get('ordering', '-joined_at')
        queryset = queryset.order_by(ordering)
        serializer = WaitingQueueListSerializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        entry = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = WaitingQueueDetailSerializer(entry)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def today(self, request):
        # ✅ CORRIGÉ CRITIQUE
        today_start, today_end = _today_range()
        queryset = self.get_queryset().filter(
            joined_at__gte=today_start,
            joined_at__lt=today_end,
        ).order_by('position', 'joined_at')

        doctor_id = request.query_params.get('doctor')
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)

        serializer = WaitingQueueDetailSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        # ✅ CORRIGÉ CRITIQUE
        today_start, today_end = _today_range()
        today_qs = self.get_queryset().filter(
            joined_at__gte=today_start,
            joined_at__lt=today_end,
        )
        return Response({
            'total_waiting': today_qs.filter(status='waiting').count(),
            'total_in_progress': today_qs.filter(status='in_progress').count(),
            'total_completed': today_qs.filter(status='completed').count(),
            'total_no_show': today_qs.filter(status='no_show').count(),
            'total_cancelled': today_qs.filter(status='cancelled').count(),
            'total_today': today_qs.count(),
        })

    @action(detail=False, methods=['get'])
    def doctors_dropdown(self, request):
        cabinets = Cabinet.objects.filter(secretaries=request.user, is_active=True)
        doctors = Doctor.objects.filter(
            cabinets__in=cabinets, user__is_active=True,
        ).select_related('user', 'specialty').distinct()
        result = []
        for d in doctors:
            result.append({
                'id': d.id,
                'full_name': d.user.get_full_name() if d.user else str(d),
                'specialty': d.specialty.name if d.specialty else '',
            })
        return Response(result)
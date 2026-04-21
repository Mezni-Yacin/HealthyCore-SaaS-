from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied

from django.utils import timezone
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404

from .models import Appointment
from apps.users.models import Patient
from .serializers import (
    AppointmentListSerializer,
    AppointmentDetailSerializer,
    AppointmentWriteSerializer,
    AppointmentCancelSerializer,
)


# ====================== PAGINATION ======================

class AppointmentPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ====================== MÉDECIN ======================

class DoctorAppointmentViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = AppointmentPagination

    def get_queryset(self):
        return Appointment.objects.filter(
            doctor__user=self.request.user,
            is_deleted=False,
        ).select_related(
            'patient', 'patient__user', 'doctor', 'doctor__user',
            'doctor__specialty', 'cabinet',
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return AppointmentListSerializer
        if self.action == 'retrieve':
            return AppointmentDetailSerializer
        if self.action in ('create', 'partial_update'):
            return AppointmentWriteSerializer
        if self.action == 'cancel_appointment':
            return AppointmentCancelSerializer
        return AppointmentListSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def _get_doctor_profile(self):
        try:
            from apps.cabinets.models import Doctor
            return Doctor.objects.get(user=self.request.user)
        except Doctor.DoesNotExist:
            raise PermissionDenied("Vous n'avez pas de profil médecin.")

    # ── LISTE ──

    def list(self, request):
        queryset = self.get_queryset()
        params = request.query_params

        status_filter = params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        date_from = params.get('date_from')
        if date_from:
            queryset = queryset.filter(date_time__date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            queryset = queryset.filter(date_time__date__lte=date_to)

        patient_id = params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        cabinet_id = params.get('cabinet')
        if cabinet_id:
            queryset = queryset.filter(cabinet_id=cabinet_id)

        consultation_type = params.get('consultation_type')
        if consultation_type:
            queryset = queryset.filter(consultation_type=consultation_type)

        is_teleconsultation = params.get('is_teleconsultation')
        if is_teleconsultation and is_teleconsultation.lower() == 'true':
            queryset = queryset.filter(is_teleconsultation=True)

        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(patient__user__first_name__icontains=search)
                | Q(patient__user__last_name__icontains=search)
                | Q(symptoms__icontains=search)
                | Q(notes__icontains=search)
            )

        ordering = params.get('ordering', 'date_time')
        allowed_orderings = [
            'date_time', '-date_time', 'created_at', '-created_at',
            'duration', '-duration', 'status', '-status',
            'patient', '-patient',
        ]
        if ordering not in allowed_orderings:
            ordering = 'date_time'
        if ordering == 'patient':
            queryset = queryset.order_by('patient__user__first_name', 'patient__user__last_name', 'date_time')
        elif ordering == '-patient':
            queryset = queryset.order_by('-patient__user__first_name', '-patient__user__last_name', 'date_time')
        else:
            queryset = queryset.order_by(ordering)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    # ── DÉTAIL ──

    def retrieve(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = AppointmentDetailSerializer(record, context={'request': request})
        return Response(serializer.data)

    # ── CRÉATION ──

    def create(self, request):
        doctor = self._get_doctor_profile()
        data = request.data.copy()
        data['doctor'] = doctor.id

        serializer = AppointmentWriteSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            appointment = serializer.save(
                created_by=request.user,
                last_modified_by=request.user,
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        detail_serializer = AppointmentDetailSerializer(appointment, context={'request': request})
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

    # ── MISE À JOUR ──

    def partial_update(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = AppointmentWriteSerializer(record, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            appointment = serializer.save(last_modified_by=request.user)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        detail_serializer = AppointmentDetailSerializer(appointment, context={'request': request})
        return Response(detail_serializer.data)

    # ── SUPPRESSION (SOFT DELETE) ──

    def destroy(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        record.is_deleted = True
        record.deleted_at = timezone.now()
        record.save()
        return Response({"detail": "Rendez-vous supprimé avec succès."})

    # ── STATISTIQUES ──

    def stats(self, request):
        queryset = self.get_queryset()
        today = timezone.now()
        today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)

        total = queryset.count()
        today_count = queryset.filter(date_time__date=today.date()).count()
        upcoming = queryset.filter(date_time__gt=today, status__in=['scheduled', 'confirmed']).count()
        this_week = queryset.filter(
            date_time__gte=today_start - timezone.timedelta(days=today_start.weekday()),
            date_time__lte=today_start + timezone.timedelta(days=7),
        ).count()
        this_month = queryset.filter(
            date_time__year=today.year, date_time__month=today.month
        ).count()
        completed = queryset.filter(status='completed').count()
        cancelled = queryset.filter(status='cancelled').count()
        no_show = queryset.filter(status='no_show').count()
        teleconsultations = queryset.filter(is_teleconsultation=True).count()
        patients_count = queryset.values('patient').distinct().count()

        by_status = dict(
            queryset.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )
        by_consultation_type = dict(
            queryset.values('consultation_type')
            .annotate(count=Count('id'))
            .values_list('consultation_type', 'count')
        )

        return Response({
            'total': total,
            'today': today_count,
            'upcoming': upcoming,
            'this_week': this_week,
            'this_month': this_month,
            'completed': completed,
            'cancelled': cancelled,
            'no_show': no_show,
            'teleconsultations': teleconsultations,
            'patients_count': patients_count,
            'by_status': by_status,
            'by_consultation_type': by_consultation_type,
        })

    # ── PATIENTS DROPDOWN (TOUS les patients) ──

    def patients_dropdown(self, request):
        patients = Patient.objects.select_related('user').order_by('user__first_name', 'user__last_name')

        # Support de recherche par nom/prénom/téléphone
        search = request.query_params.get('search')
        if search:
            patients = patients.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__phone_number__icontains=search)
            )

        result = []
        for p in patients[:50]:
            info = {'id': p.id}
            if p.user:
                info['full_name'] = p.user.get_full_name()
                if hasattr(p.user, 'phone_number') and p.user.phone_number:
                    info['phone_number'] = str(p.user.phone_number)
                if hasattr(p.user, 'email') and p.user.email:
                    info['email'] = p.user.email
            result.append(info)

        return Response(result)

    # ── CABINETS DROPDOWN ──

    def cabinets_dropdown(self, request):
        doctor = self._get_doctor_profile()
        cabinets = doctor.cabinets.all()

        result = []
        for c in cabinets:
            info = {'id': c.id, 'name': c.name}
            if hasattr(c, 'address') and c.address:
                info['address'] = c.address
            if hasattr(c, 'phone') and c.phone:
                info['phone'] = str(c.phone)
            result.append(info)

        return Response(result)

    # ── CHANGER STATUT ──

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm_appointment(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        if record.status not in ['scheduled']:
            return Response(
                {"detail": "Seul un rendez-vous programmé peut être confirmé."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        record.status = 'confirmed'
        record.approved_by = request.user
        record.last_modified_by = request.user
        record.save()
        serializer = AppointmentDetailSerializer(record, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='start')
    def start_appointment(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        if record.status not in ['confirmed', 'scheduled']:
            return Response(
                {"detail": "Le rendez-vous doit être confirmé ou programmé pour commencer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        record.status = 'in_progress'
        record.last_modified_by = request.user
        record.save()
        serializer = AppointmentDetailSerializer(record, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete_appointment(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        if record.status not in ['in_progress', 'confirmed']:
            return Response(
                {"detail": "Le rendez-vous doit être en cours ou confirmé pour être complété."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        record.status = 'completed'
        record.last_modified_by = request.user
        record.save()
        serializer = AppointmentDetailSerializer(record, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_appointment(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        if record.status in ['completed', 'cancelled']:
            return Response(
                {"detail": "Ce rendez-vous ne peut plus être annulé."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = AppointmentCancelSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        record.status = 'cancelled'
        record.cancellation_reason = serializer.validated_data['cancellation_reason']
        record.cancellation_notes = serializer.validated_data.get('cancellation_notes', '')
        record.last_modified_by = request.user
        record.save()
        result = AppointmentDetailSerializer(record, context={'request': request})
        return Response(result.data)


# ====================== PATIENT ======================

class PatientAppointmentViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = AppointmentPagination

    def get_queryset(self):
        patient = Patient.objects.filter(user=self.request.user).first()
        if not patient:
            return Appointment.objects.none()
        return Appointment.objects.filter(
            patient=patient, is_deleted=False,
        ).select_related(
            'patient', 'patient__user', 'doctor', 'doctor__user',
            'doctor__specialty', 'cabinet',
        )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AppointmentDetailSerializer
        if self.action == 'cancel_appointment':
            return AppointmentCancelSerializer
        return AppointmentListSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def _get_patient_profile(self):
        patient = Patient.objects.filter(user=self.request.user).first()
        if not patient:
            raise PermissionDenied("Vous n'avez pas de profil patient.")
        return patient

    # ── LISTE ──

    def list(self, request):
        queryset = self.get_queryset()
        params = request.query_params

        status_filter = params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        date_from = params.get('date_from')
        if date_from:
            queryset = queryset.filter(date_time__date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            queryset = queryset.filter(date_time__date__lte=date_to)

        ordering = params.get('ordering', '-date_time')
        allowed_orderings = ['date_time', '-date_time', 'created_at', '-created_at']
        if ordering not in allowed_orderings:
            ordering = '-date_time'
        queryset = queryset.order_by(ordering)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    # ── DÉTAIL ──

    def retrieve(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = AppointmentDetailSerializer(record, context={'request': request})
        return Response(serializer.data)

    # ── PROCHAINS RENDEZ-VOUS ──

    def upcoming(self, request):
        queryset = self.get_queryset().filter(
            date_time__gt=timezone.now(),
            status__in=['scheduled', 'confirmed'],
        ).order_by('date_time')[:10]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    # ── ANNULATION (par le patient) ──

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_appointment(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        if record.status in ['completed', 'cancelled', 'no_show']:
            return Response(
                {"detail": "Ce rendez-vous ne peut plus être annulé."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if record.date_time <= timezone.now():
            return Response(
                {"detail": "Ce rendez-vous est déjà passé et ne peut pas être annulé."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = AppointmentCancelSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        record.status = 'cancelled'
        record.cancellation_reason = serializer.validated_data['cancellation_reason']
        record.cancellation_notes = serializer.validated_data.get('cancellation_notes', '')
        record.last_modified_by = request.user
        record.save()
        result = AppointmentDetailSerializer(record, context={'request': request})
        return Response(result.data)


# ====================== SECRÉTAIRE ======================

class SecretaryAppointmentViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = AppointmentPagination

    def get_queryset(self):
        return Appointment.objects.filter(
            cabinet__secretaries=self.request.user,
            is_deleted=False,
        ).select_related(
            'patient', 'patient__user', 'doctor', 'doctor__user',
            'doctor__specialty', 'cabinet',
        ).distinct()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AppointmentDetailSerializer
        if self.action in ('create', 'partial_update'):
            return AppointmentWriteSerializer
        if self.action == 'cancel_appointment':
            return AppointmentCancelSerializer
        return AppointmentListSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    # ── LISTE ──

    def list(self, request):
        queryset = self.get_queryset()
        params = request.query_params

        status_filter = params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        date_from = params.get('date_from')
        if date_from:
            queryset = queryset.filter(date_time__date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            queryset = queryset.filter(date_time__date__lte=date_to)

        patient_id = params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        doctor_id = params.get('doctor')
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)

        cabinet_id = params.get('cabinet')
        if cabinet_id:
            queryset = queryset.filter(cabinet_id=cabinet_id)

        consultation_type = params.get('consultation_type')
        if consultation_type:
            queryset = queryset.filter(consultation_type=consultation_type)

        is_teleconsultation = params.get('is_teleconsultation')
        if is_teleconsultation and is_teleconsultation.lower() == 'true':
            queryset = queryset.filter(is_teleconsultation=True)

        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(patient__user__first_name__icontains=search)
                | Q(patient__user__last_name__icontains=search)
                | Q(doctor__user__first_name__icontains=search)
                | Q(doctor__user__last_name__icontains=search)
                | Q(symptoms__icontains=search)
                | Q(notes__icontains=search)
            )

        ordering = params.get('ordering', 'date_time')
        allowed_orderings = [
            'date_time', '-date_time', 'created_at', '-created_at',
            'duration', '-duration', 'status', '-status',
            'patient', '-patient', 'doctor', '-doctor',
        ]
        if ordering not in allowed_orderings:
            ordering = 'date_time'
        if ordering == 'patient':
            queryset = queryset.order_by('patient__user__first_name', 'patient__user__last_name', 'date_time')
        elif ordering == '-patient':
            queryset = queryset.order_by('-patient__user__first_name', '-patient__user__last_name', 'date_time')
        elif ordering == 'doctor':
            queryset = queryset.order_by('doctor__user__first_name', 'doctor__user__last_name', 'date_time')
        elif ordering == '-doctor':
            queryset = queryset.order_by('-doctor__user__first_name', '-doctor__user__last_name', 'date_time')
        else:
            queryset = queryset.order_by(ordering)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    # ── DÉTAIL ──

    def retrieve(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = AppointmentDetailSerializer(record, context={'request': request})
        return Response(serializer.data)

    # ── CRÉATION ──

    def create(self, request):
        data = request.data.copy()
        data['created_by'] = request.user.id

        serializer = AppointmentWriteSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            appointment = serializer.save(
                created_by=request.user,
                last_modified_by=request.user,
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        detail_serializer = AppointmentDetailSerializer(appointment, context={'request': request})
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

    # ── MISE À JOUR ──

    def partial_update(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = AppointmentWriteSerializer(record, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            appointment = serializer.save(last_modified_by=request.user)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        detail_serializer = AppointmentDetailSerializer(appointment, context={'request': request})
        return Response(detail_serializer.data)

    # ── STATISTIQUES ──

    def stats(self, request):
        queryset = self.get_queryset()
        today = timezone.now()
        today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)

        total = queryset.count()
        today_count = queryset.filter(date_time__date=today.date()).count()
        upcoming = queryset.filter(date_time__gt=today, status__in=['scheduled', 'confirmed']).count()
        this_week = queryset.filter(
            date_time__gte=today_start - timezone.timedelta(days=today_start.weekday()),
            date_time__lte=today_start + timezone.timedelta(days=7),
        ).count()
        this_month = queryset.filter(
            date_time__year=today.year, date_time__month=today.month
        ).count()
        completed = queryset.filter(status='completed').count()
        cancelled = queryset.filter(status='cancelled').count()
        teleconsultations = queryset.filter(is_teleconsultation=True).count()

        by_status = dict(
            queryset.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )

        return Response({
            'total': total,
            'today': today_count,
            'upcoming': upcoming,
            'this_week': this_week,
            'this_month': this_month,
            'completed': completed,
            'cancelled': cancelled,
            'teleconsultations': teleconsultations,
            'by_status': by_status,
        })

    # ── DROPDOWNS ──

    def doctors_dropdown(self, request):
        from apps.cabinets.models import Doctor
        doctors = Doctor.objects.filter(
            cabinets__secretaries=request.user
        ).distinct().select_related('user')

        result = []
        for d in doctors:
            info = {'id': d.id}
            if d.user:
                info['full_name'] = d.user.get_full_name()
            if hasattr(d, 'specialty') and d.specialty:
                info['specialty'] = d.specialty.name if hasattr(d.specialty, 'name') else str(d.specialty)
            result.append(info)

        return Response(result)

    def patients_dropdown(self, request):
        # TOUS les patients (pas seulement ceux avec des RDV existants)
        patients = Patient.objects.select_related('user').order_by('user__first_name', 'user__last_name')

        # Support de recherche par nom/prénom/téléphone
        search = request.query_params.get('search')
        if search:
            patients = patients.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__phone_number__icontains=search)
            )

        result = []
        for p in patients[:50]:
            info = {'id': p.id}
            if p.user:
                info['full_name'] = p.user.get_full_name()
                if hasattr(p.user, 'phone_number') and p.user.phone_number:
                    info['phone_number'] = str(p.user.phone_number)
            result.append(info)

        return Response(result)

    def cabinets_dropdown(self, request):
        from apps.cabinets.models import Cabinet
        cabinets = Cabinet.objects.filter(
            secretaries=request.user
        ).distinct()

        result = []
        for c in cabinets:
            info = {'id': c.id, 'name': c.name}
            if hasattr(c, 'address') and c.address:
                info['address'] = c.address
            result.append(info)

        return Response(result)

    # ── ANNULATION ──

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_appointment(self, request, pk=None):
        record = get_object_or_404(self.get_queryset(), pk=pk)
        if record.status in ['completed', 'cancelled']:
            return Response(
                {"detail": "Ce rendez-vous ne peut plus être annulé."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = AppointmentCancelSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        record.status = 'cancelled'
        record.cancellation_reason = serializer.validated_data['cancellation_reason']
        record.cancellation_notes = serializer.validated_data.get('cancellation_notes', '')
        record.last_modified_by = request.user
        record.save()
        result = AppointmentDetailSerializer(record, context={'request': request})
        return Response(result.data)
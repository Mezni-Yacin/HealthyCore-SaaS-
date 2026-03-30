from rest_framework import viewsets, status, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import PermissionDenied, ValidationError

from django.utils import timezone as dtz
from django.db.models import Count, Q, Avg, Min, Max
from django.shortcuts import get_object_or_404
from apps.users.models import City, Governorate, MedicalSpecialty, User
from .models import Cabinet, Doctor, DoctorAvailability, DoctorUnavailability
from .serializers import (
    CabinetListSerializer,
    CabinetDetailSerializer,
    CabinetWriteSerializer,
    MedicalSpecialtySerializer,
    DoctorListSerializer, DoctorDetailSerializer, DoctorWriteSerializer,
    DoctorCabinetWriteSerializer,
    DoctorAvailabilitySerializer,
    DoctorUnavailabilitySerializer,
    DoctorSecretaryListSerializer,
    DoctorSecretaryCreateSerializer,
    DoctorSecretaryUpdateSerializer,
    PublicCabinetSerializer,
    PublicCabinetDetailSerializer,
)
from apps.users.permissions import IsSuperAdmin


# ====================== PAGINATION CABINETS ======================

class CabinetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ====================== VIEWSET CABINETS (Super Admin) ======================

class CabinetViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = CabinetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'name', 'email', 'address', 'phone_number',
        'owner__first_name', 'owner__last_name', 'owner__email',
        'city__name', 'specialties__name',
    ]
    ordering_fields = ['name', 'created_at', 'is_active', 'cnam_affiliated', 'city__name', 'owner__last_name']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Cabinet.objects.select_related(
            'owner', 'city', 'city__governorate'
        ).prefetch_related('specialties', 'secretaries', 'doctors', 'doctors__specialty')
        include_deleted = self.request.query_params.get('include_deleted')
        if not include_deleted or include_deleted.lower() != 'true':
            queryset = queryset.filter(is_deleted=False)
        params = self.request.query_params
        city = params.get('city')
        if city:
            queryset = queryset.filter(city_id=city)
        owner = params.get('owner')
        if owner:
            queryset = queryset.filter(owner_id=owner)
        is_active = params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        cnam = params.get('cnam_affiliated')
        if cnam is not None:
            queryset = queryset.filter(cnam_affiliated=cnam.lower() == 'true')
        has_logo = params.get('has_logo')
        if has_logo and has_logo.lower() == 'true':
            queryset = queryset.filter(logo__isnull=False)
        specialty = params.get('specialty')
        if specialty:
            queryset = queryset.filter(specialties__id=specialty)
        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CabinetDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return CabinetWriteSerializer
        return CabinetListSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_create(self, serializer):
        cabinet = serializer.save()
        # ✅ FIX : Auto-lier le profil médecin du propriétaire au M2M doctors
        try:
            doctor = cabinet.owner.doctor_profile
            if doctor not in cabinet.doctors.all():
                cabinet.doctors.add(doctor)
                print(f"[CABINET CREATED] Doctor linked to cabinet: {cabinet.name}")
        except AttributeError:
            print(f"[CABINET CREATED] ⚠️ Owner has no doctor profile for cabinet: {cabinet.name}")
        print(f"[CABINET CREATED] {self.request.user.username} created cabinet: {cabinet.name}")

    def perform_update(self, serializer):
        cabinet = serializer.save()
        # ✅ FIX : S'assurer que le propriétaire médecin est dans le M2M doctors
        try:
            doctor = cabinet.owner.doctor_profile
            if doctor not in cabinet.doctors.all():
                cabinet.doctors.add(doctor)
        except AttributeError:
            pass
        print(f"[CABINET UPDATED] {self.request.user.username} updated cabinet: {cabinet.name}")

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.is_active = False
        instance.deleted_at = dtz.now()
        instance.secretaries.clear()
        instance.specialties.clear()
        instance.save()
        print(f"[CABINET DELETED] {self.request.user.username} soft-deleted cabinet: {instance.name}")

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        cabinet = self.get_object()
        cabinet.is_active = True
        cabinet.is_deleted = False
        cabinet.deleted_at = None
        cabinet.save()
        return Response({"detail": f"Cabinet '{cabinet.name}' activé."})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        cabinet = self.get_object()
        cabinet.is_active = False
        cabinet.save()
        return Response({"detail": f"Cabinet '{cabinet.name}' désactivé."})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = Cabinet.objects.filter(is_deleted=False).count()
        active = Cabinet.objects.filter(is_deleted=False, is_active=True).count()
        inactive = total - active
        cnam = Cabinet.objects.filter(is_deleted=False, cnam_affiliated=True).count()
        with_logo = Cabinet.objects.filter(is_deleted=False, logo__isnull=False).count()
        by_governorate = (
            Cabinet.objects.filter(is_deleted=False)
            .values('city__governorate__name').annotate(count=Count('id')).order_by('city__governorate__name')
        )
        this_month = Cabinet.objects.filter(is_deleted=False, created_at__month=dtz.now().month, created_at__year=dtz.now().year).count()
        return Response({
            'total': total, 'active': active, 'inactive': inactive, 'cnam_affiliated': cnam,
            'with_logo': with_logo, 'created_this_month': this_month,
            'by_governorate': {item['city__governorate__name'] or 'Non défini': item['count'] for item in by_governorate},
        })

    @action(detail=False, methods=['get'])
    def specialties(self, request):
        specialties = MedicalSpecialty.objects.all().order_by('name')
        return Response(MedicalSpecialtySerializer(specialties, many=True).data)

    @action(detail=False, methods=['get'])
    def doctors(self, request):
        doctors = User.objects.filter(role='doctor', is_active=True).order_by('last_name', 'first_name')
        return Response([{'id': d.id, 'full_name': d.get_full_name(), 'email': d.email,
                         'phone_number': str(d.phone_number) if d.phone_number else None} for d in doctors])

    @action(detail=False, methods=['get'])
    def secretaries_list(self, request):
        secretaries = User.objects.filter(role='secretary', is_active=True).order_by('last_name', 'first_name')
        return Response([{'id': s.id, 'full_name': s.get_full_name(), 'email': s.email} for s in secretaries])


# ====================== PAGINATION DOCTORS ======================

class DoctorPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100


# ====================== VIEWSET DOCTORS (Super Admin) ======================

class DoctorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = DoctorPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'user__first_name', 'user__last_name', 'user__email',
        'license_number', 'specialty__name', 'specialty__code', 'bio',
    ]
    ordering_fields = [
        'user__last_name', 'specialty__name', 'rating',
        'years_experience', 'consultation_price', 'review_count',
    ]
    ordering = ['user__last_name', 'user__first_name']

    def get_queryset(self):
        queryset = Doctor.objects.select_related('user', 'specialty').prefetch_related('cabinets', 'availabilities')
        params = self.request.query_params
        specialty = params.get('specialty')
        if specialty:
            queryset = queryset.filter(specialty_id=specialty)
        accepts = params.get('accepts_new_patients')
        if accepts is not None:
            queryset = queryset.filter(accepts_new_patients=accepts.lower() == 'true')
        tele = params.get('teleconsultation_available')
        if tele is not None:
            queryset = queryset.filter(teleconsultation_available=tele.lower() == 'true')
        has_cabinet = params.get('has_cabinet')
        if has_cabinet and has_cabinet.lower() == 'true':
            queryset = queryset.filter(cabinets__isnull=False).distinct()
        user_active = params.get('is_active')
        if user_active is not None:
            queryset = queryset.filter(user__is_active=user_active.lower() == 'true')
        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return DoctorDetailSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return DoctorWriteSerializer
        return DoctorListSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_create(self, serializer):
        doctor = serializer.save()
        # ✅ FIX : Lier automatiquement le médecin à ses cabinets (via le champ cabinets du serializer)
        print(f"[DOCTOR CREATED] Dr. {doctor.user.get_full_name()} ({doctor.specialty.name})")

    def perform_update(self, serializer):
        doctor = serializer.save()
        print(f"[DOCTOR UPDATED] Dr. {doctor.user.get_full_name()} ({doctor.specialty.name})")

    def perform_destroy(self, instance):
        cabinets_count = instance.cabinets.count()
        availabilities_count = instance.availabilities.count()
        unavailabilities_count = instance.unavailabilities.count()
        if cabinets_count > 0:
            from rest_framework import serializers as drf_s
            raise drf_s.ValidationError({"detail": f"Impossible de supprimer Dr. {instance.user.get_full_name()} : {cabinets_count} cabinet(s) rattaché(s)."})
        if availabilities_count > 0 or unavailabilities_count > 0:
            from rest_framework import serializers as drf_s
            raise drf_s.ValidationError({"detail": f"Impossible de supprimer Dr. {instance.user.get_full_name()} : disponibilités/indisponibilités liées."})
        if instance.profile_photo:
            instance.profile_photo.delete(save=False)
        instance.delete()
        print(f"[DOCTOR DELETED] Dr. {instance.user.get_full_name()}")

    @action(detail=True, methods=['post'])
    def toggle_patients(self, request, pk=None):
        doctor = self.get_object()
        doctor.accepts_new_patients = not doctor.accepts_new_patients
        doctor.save()
        state = "accepte" if doctor.accepts_new_patients else "n'accepte plus"
        return Response({"detail": f"Dr. {doctor.user.get_full_name()} {state} de nouveaux patients.", "accepts_new_patients": doctor.accepts_new_patients})

    @action(detail=True, methods=['post'])
    def toggle_tele(self, request, pk=None):
        doctor = self.get_object()
        doctor.teleconsultation_available = not doctor.teleconsultation_available
        doctor.save()
        state = "active" if doctor.teleconsultation_available else "désactive"
        return Response({"detail": f"Téléconsultation {state} pour Dr. {doctor.user.get_full_name()}.", "teleconsultation_available": doctor.teleconsultation_available})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = Doctor.objects.count()
        accepting = Doctor.objects.filter(accepts_new_patients=True).count()
        tele = Doctor.objects.filter(teleconsultation_available=True).count()
        with_cabinet = Doctor.objects.filter(cabinets__isnull=False).distinct().count()
        avg_exp = Doctor.objects.aggregate(Avg('years_experience'))['years_experience__avg']
        avg_price = Doctor.objects.aggregate(Avg('consultation_price'))['consultation_price__avg']
        by_specialty = Doctor.objects.values('specialty__name').annotate(count=Count('id')).order_by('specialty__name')
        return Response({
            'total': total, 'accepting_new_patients': accepting, 'teleconsultation_available': tele,
            'with_cabinet': with_cabinet, 'without_cabinet': total - with_cabinet,
            'avg_years_experience': round(avg_exp, 1) if avg_exp else 0,
            'avg_consultation_price': round(float(avg_price), 3) if avg_price else 0,
            'by_specialty': {item['specialty__name'] or 'Non défini': item['count'] for item in by_specialty},
        })

    @action(detail=False, methods=['get'])
    def available_users(self, request):
        existing = Doctor.objects.values_list('user_id', flat=True)
        users = User.objects.filter(role='doctor').exclude(id__in=existing).order_by('last_name', 'first_name')
        return Response([{'id': u.id, 'full_name': u.get_full_name(), 'email': u.email,
                         'phone_number': str(u.phone_number) if u.phone_number else None,
                         'is_active': u.is_active} for u in users])


# ====================== VIEWSET CABINETS DU MÉDECIN (PROPRIÉTAIRE) ======================

class DoctorCabinetViewSet(viewsets.ModelViewSet):
    """
    Gestion des cabinets par le médecin propriétaire.
    Le médecin ne voit et ne modifie que SES propres cabinets.
    """
    permission_classes = [IsAuthenticated]
    pagination_class = CabinetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email', 'address', 'phone_number', 'city__name']
    ordering_fields = ['name', 'created_at', 'is_active']
    ordering = ['-created_at']

    def get_queryset(self):
        return Cabinet.objects.filter(
            owner=self.request.user, is_deleted=False
        ).select_related('city', 'city__governorate').prefetch_related('specialties', 'doctors')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CabinetDetailSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return DoctorCabinetWriteSerializer
        return CabinetListSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_create(self, serializer):
        cabinet = serializer.save(owner=self.request.user)
        # ✅ FIX : Auto-lier le profil médecin au M2M doctors du cabinet
        try:
            doctor = self.request.user.doctor_profile
            if doctor not in cabinet.doctors.all():
                cabinet.doctors.add(doctor)
                print(f"[MY CABINET] Doctor linked to cabinet: {cabinet.name}")
        except AttributeError:
            print(f"[MY CABINET] ⚠️ User has no doctor profile for cabinet: {cabinet.name}")
        print(f"[MY CABINET CREATED] {self.request.user.username} created cabinet: {cabinet.name}")

    def perform_update(self, serializer):
        cabinet = serializer.save()
        # ✅ FIX : S'assurer que le médecin est bien dans le M2M doctors
        try:
            doctor = self.request.user.doctor_profile
            if doctor not in cabinet.doctors.all():
                cabinet.doctors.add(doctor)
        except AttributeError:
            pass
        print(f"[MY CABINET UPDATED] {self.request.user.username} updated cabinet: {cabinet.name}")

    def perform_destroy(self, instance):
        if instance.owner != self.request.user:
            raise PermissionDenied("Vous ne pouvez supprimer que vos propres cabinets.")
        instance.is_deleted = True
        instance.is_active = False
        instance.deleted_at = dtz.now()
        instance.specialties.clear()
        instance.save()
        print(f"[MY CABINET DELETED] {self.request.user.username} soft-deleted cabinet: {instance.name}")

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        cabinet = self.get_object()
        cabinet.is_active = not cabinet.is_active
        cabinet.save()
        state = "activé" if cabinet.is_active else "désactivé"
        return Response({
            "detail": f"Cabinet '{cabinet.name}' {state}.",
            "is_active": cabinet.is_active,
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        my = Cabinet.objects.filter(owner=request.user, is_deleted=False)
        total = my.count()
        active = my.filter(is_active=True).count()
        cnam = my.filter(cnam_affiliated=True).count()
        with_logo = my.filter(logo__isnull=False).count()
        this_month = my.filter(created_at__month=dtz.now().month, created_at__year=dtz.now().year).count()
        return Response({
            'total': total, 'active': active, 'inactive': total - active,
            'cnam_affiliated': cnam, 'with_logo': with_logo, 'created_this_month': this_month,
        })

    @action(detail=False, methods=['get'])
    def dropdown_specialties(self, request):
        specialties = MedicalSpecialty.objects.all().order_by('name')
        return Response(MedicalSpecialtySerializer(specialties, many=True).data)

    @action(detail=False, methods=['get'])
    def dropdown_cities(self, request):
        governorate_id = request.query_params.get('governorate')
        cities = City.objects.select_related('governorate').order_by('name')
        if governorate_id:
            cities = cities.filter(governorate_id=governorate_id)
        return Response([
            {'id': c.id, 'name': c.name, 'governorate_id': c.governorate_id,
             'governorate_name': c.governorate.name}
            for c in cities
        ])

    @action(detail=False, methods=['get'])
    def dropdown_governorates(self, request):
        governorates = Governorate.objects.all().order_by('name')
        return Response([{'id': g.id, 'name': g.name} for g in governorates])


# ====================== VIEWSET DISPONIBILITÉS DU MÉDECIN ======================

class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    """
    Gestion des disponibilités hebdomadaires du médecin connecté.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['day']
    ordering_fields = ['day', 'start_time', 'end_time', 'slot_duration']
    ordering = ['day', 'start_time']

    def get_queryset(self):
        return DoctorAvailability.objects.filter(
            doctor__user=self.request.user
        ).order_by('day', 'start_time')

    def get_serializer_class(self):
        return DoctorAvailabilitySerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_create(self, serializer):
        try:
            doctor = self.request.user.doctor_profile
        except AttributeError:
            raise PermissionDenied("Vous n'avez pas de profil médecin.")
        serializer.save(doctor=doctor)
        print(f"[AVAILABILITY CREATED] {self.request.user.username}")

    def perform_update(self, serializer):
        serializer.save()
        print(f"[AVAILABILITY UPDATED] {self.request.user.username}")

    def perform_destroy(self, instance):
        if instance.doctor.user != self.request.user:
            raise PermissionDenied("Vous ne pouvez supprimer que vos propres disponibilités.")
        instance.delete()
        print(f"[AVAILABILITY DELETED] {self.request.user.username}")

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        availability = self.get_object()
        availability.is_available = not availability.is_available
        availability.save()
        state = "activée" if availability.is_available else "désactivée"
        return Response({
            "detail": f"Disponibilité {state}.",
            "is_available": availability.is_available,
        })


# ====================== VIEWSET INDISPONIBILITÉS DU MÉDECIN ======================

class DoctorUnavailabilityViewSet(viewsets.ModelViewSet):
    """
    Gestion des indisponibilités du médecin connecté.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['reason', 'description']
    ordering_fields = ['start_datetime', 'end_datetime', 'reason']
    ordering = ['-start_datetime']

    def get_queryset(self):
        return DoctorUnavailability.objects.filter(
            doctor__user=self.request.user
        ).order_by('-start_datetime')

    def get_serializer_class(self):
        return DoctorUnavailabilitySerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_create(self, serializer):
        try:
            doctor = self.request.user.doctor_profile
        except AttributeError:
            raise PermissionDenied("Vous n'avez pas de profil médecin.")
        serializer.save(doctor=doctor)
        print(f"[UNAVAILABILITY CREATED] {self.request.user.username}")

    def perform_update(self, serializer):
        serializer.save()
        print(f"[UNAVAILABILITY UPDATED] {self.request.user.username}")

    def perform_destroy(self, instance):
        if instance.doctor.user != self.request.user:
            raise PermissionDenied("Vous ne pouvez supprimer que vos propres indisponibilités.")
        instance.delete()
        print(f"[UNAVAILABILITY DELETED] {self.request.user.username}")


# ====================== VIEWSET SECRÉTAIRES DU MÉDECIN ======================

class DoctorSecretaryViewSet(viewsets.GenericViewSet):
    """
    Gestion des secrétaires par le médecin propriétaire.
    """
    permission_classes = [IsAuthenticated]

    def _get_doctor_cabinets(self):
        return Cabinet.objects.filter(owner=self.request.user, is_deleted=False)

    def _get_secretary_ids(self):
        return self._get_doctor_cabinets().values_list('secretaries', flat=True).distinct()

    def _check_secretary_access(self, pk):
        secretary = get_object_or_404(User, pk=pk, role='secretary')
        if not self._get_doctor_cabinets().filter(secretaries=secretary).exists():
            raise PermissionDenied("Ce secrétaire n'est pas assigné à vos cabinets.")
        return secretary

    def list(self, request):
        secretary_ids = self._get_secretary_ids()
        secretaries = User.objects.filter(id__in=secretary_ids).order_by('last_name', 'first_name')
        serializer = DoctorSecretaryListSerializer(secretaries, many=True, context={'request': request})
        return Response(serializer.data)

    def create(self, request):
        serializer = DoctorSecretaryCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        secretary = serializer.save()
        generated_password = getattr(secretary, '_generated_password', None)
        list_serializer = DoctorSecretaryListSerializer(secretary, context={'request': request})
        data = list_serializer.data
        if generated_password:
            data['generated_password'] = generated_password
            data['username'] = secretary.username
        print(f"[SECRETARY CREATED] {request.user.username} created secretary: {secretary.get_full_name()}")
        return Response(data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        secretary = self._check_secretary_access(pk)
        serializer = DoctorSecretaryListSerializer(secretary, context={'request': request})
        return Response(serializer.data)

    def update(self, request, pk=None):
        secretary = self._check_secretary_access(pk)
        serializer = DoctorSecretaryUpdateSerializer(secretary, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        print(f"[SECRETARY UPDATED] {request.user.username} updated: {secretary.get_full_name()}")
        list_serializer = DoctorSecretaryListSerializer(secretary, context={'request': request})
        return Response(list_serializer.data)

    def partial_update(self, request, pk=None):
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        secretary = self._check_secretary_access(pk)
        cabinets = self._get_doctor_cabinets().filter(secretaries=secretary)
        cabinet_names = list(cabinets.values_list('name', flat=True))
        for cabinet in cabinets:
            cabinet.secretaries.remove(secretary)
        print(f"[SECRETARY REMOVED] {request.user.username} removed {secretary.get_full_name()} from cabinets: {cabinet_names}")
        return Response({"detail": f"{secretary.get_full_name()} retiré(e) de vos cabinets ({', '.join(cabinet_names)})."})

    @action(detail=False, methods=['post'])
    def assign(self, request):
        secretary_id = request.data.get('secretary')
        cabinet_id = request.data.get('cabinet')
        if not secretary_id or not cabinet_id:
            raise ValidationError({"detail": "Les champs 'secretary' et 'cabinet' sont obligatoires."})
        cabinet = get_object_or_404(Cabinet, pk=cabinet_id, owner=request.user, is_deleted=False)
        secretary = get_object_or_404(User, pk=secretary_id, role='secretary')
        if cabinet.secretaries.filter(pk=secretary_id).exists():
            raise ValidationError({"detail": f"{secretary.get_full_name()} est déjà assigné(e) au cabinet '{cabinet.name}'."})
        cabinet.secretaries.add(secretary)
        print(f"[SECRETARY ASSIGNED] {request.user.username} assigned {secretary.get_full_name()} to cabinet: {cabinet.name}")
        return Response({
            "detail": f"{secretary.get_full_name()} ajouté(e) au cabinet '{cabinet.name}'.",
            "secretary": DoctorSecretaryListSerializer(secretary, context={'request': request}).data,
        })

    @action(detail=False, methods=['post'])
    def unassign(self, request):
        secretary_id = request.data.get('secretary')
        cabinet_id = request.data.get('cabinet')
        if not secretary_id or not cabinet_id:
            raise ValidationError({"detail": "Les champs 'secretary' et 'cabinet' sont obligatoires."})
        cabinet = get_object_or_404(Cabinet, pk=cabinet_id, owner=request.user, is_deleted=False)
        secretary = get_object_or_404(User, pk=secretary_id, role='secretary')
        if not cabinet.secretaries.filter(pk=secretary_id).exists():
            raise ValidationError({"detail": f"{secretary.get_full_name()} n'est pas dans le cabinet '{cabinet.name}'."})
        cabinet.secretaries.remove(secretary)
        print(f"[SECRETARY UNASSIGNED] {request.user.username} removed {secretary.get_full_name()} from cabinet: {cabinet.name}")
        return Response({
            "detail": f"{secretary.get_full_name()} retiré(e) du cabinet '{cabinet.name}'.",
            "secretary": DoctorSecretaryListSerializer(secretary, context={'request': request}).data,
        })

    @action(detail=False, methods=['get'])
    def available(self, request):
        assigned_ids = self._get_secretary_ids()
        available = User.objects.filter(role='secretary', is_active=True).exclude(id__in=assigned_ids).order_by('last_name', 'first_name')
        return Response([
            {'id': u.id, 'full_name': u.get_full_name(), 'email': u.email,
             'phone_number': str(u.phone_number) if u.phone_number else None}
            for u in available
        ])

    @action(detail=False, methods=['get'])
    def my_cabinets(self, request):
        cabinets = self._get_doctor_cabinets().order_by('name')
        return Response([{'id': c.id, 'name': c.name, 'is_active': c.is_active} for c in cabinets])


# ====================== ANNUAIRE PUBLIC (pour patients) ======================

class PublicCabinetPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 50


class PublicCabinetViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Annuaire public des cabinets médicaux (vue patient).
    Accessible à tous les utilisateurs authentifiés.
    Ne retourne que les cabinets actifs et non supprimés.

    Endpoints :
        GET  /api/cabinets/directory/                    → Lister les cabinets (paginé, filtrable)
        GET  /api/cabinets/directory/<id>/               → Détail d'un cabinet
        GET  /api/cabinets/directory/filters/            → Options de filtres (spécialités, villes, etc.)
    """
    permission_classes = [IsAuthenticated]
    pagination_class = PublicCabinetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'name', 'address', 'email',
        'city__name', 'city__governorate__name',
        'specialties__name',
        'doctors__user__first_name', 'doctors__user__last_name',
    ]
    ordering_fields = [
        'name', 'city__name', 'created_at',
    ]
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Retourne TOUS les cabinets actifs et non supprimés.
        ✅ FIX : Ajouté .distinct() après annotate() pour éviter les doublons
        """
        queryset = Cabinet.objects.filter(
            is_active=True, is_deleted=False,
        ).select_related(
            'city', 'city__governorate', 'owner'
        ).prefetch_related(
            'specialties',
            'doctors', 'doctors__user', 'doctors__specialty',
            'doctors__availabilities',
        ).annotate(
            avg_rating=Avg('doctors__rating'),
            doctor_count=Count('doctors', distinct=True),
        ).distinct()  # ✅ FIX : éviter les doublons du JOIN avec Avg
        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PublicCabinetDetailSerializer
        return PublicCabinetSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def list(self, request, *args, **kwargs):
        """
        Liste les cabinets avec filtres personnalisés.
        """
        queryset = self.get_queryset()

        # ── Appliquer SearchFilter + OrderingFilter de DRF ──
        queryset = self.filter_queryset(queryset)

        # ── Filtres personnalisés additionnels ──
        params = request.query_params

        # Filtre par spécialité
        specialty = params.get('specialty')
        if specialty:
            queryset = queryset.filter(specialties__id=specialty).distinct()

        # Filtre par ville
        city = params.get('city')
        if city:
            queryset = queryset.filter(city_id=city)

        # Filtre par gouvernorat
        governorate = params.get('governorate')
        if governorate:
            queryset = queryset.filter(city__governorate_id=governorate)

        # Filtre CNAM
        cnam = params.get('cnam')
        if cnam and cnam.lower() == 'true':
            queryset = queryset.filter(cnam_affiliated=True)

        # Filtre téléconsultation
        tele = params.get('teleconsultation')
        if tele and tele.lower() == 'true':
            queryset = queryset.filter(
                doctors__teleconsultation_available=True
            ).distinct()

        # Filtre accepte nouveaux patients
        accepts = params.get('accepts_patients')
        if accepts and accepts.lower() == 'true':
            queryset = queryset.filter(
                doctors__accepts_new_patients=True
            ).distinct()

        # Filtre prix min
        min_price = params.get('min_price')
        if min_price:
            try:
                queryset = queryset.filter(
                    doctors__consultation_price__gte=float(min_price)
                ).distinct()
            except ValueError:
                pass

        # Filtre prix max
        max_price = params.get('max_price')
        if max_price:
            try:
                queryset = queryset.filter(
                    doctors__consultation_price__lte=float(max_price)
                ).distinct()
            except ValueError:
                pass

        # ── Tri personnalisé (pour les champs annotés) ──
        ordering = params.get('ordering', '-created_at')
        if ordering == 'avg_rating':
            queryset = queryset.order_by('-avg_rating')
        elif ordering == '-avg_rating':
            queryset = queryset.order_by('avg_rating')
        elif ordering == 'doctor_count':
            queryset = queryset.order_by('doctor_count')
        elif ordering == '-doctor_count':
            queryset = queryset.order_by('-doctor_count')

        # ── Pagination ──
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def filters(self, request):
        """Retourne les options de filtres pour l'annuaire."""
        # Spécialités
        specialties = MedicalSpecialty.objects.all().order_by('name')

        # Villes (filtrable par gouvernorat)
        gov_id = request.query_params.get('governorate')
        if gov_id:
            cities = City.objects.filter(governorate_id=gov_id).order_by('name')
        else:
            cities = City.objects.all().select_related('governorate').order_by('name')

        # Gouvernorats
        governorates = Governorate.objects.all().order_by('name')

        # Prix min/max (parmi les médecins actifs)
        prices = Doctor.objects.filter(
            user__is_active=True,
            consultation_price__isnull=False,
        ).aggregate(min_price=Min('consultation_price'), max_price=Max('consultation_price'))

        return Response({
            'specialties': [{'id': s.id, 'name': s.name, 'code': s.code} for s in specialties],
            'cities': [{'id': c.id, 'name': c.name, 'governorate_id': c.governorate_id,
                         'governorate_name': c.governorate.name if c.governorate else ''} for c in cities],
            'governorates': [{'id': g.id, 'name': g.name} for g in governorates],
            'price_range': {
                'min': float(prices['min_price']) if prices['min_price'] else 0,
                'max': float(prices['max_price']) if prices['max_price'] else 0,
            },
        })
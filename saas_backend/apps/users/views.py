# apps/users/views.py
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import viewsets, status, filters
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db.models import Q,Count
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db import transaction

from .models import User, Patient, UserDocument, Subscription, SubscriptionPlan, City, Governorate, MedicalSpecialty
from .serializers import (
    UserSerializer, UserProfileSerializer, PatientProfileSerializer,
    UserDocumentSerializer, SubscriptionSerializer, SubscriptionCreateSerializer,
    SubscriptionPlanSerializer, UserCreateSerializer, UserUpdateSerializer,
    UserDetailSerializer, CityListSerializer, CityWriteSerializer, GovernorateSerializer,MedicalSpecialtyListSerializer, MedicalSpecialtyWriteSerializer
)
from .permissions import IsSuperAdmin


# ====================== PAGINATION ======================

class CityPagination(PageNumberPagination):
    """Pagination pour les villes — 50 par page par défaut, max 200"""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


# ====================== AUTHENTIFICATION ======================

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


# ====================== VUES PROFIL UTILISATEUR ======================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_me(request):
    """Retourne les infos de l'utilisateur connecté"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Gestion du profil de l'utilisateur connecté"""
    user = request.user
    if request.method == 'GET':
        serializer = UserProfileSerializer(user, context={'request': request})
        return Response(serializer.data)
    if request.method == 'PATCH':
        forbidden_fields = {'role', 'username', 'email', 'is_verified', 'two_factor_enabled'}
        if any(field in request.data for field in forbidden_fields):
            return Response(
                {"detail": "Modification interdite sur les champs sensibles (role, email, username, etc)."},
                status=403
            )
        serializer = UserProfileSerializer(
            user, data=request.data, partial=True, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def patient_profile(request):
    """Gestion du profil patient"""
    if request.user.role != 'patient':
        return Response({"detail": "Seuls les patients peuvent accéder à ce profil."}, status=403)
    if request.method == 'GET':
        try:
            patient = Patient.objects.get(user=request.user)
            serializer = PatientProfileSerializer(patient)
            return Response(serializer.data)
        except Patient.DoesNotExist:
            return Response({})
    if request.method == 'PATCH':
        try:
            patient = Patient.objects.get(user=request.user)
            serializer = PatientProfileSerializer(patient, data=request.data, partial=True)
        except Patient.DoesNotExist:
            serializer = PatientProfileSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(user=request.user)
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


# ====================== DOCUMENTS ======================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_document(request):
    serializer = UserDocumentSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user, uploaded_by=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_document(request, pk):
    try:
        doc = UserDocument.objects.get(pk=pk, user=request.user)
        doc.delete()
        return Response(status=204)
    except UserDocument.DoesNotExist:
        return Response({"detail": "Document non trouvé ou non autorisé."}, status=404)


# ====================== VIEWSET UTILISATEURS (SUPER ADMIN) ======================

class UserManagementViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone_number']
    ordering_fields = ['created_at', 'username', 'email', 'role', 'is_active']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = User.objects.select_related('city', 'city__governorate').prefetch_related('documents')
        
        role = self.request.query_params.get('role')
        is_active = self.request.query_params.get('is_active')
        is_verified = self.request.query_params.get('is_verified')
        search = self.request.query_params.get('search')
        
        if role:
            queryset = queryset.filter(role=role)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        if is_verified is not None:
            queryset = queryset.filter(is_verified=is_verified.lower() == 'true')
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone_number__icontains=search)
            )
        
        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'retrieve':
            return UserDetailSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        print(f"[USER CREATED] {self.request.user.username} created user {user.username}")

    def perform_update(self, serializer):
        user = serializer.save()
        print(f"[USER UPDATED] {self.request.user.username} updated user {user.username}")

    def perform_destroy(self, instance):
        if instance.id == self.request.user.id:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError({"detail": "Vous ne pouvez pas supprimer votre propre compte."})
        
        if hasattr(instance, 'subscription') and instance.subscription.is_active:
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError({
                "detail": "Impossible de supprimer un utilisateur avec un abonnement actif."
            })
        
        instance.delete()

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('new_password')
        
        if not new_password or len(new_password) < 8:
            return Response(
                {"detail": "Le mot de passe doit contenir au moins 8 caractères."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(new_password)
        user.save()
        return Response({"detail": f"Mot de passe réinitialisé pour {user.username}."})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({"detail": f"Utilisateur {user.username} activé."})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        if user.id == request.user.id:
            return Response(
                {"detail": "Vous ne pouvez pas désactiver votre propre compte."},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.is_active = False
        user.save()
        return Response({"detail": f"Utilisateur {user.username} désactivé."})

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        user = self.get_object()
        user.is_verified = True
        user.save()
        return Response({"detail": f"Utilisateur {user.username} vérifié."})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        from django.db.models import Count
        
        total = User.objects.count()
        active = User.objects.filter(is_active=True).count()
        verified = User.objects.filter(is_verified=True).count()
        by_role = User.objects.values('role').annotate(count=Count('id')).order_by('role')
        
        this_month = User.objects.filter(
            created_at__month=timezone.now().month,
            created_at__year=timezone.now().year
        ).count()
        
        return Response({
            'total': total,
            'active': active,
            'inactive': total - active,
            'verified': verified,
            'unverified': total - verified,
            'created_this_month': this_month,
            'by_role': {item['role']: item['count'] for item in by_role}
        })

    @action(detail=False, methods=['get'])
    def by_role(self, request):
        role = request.query_params.get('role')
        if not role:
            return Response({"detail": "Paramètre 'role' requis."}, status=400)
        users = User.objects.filter(role=role, is_active=True)
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def without_subscription(self, request):
        """Retourne les utilisateurs sans abonnement"""
        users = User.objects.exclude(subscription__isnull=False)
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)


# ====================== VIEWSET PLANS D'ABONNEMENT ======================

class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]


# ====================== VIEWSET ABONNEMENTS ======================

class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.select_related('user', 'plan').all()
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return SubscriptionCreateSerializer
        return SubscriptionSerializer

    def create(self, request, *args, **kwargs):
        user_id = request.data.get('user')
        if user_id:
            if Subscription.objects.filter(user_id=user_id).exists():
                return Response(
                    {"detail": "Cet utilisateur possède déjà un abonnement actif."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        period = request.data.get('period', 'monthly')
        period_days = {'monthly': 30, 'quarterly': 90, 'semiannual': 180, 'yearly': 365}
        days = period_days.get(period, 30)
        end_date = timezone.now() + timezone.timedelta(days=days)
        
        data = request.data.copy()
        data['end_date'] = end_date
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        subscription = serializer.save(end_date=end_date)
        
        output_serializer = SubscriptionSerializer(subscription)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        new_period = request.data.get('period')
        if new_period and new_period != instance.period:
            period_days = {'monthly': 30, 'quarterly': 90, 'semiannual': 180, 'yearly': 365}
            days = period_days.get(new_period, 30)
            instance.end_date = timezone.now() + timezone.timedelta(days=days)
            instance.period = new_period
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        output_serializer = SubscriptionSerializer(instance)
        return Response(output_serializer.data)

    def perform_destroy(self, instance):
        instance.delete()


# ====================== VIEWSET VILLES (CRUD COMPLET) ======================

class CityViewSet(viewsets.ModelViewSet):
    """
    CRUD complet des villes — Réservé Super Admin

    Endpoints :
        GET    /users/cities/              → Lister (paginé)
        POST   /users/cities/              → Créer
        GET    /users/cities/<id>/         → Détail
        PUT    /users/cities/<id>/         → Mise à jour complète
        PATCH  /users/cities/<id>/         → Mise à jour partielle
        DELETE /users/cities/<id>/         → Supprimer

    Query params :
        ?search=tunis           → Recherche par nom, code postal ou gouvernorat
        ?governorate=1          → Filtrer par gouvernorat (ID)
        ?ordering=name          → Trier
        ?page=1&page_size=50    → Pagination
    """
    queryset = City.objects.select_related('governorate').all()
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = CityPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'postal_code', 'governorate__name']
    ordering_fields = ['name', 'postal_code', 'governorate__name', 'id']
    ordering = ['name']

    def get_queryset(self):
        """Permet le filtrage par gouvernorat via query param ?governorate=<id>"""
        queryset = super().get_queryset()
        governorate_id = self.request.query_params.get('governorate')
        if governorate_id:
            queryset = queryset.filter(governorate_id=governorate_id)
        return queryset

    def get_serializer_class(self):
        """Bascule entre serializer lecture et écriture"""
        if self.action in ['create', 'update', 'partial_update']:
            return CityWriteSerializer
        return CityListSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def perform_create(self, serializer):
        city = serializer.save()
        print(
            f"[CITY CREATED] {self.request.user.username} created city: "
            f"{city.name} ({city.governorate.name})"
        )

    def perform_update(self, serializer):
        city = serializer.save()
        print(
            f"[CITY UPDATED] {self.request.user.username} updated city: "
            f"{city.name} ({city.governorate.name})"
        )

    def perform_destroy(self, instance):
        """Vérifier qu'aucun utilisateur n'utilise cette ville avant suppression."""
        from rest_framework import serializers as drf_serializers

        users_count = User.objects.filter(city=instance).count()
        if users_count > 0:
            raise drf_serializers.ValidationError({
                "detail": (
                    f"Impossible de supprimer la ville '{instance.name}' : "
                    f"{users_count} utilisateur(s) sont rattaché(s) à cette ville. "
                    f"Réaffectez-les d'abord."
                )
            })

        print(
            f"[CITY DELETED] {self.request.user.username} deleted city: "
            f"{instance.name} ({instance.governorate.name})"
        )
        instance.delete()


# ====================== VIEWSET GOUVERNORATS (CRUD COMPLET) ======================

class GovernorateViewSet(viewsets.ModelViewSet):
    """
    CRUD complet des gouvernorats — Réservé Super Admin

    Endpoints :
        GET    /users/governorates/           → Lister
        POST   /users/governorates/           → Créer
        GET    /users/governorates/<id>/      → Détail
        PUT    /users/governorates/<id>/      → Mise à jour complète
        PATCH  /users/governorates/<id>/      → Mise à jour partielle
        DELETE /users/governorates/<id>/      → Supprimer

    Query params :
        ?search=tunis        → Recherche par nom ou code
        ?ordering=name       → Trier
    """
    queryset = Governorate.objects.all()
    serializer_class = GovernorateSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code', 'id']
    ordering = ['name']

    def perform_create(self, serializer):
        gov = serializer.save()
        print(f"[GOVERNORATE CREATED] {self.request.user.username} created governorate: {gov.name} ({gov.code})")

    def perform_update(self, serializer):
        gov = serializer.save()
        print(f"[GOVERNORATE UPDATED] {self.request.user.username} updated governorate: {gov.name} ({gov.code})")

    def perform_destroy(self, instance):
        from rest_framework import serializers as drf_serializers

        cities_count = instance.cities.count()
        if cities_count > 0:
            raise drf_serializers.ValidationError({
                "detail": (
                    f"Impossible de supprimer le gouvernorat '{instance.name}' : "
                    f"{cities_count} ville(s) sont rattachée(s). "
                    f"Supprimez ou réaffectez les villes d'abord."
                )
            })

        print(f"[GOVERNORATE DELETED] {self.request.user.username} deleted governorate: {instance.name} ({instance.code})")
        instance.delete()

# ─── ViewSet MedicalSpecialty ────────────────────────────────────────────

class MedicalSpecialtyViewSet(viewsets.ModelViewSet):
    """
    CRUD complet des spécialités médicales — Réservé Super Admin.

    Endpoints :
        GET    /api/users/specialties/           → Lister (recherche + tri)
        POST   /api/users/specialties/           → Créer
        GET    /api/users/specialties/<id>/      → Détail
        PATCH  /api/users/specialties/<id>/      → Modifier
        DELETE /api/users/specialties/<id>/      → Supprimer

    Query params :
        ?search=cardio         → Recherche nom/code
        ?ordering=name         → Tri
        ?page=1&page_size=20   → Pagination
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code']
    ordering = ['name']

    def get_queryset(self):
        return MedicalSpecialty.objects.annotate(
            cabinets_count=Count('cabinets', distinct=True),
            doctors_count=Count('doctors', distinct=True),
        )

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return MedicalSpecialtyWriteSerializer
        return MedicalSpecialtyListSerializer

    def perform_destroy(self, instance):
        """
        Protection : empêcher la suppression si des cabinets ou médecins
        sont liés à cette spécialité.
        """
        cabinets_count = instance.cabinets.count()
        doctors_count = instance.doctors.count()

        if cabinets_count > 0 or doctors_count > 0:
            raise ValidationError({
                'detail': (
                    f"Impossible de supprimer la spécialité '{instance.name}' : "
                    f"{cabinets_count} cabinet(s) et {doctors_count} médecin(s) y sont liés."
                )
            })

        instance.delete()

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques sur les spécialités médicales."""
        total = MedicalSpecialty.objects.count()
        with_cabinets = MedicalSpecialty.objects.filter(
            cabinets__isnull=False
        ).distinct().count()
        with_doctors = MedicalSpecialty.objects.filter(
            doctors__isnull=False
        ).distinct().count()

        return Response({
            'total': total,
            'with_cabinets': with_cabinets,
            'with_doctors': with_doctors,
            'unused': total - with_cabinets,
        })
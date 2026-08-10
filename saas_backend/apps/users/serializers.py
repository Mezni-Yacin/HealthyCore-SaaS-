# apps/users/serializers.py

from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import (
    User, City, Patient, InsuranceCompany, UserDocument,
    SubscriptionPlan, Subscription, Governorate, MedicalSpecialty
)


# ====================== SERIALIZERS DE BASE ======================

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    patient_profile = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'role', 'role_display', 
            'first_name', 'last_name', 'full_name', 'phone_number', 
            'is_active', 'is_verified', 'two_factor_enabled',
            'created_at', 'updated_at', 'patient_profile'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        return obj.get_full_name().strip() or obj.username

    def get_patient_profile(self, obj):
        if obj.role == 'patient':
            try:
                patient = obj.patient_profile
                return {
                    'date_of_birth': patient.date_of_birth,
                    'gender': patient.gender,
                }
            except:
                pass
        return None


# ====================== GOVERNORATE ======================

class GovernorateSerializer(serializers.ModelSerializer):
    """
    Serializer pour les gouvernorats avec validation renforcée.
    """
    class Meta:
        model = Governorate
        fields = ['id', 'name', 'code']

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le nom du gouvernorat est obligatoire.")
        if len(value) < 2:
            raise serializers.ValidationError(
                "Le nom du gouvernorat doit contenir au moins 2 caractères."
            )
        queryset = Governorate.objects.all()
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.filter(name__iexact=value).exists():
            raise serializers.ValidationError(
                f"Un gouvernorat avec le nom '{value}' existe déjà."
            )
        return value

    def validate_code(self, value):
        value = value.strip().upper()
        if not value:
            raise serializers.ValidationError("Le code du gouvernorat est obligatoire.")
        if len(value) > 10:
            raise serializers.ValidationError(
                "Le code ne doit pas dépasser 10 caractères."
            )
        queryset = Governorate.objects.all()
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.filter(code__iexact=value).exists():
            raise serializers.ValidationError(
                f"Un gouvernorat avec le code '{value}' existe déjà."
            )
        return value


# ====================== CITY SERIALIZERS ======================

class CitySerializer(serializers.ModelSerializer):
    """
    Serializer LECTURE basique pour les villes.
    Conservé pour compatibilité avec UserDetailSerializer (city_detail).
    """
    governorate_name = serializers.CharField(source='governorate.name', read_only=True)

    class Meta:
        model = City
        fields = ['id', 'name', 'governorate_name', 'postal_code']


class CityListSerializer(serializers.ModelSerializer):
    """
    Serializer LECTURE étendu pour les villes.
    Utilisé dans CityViewSet pour list() et retrieve().
    Retourne les infos complètes avec gouvernorat + code gouvernorat.
    """
    governorate_name = serializers.CharField(
        source='governorate.name', read_only=True
    )
    governorate_code = serializers.CharField(
        source='governorate.code', read_only=True
    )

    class Meta:
        model = City
        fields = [
            'id', 'name', 'governorate', 'governorate_name', 'governorate_code',
            'postal_code'
        ]
        read_only_fields = ['id', 'governorate_name', 'governorate_code']


class CityWriteSerializer(serializers.ModelSerializer):
    """
    Serializer ÉCRITURE pour les villes.
    Utilisé dans CityViewSet pour create(), update(), partial_update().
    - governorate : PrimaryKeyRelatedField (accepte l'ID du gouvernorat)
    - name + governorate : unicité gérée par unique_together du modèle
      + validation custom pour message d'erreur clair en français
    """
    governorate = serializers.PrimaryKeyRelatedField(
        queryset=Governorate.objects.all(),
        error_messages={
            'does_not_exist': "Le gouvernorat avec cet ID n'existe pas.",
            'null': 'Le gouvernorat est obligatoire.',
            'required': 'Le gouvernorat est obligatoire.',
        }
    )

    class Meta:
        model = City
        fields = ['id', 'name', 'governorate', 'postal_code']

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le nom de la ville est obligatoire.")
        if len(value) < 2:
            raise serializers.ValidationError(
                "Le nom de la ville doit contenir au moins 2 caractères."
            )
        return value

    def validate_postal_code(self, value):
        if value is not None:
            value = value.strip()
            if value and not value.isdigit():
                raise serializers.ValidationError(
                    "Le code postal doit contenir uniquement des chiffres."
                )
        return value

    def validate(self, attrs):
        """
        Vérifier l'unicité name + governorate (unique_together).
        Le modèle le fait aussi, mais on donne un message d'erreur plus clair.
        """
        name = attrs.get('name', '').strip()
        governorate = attrs.get('governorate')

        if name and governorate:
            queryset = City.objects.all()
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.filter(name__iexact=name, governorate=governorate).exists():
                raise serializers.ValidationError({
                    "name": f"Une ville nommée '{name}' existe déjà dans ce gouvernorat."
                })
        return attrs


class CityMinimalSerializer(serializers.ModelSerializer):
    """
    Serializer LECTURE minimale pour les villes.
    Utilisé par UserProfileSerializer (city_detail).
    """
    governorate_name = serializers.CharField(
        source='governorate.name', read_only=True
    )

    class Meta:
        model = City
        fields = ['id', 'name', 'governorate_name']


class InsuranceCompanyMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceCompany
        fields = ['id', 'name', 'is_cnam']


# ====================== SERIALIZER PATIENT ======================

class PatientProfileSerializer(serializers.ModelSerializer):
    insurance_company = InsuranceCompanyMinimalSerializer(read_only=True)
    age = serializers.ReadOnlyField()

    class Meta:
        model = Patient
        fields = [
            'id', 'date_of_birth', 'gender', 'blood_type', 'height', 'weight',
            'allergies', 'chronic_diseases', 'current_medications',
            'family_history', 'insurance_company',
            'insurance_number', 'emergency_contact_name', 'emergency_contact_phone',
            'consent_given', 'age'
        ]
        read_only_fields = ['id', 'insurance_company', 'consent_given', 'age']


# ====================== SERIALIZER DOCUMENT ======================

class UserDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)

    class Meta:
        model = UserDocument
        fields = [
            'id', 'title', 'document_type', 'document_type_display',
            'file', 'file_url', 'description', 'is_verified', 'created_at'
        ]
        read_only_fields = ['id', 'file_url', 'document_type_display', 'is_verified', 'created_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return None


# ====================== SERIALIZER PROFIL UTILISATEUR ======================

class UserProfileSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()
    city_detail = CityMinimalSerializer(source='city', read_only=True)
    patient_profile = PatientProfileSerializer(read_only=True)
    documents = UserDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'phone_number',
            'address', 'city', 'city_detail', 'profile_picture', 'profile_picture_url',
            'language_preference', 'role', 'is_verified', 'two_factor_enabled',
            'created_at', 'updated_at', 'patient_profile', 'documents',
        ]
        read_only_fields = [
            'id', 'username', 'email', 'role', 'is_verified',
            'two_factor_enabled', 'created_at', 'updated_at',
            'city_detail', 'profile_picture_url', 'patient_profile', 'documents',
        ]

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.profile_picture.url) if request else obj.profile_picture.url
        return None


# ====================== SERIALIZER CRUD UTILISATEUR ======================

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=False, min_length=8)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    city = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role', 'phone_number',
            'address', 'city', 'language_preference', 'is_active',
            'is_verified', 'two_factor_enabled', 'date_of_birth'
        ]
        read_only_fields = ['id']

    def validate(self, data):
        if self.instance is None:
            if 'password' in data and data.get('password'):
                if data.get('password') != data.get('password_confirm'):
                    raise serializers.ValidationError({
                        'password_confirm': 'Les mots de passe ne correspondent pas.'
                    })
        
        if data.get('role') == 'doctor' and not data.get('email'):
            raise serializers.ValidationError({
                'email': 'Les médecins doivent avoir une adresse email.'
            })
        
        return data

    def validate_username(self, value):
        queryset = User.objects.all()
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.filter(username=value).exists():
            raise serializers.ValidationError("Un utilisateur avec ce nom d'utilisateur existe déjà.")
        return value

    def validate_email(self, value):
        if not value:
            return value
        queryset = User.objects.all()
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.filter(email=value).exists():
            raise serializers.ValidationError("Un utilisateur avec cet email existe déjà.")
        return value

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        validated_data.pop('date_of_birth', None)
        password = validated_data.pop('password', None)
        
        user = User(**validated_data)
        
        if password:
            user.set_password(password)
        else:
            import random
            import string
            password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
            user.set_password(password)
        
        user.save()
        return user

    def update(self, instance, validated_data):
        validated_data.pop('password_confirm', None)
        validated_data.pop('date_of_birth', None)
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class UserUpdateSerializer(serializers.ModelSerializer):
    city = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.all(), required=False, allow_null=True
    )
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password',
            'first_name', 'last_name', 'role', 'phone_number',
            'address', 'city', 'language_preference', 'is_active',
            'is_verified', 'two_factor_enabled'
        ]
        read_only_fields = ['id']

    def validate_username(self, value):
        if User.objects.exclude(pk=self.instance.pk).filter(username=value).exists():
            raise serializers.ValidationError("Un utilisateur avec ce nom d'utilisateur existe déjà.")
        return value

    def validate_email(self, value):
        if value and User.objects.exclude(pk=self.instance.pk).filter(email=value).exists():
            raise serializers.ValidationError("Un utilisateur avec cet email existe déjà.")
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class UserDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    city_detail = CitySerializer(source='city', read_only=True)
    patient_profile = PatientProfileSerializer(read_only=True)
    subscription = serializers.SerializerMethodField()
    documents_count = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()

    # ✅ AJOUT : Méthode pour récupérer le profil médecin
    doctor_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'role_display', 'phone_number', 'address', 'city', 'city_detail',
            'profile_picture', 'profile_picture_url',
            'language_preference', 'is_active', 'is_verified', 'is_staff',
            'two_factor_enabled', 'created_at', 'updated_at',
            'patient_profile', 'doctor_profile', 'subscription', 'documents_count' # ✅ AJOUTé doctor_profile ici
        ]

    def get_full_name(self, obj):
        return obj.get_full_name().strip() or obj.username

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.profile_picture.url) if request else obj.profile_picture.url
        return None

    # ✅ AJOUT : Implémentation de la méthode pour le médecin
    def get_doctor_profile(self, obj):
        if obj.role == 'doctor' and hasattr(obj, 'doctor_profile'):
            doc = obj.doctor_profile
            return {
                'specialty_name': doc.specialty.name if doc.specialty else None,
                'license_number': doc.license_number,
                'years_experience': doc.years_experience,
                'consultation_price': str(doc.consultation_price)
            }
        return None


    def get_subscription(self, obj):
        try:
            sub = obj.subscription
            return {
                'id': sub.id,
                'plan_id': sub.plan.id,
                'plan_name': sub.plan.display_name,
                'plan_type': sub.plan.name,
                'period': sub.period,
                'is_active': sub.is_active,
                'end_date': sub.end_date,
            }
        except:
            return None

    def get_documents_count(self, obj):
        return obj.documents.count()


# ====================== SUBSCRIPTION PLAN SERIALIZER ======================

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    name_display = serializers.CharField(source='get_name_display', read_only=True)
    
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'name_display', 'display_name', 'description',
            'monthly_price', 'yearly_price',
            'max_doctors', 'max_secretaries', 'max_patients',
            'features', 'is_active', 'order', 'is_popular', 'discount_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'name_display', 'created_at', 'updated_at']

    def validate_display_name(self, value):
        queryset = SubscriptionPlan.objects.all()
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.filter(display_name=value).exists():
            raise serializers.ValidationError(
                "Un plan avec ce nom d'affichage existe déjà. Choisissez un nom unique."
            )
        return value

    def validate_monthly_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Le prix mensuel ne peut pas être négatif.")
        return value

    def validate_yearly_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Le prix annuel ne peut pas être négatif.")
        return value


# ====================== SUBSCRIPTION SERIALIZERS ======================

class SubscriptionSerializer(serializers.ModelSerializer):
    user_detail = serializers.SerializerMethodField()
    plan_name = serializers.CharField(source='plan.display_name', read_only=True)
    plan_type = serializers.CharField(source='plan.name', read_only=True)
    plan_detail = SubscriptionPlanSerializer(source='plan', read_only=True)
    days_remaining = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    period_display = serializers.CharField(source='get_period_display', read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'user', 'user_detail', 'plan', 'plan_name', 'plan_type', 'plan_detail',
            'period', 'period_display', 'start_date', 'end_date', 'is_active',
            'auto_renew', 'payment_method', 'stripe_subscription_id',
            'days_remaining', 'is_expired'
        ]
        read_only_fields = ['id', 'start_date', 'end_date']

    def get_user_detail(self, obj):
        if obj.user:
            return {
                "id": obj.user.id,
                "username": obj.user.username,
                "full_name": obj.user.get_full_name().strip() or obj.user.username,
                "role": obj.user.role,
                "role_display": obj.user.get_role_display(),
                "email": obj.user.email,
            }
        return None

    def get_days_remaining(self, obj):
        if obj.end_date:
            delta = obj.end_date - timezone.now()
            return max(0, delta.days)
        return None

    def get_is_expired(self, obj):
        if obj.end_date:
            return obj.end_date < timezone.now()
        return False


class SubscriptionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = [
            'id', 'user', 'plan', 'period',
            'is_active', 'auto_renew', 'payment_method'
        ]
    
    def validate_user(self, value):
        if Subscription.objects.filter(user=value).exists():
            raise serializers.ValidationError(
                "Cet utilisateur possède déjà un abonnement actif."
            )
        return value
# ─── Serializer READ/LIST pour MedicalSpecialty ─────────────────────────

class MedicalSpecialtyListSerializer(serializers.ModelSerializer):
    """Serializer LECTURE pour la liste des spécialités médicales."""
    cabinets_count = serializers.SerializerMethodField()
    doctors_count = serializers.SerializerMethodField()

    class Meta:
        model = MedicalSpecialty
        fields = [
            'id', 'name', 'code', 'description',
            'cabinets_count', 'doctors_count',
        ]
        read_only_fields = ['id']

    def get_cabinets_count(self, obj):
        return obj.cabinets.count()

    def get_doctors_count(self, obj):
        return obj.doctors.count()


# ─── Serializer WRITE (create/update) pour MedicalSpecialty ─────────────

class MedicalSpecialtyWriteSerializer(serializers.ModelSerializer):
    """Serializer ÉCRITURE pour créer / modifier une spécialité médicale."""

    class Meta:
        model = MedicalSpecialty
        fields = ['name', 'code', 'description']

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le nom de la spécialité est obligatoire.")
        if len(value) < 2:
            raise serializers.ValidationError(
                "Le nom doit contenir au moins 2 caractères."
            )
        return value

    def validate_code(self, value):
        value = value.strip().upper()
        if not value:
            raise serializers.ValidationError("Le code CNAM est obligatoire.")
        if len(value) < 2:
            raise serializers.ValidationError(
                "Le code doit contenir au moins 2 caractères."
            )
        if len(value) > 20:
            raise serializers.ValidationError(
                "Le code ne peut pas dépasser 20 caractères."
            )
        return value

    def validate_description(self, value):
        if value:
            return value.strip()
        return value


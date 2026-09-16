from rest_framework import serializers
from django.utils import timezone as dtz
from .models import Cabinet, Doctor, DoctorAvailability, DoctorUnavailability
from apps.users.models import User, City, MedicalSpecialty


# ====================== SPECIALTÉS (dropdown) ============================

class MedicalSpecialtySerializer(serializers.ModelSerializer):
    """Serializer pour le dropdown des spécialités médicales"""
    class Meta:
        model = MedicalSpecialty
        fields = ['id', 'name', 'code']


# ====================== CABINET — LISTE (lecture) ========================

class CabinetListSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    city_name = serializers.CharField(source='city.name', read_only=True)
    governorate_name = serializers.CharField(source='city.governorate.name', read_only=True)
    specialties_names = serializers.SerializerMethodField()
    secretaries_count = serializers.SerializerMethodField()
    doctors_count = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Cabinet
        fields = [
            'id', 'name', 'owner', 'owner_name', 'owner_email',
            'city', 'city_name', 'governorate_name',
            'phone_number', 'email', 'website',
            'specialties_names', 'secretaries_count', 'doctors_count',
            'cnam_affiliated', 'is_active',
            'logo', 'logo_url',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_specialties_names(self, obj):
        return list(obj.specialties.values_list('name', flat=True))

    def get_secretaries_count(self, obj):
        return obj.secretaries.count()

    def get_doctors_count(self, obj):
        return obj.doctors.count()

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url
        return None


# ====================== CABINET — DÉTAIL (lecture) =======================

class CabinetDetailSerializer(serializers.ModelSerializer):
    owner_detail = serializers.SerializerMethodField()
    city_detail = serializers.SerializerMethodField()
    specialties_detail = MedicalSpecialtySerializer(
        source='specialties', many=True, read_only=True
    )
    secretaries_list = serializers.SerializerMethodField()
    doctors_list = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    banner_url = serializers.SerializerMethodField()

    class Meta:
        model = Cabinet
        fields = [
            'id', 'name',
            'owner', 'owner_detail', 'secretaries', 'secretaries_list',
            'doctors_list',
            'address', 'city', 'city_detail',
            'latitude', 'longitude',
            'phone_number', 'email', 'website',
            'specialties', 'specialties_detail',
            'cnam_affiliated', 'cnam_code', 'accreditation',
            'opening_hours', 'appointment_duration', 'timezone',
            'logo', 'logo_url', 'banner', 'banner_url',
            'is_active', 'is_deleted', 'deleted_at', 'created_at',
        ]
        read_only_fields = [
            'id', 'owner_detail', 'city_detail', 'specialties_detail',
            'secretaries_list', 'doctors_list', 'logo_url', 'banner_url',
            'is_deleted', 'deleted_at', 'created_at',
        ]

    def get_owner_detail(self, obj):
        if obj.owner:
            return {
                'id': obj.owner.id,
                'full_name': obj.owner.get_full_name(),
                'email': obj.owner.email,
                'phone_number': str(obj.owner.phone_number) if obj.owner.phone_number else None,
            }
        return None

    def get_city_detail(self, obj):
        if obj.city:
            return {
                'id': obj.city.id,
                'name': obj.city.name,
                'governorate_id': obj.city.governorate_id,
                'governorate_name': obj.city.governorate.name,
            }
        return None

    def get_secretaries_list(self, obj):
        return [
            {'id': s.id, 'full_name': s.get_full_name(), 'email': s.email}
            for s in obj.secretaries.all()
        ]

    def get_doctors_list(self, obj):
        return [
            {'id': d.user.id, 'full_name': d.user.get_full_name(), 'specialty': d.specialty.name}
            for d in obj.doctors.all()
        ]

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url
        return None

    def get_banner_url(self, obj):
        if obj.banner:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.banner.url) if request else obj.banner.url
        return None


# ====================== CABINET — ÉCRITURE (create/update) ==============

class CabinetWriteSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='doctor'),
        error_messages={
            'does_not_exist': "L'utilisateur avec cet ID n'existe pas.",
            'null': 'Le médecin propriétaire est obligatoire.',
            'required': 'Le médecin propriétaire est obligatoire.',
        }
    )
    secretaries = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='secretary'),
        many=True,
        required=False,
    )
    city = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.all(),
        error_messages={
            'does_not_exist': "La ville avec cet ID n'existe pas.",
            'null': 'La ville est obligatoire.',
            'required': 'La ville est obligatoire.',
        }
    )
    specialties = serializers.PrimaryKeyRelatedField(
        queryset=MedicalSpecialty.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = Cabinet
        fields = [
            'name', 'owner', 'secretaries', 'address', 'city',
            'latitude', 'longitude',
            'phone_number', 'email', 'website',
            'specialties', 'cnam_affiliated', 'cnam_code', 'accreditation',
            'opening_hours', 'appointment_duration', 'timezone',
            'logo', 'banner', 'is_active',
        ]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le nom du cabinet est obligatoire.")
        if len(value) < 3:
            raise serializers.ValidationError(
                "Le nom du cabinet doit contenir au moins 3 caractères."
            )
        return value

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("L'email est obligatoire.")
        return value.strip().lower()

    def validate_phone_number(self, value):
        if not value:
            raise serializers.ValidationError("Le numéro de téléphone est obligatoire.")
        return value

    def validate_address(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("L'adresse est obligatoire.")
        return value.strip()

    def validate_appointment_duration(self, value):
        if value is not None and value < 5:
            raise serializers.ValidationError(
                "La durée de consultation doit être d'au moins 5 minutes."
            )
        if value is not None and value > 480:
            raise serializers.ValidationError(
                "La durée de consultation ne peut pas dépasser 480 minutes (8h)."
            )
        return value

    def validate_latitude(self, value):
        if value is not None and (value < -90 or value > 90):
            raise serializers.ValidationError(
                "La latitude doit être entre -90 et 90."
            )
        return value

    def validate_longitude(self, value):
        if value is not None and (value < -180 or value > 180):
            raise serializers.ValidationError(
                "La longitude doit être entre -180 et 180."
            )
        return value

    def validate_opening_hours(self, value):
        if not value or not isinstance(value, dict):
            return value
        valid_days = [
            'lundi', 'mardi', 'mercredi', 'jeudi',
            'vendredi', 'samedi', 'dimanche'
        ]
        for day, slots in value.items():
            if day.lower() not in valid_days:
                raise serializers.ValidationError(
                    f"Jour invalide : '{day}'. Jours autorisés : {', '.join(valid_days)}."
                )
            if not isinstance(slots, list):
                raise serializers.ValidationError(
                    f"Les horaires de '{day}' doivent être une liste de créneaux."
                )
            for slot in slots:
                if not isinstance(slot, str) or '-' not in slot:
                    raise serializers.ValidationError(
                        f"Créneau invalide pour '{day}' : '{slot}'. "
                        f"Format attendu : 'HH:MM-HH:MM'."
                    )
        return value

    def validate_timezone(self, value):
        if not value:
            return value
        try:
            from zoneinfo import ZoneInfo
            try:
                ZoneInfo(value)
                return value
            except Exception:
                raise serializers.ValidationError(f"Fuseau horaire invalide : '{value}'.")
        except ImportError:
            pass
        try:
            import pytz
            if value in pytz.all_timezones:
                return value
            raise serializers.ValidationError(f"Fuseau horaire invalide : '{value}'.")
        except ImportError:
            pass
        import re
        iana_pattern = r'^[A-Za-z]+/[A-Za-z_\-]+(/[A-Za-z_\-]+)*$'
        if re.match(iana_pattern, value) and len(value) >= 4:
            return value
        raise serializers.ValidationError(
            f"Fuseau horaire invalide : '{value}'. "
            f"Format attendu : 'Region/Ville' (ex: Africa/Tunis, Europe/Paris)."
        )

    def validate(self, attrs):
        owner = attrs.get('owner')
        secretaries = attrs.get('secretaries', [])
        if owner and secretaries and owner in secretaries:
            raise serializers.ValidationError({
                "secretaries": "Le propriétaire ne peut pas être aussi secrétaire."
            })
        return attrs


# ====================== DOCTOR — LISTE (lecture) ==========================

class DoctorListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone_number = serializers.SerializerMethodField()
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    specialty_name = serializers.CharField(source='specialty.name', read_only=True)
    specialty_code = serializers.CharField(source='specialty.code', read_only=True)
    cabinets_count = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = [
            'id', 'user_id', 'full_name', 'email', 'phone_number', 'is_active',
            'specialty', 'specialty_name', 'specialty_code',
            'license_number', 'years_experience', 'consultation_price',
            'accepts_new_patients', 'teleconsultation_available',
            'rating', 'review_count',
            'cabinets_count', 'profile_photo_url',
        ]
        read_only_fields = ['id', 'user_id', 'full_name', 'email', 'rating', 'review_count']

    def get_phone_number(self, obj):
        if obj.user.phone_number:
            return str(obj.user.phone_number)
        return None

    def get_cabinets_count(self, obj):
        return obj.cabinets.filter(is_deleted=False).count()

    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.profile_photo.url) if request else obj.profile_photo.url
        return None


# ====================== DOCTOR — DÉTAIL (lecture) =========================

class DoctorDetailSerializer(serializers.ModelSerializer):
    user_detail = serializers.SerializerMethodField()
    specialty_detail = MedicalSpecialtySerializer(source='specialty', read_only=True)
    cabinets_list = serializers.SerializerMethodField()
    availabilities = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = [
            'id', 'user', 'user_detail',
            'specialty', 'specialty_detail',
            'license_number', 'years_experience', 'cnam_code',
            'consultation_price', 'bio',
            'education', 'certifications',
            'cabinets', 'cabinets_list',
            'availabilities',
            'accepts_new_patients', 'teleconsultation_available',
            'profile_photo', 'profile_photo_url',
            'rating', 'review_count',
        ]
        read_only_fields = [
            'id', 'user_detail', 'specialty_detail', 'cabinets_list',
            'availabilities', 'profile_photo_url', 'rating', 'review_count',
        ]

    def get_user_detail(self, obj):
        if obj.user:
            return {
                'id': obj.user.id,
                'full_name': obj.user.get_full_name(),
                'email': obj.user.email,
                'phone_number': str(obj.user.phone_number) if obj.user.phone_number else None,
                'is_active': obj.user.is_active,
                'is_verified': obj.user.is_verified,
                'city': obj.user.city_id,
            }
        return None

    def get_cabinets_list(self, obj):
        return [
            {'id': c.id, 'name': c.name, 'city': c.city.name if c.city else None, 'is_active': c.is_active}
            for c in obj.cabinets.filter(is_deleted=False)
        ]

    def get_availabilities(self, obj):
        return [
            {'id': a.id, 'day': a.day, 'day_display': a.get_day_display(),
             'start_time': str(a.start_time), 'end_time': str(a.end_time),
             'slot_duration': a.slot_duration, 'is_available': a.is_available}
            for a in obj.availabilities.all()
        ]

    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.profile_photo.url) if request else obj.profile_photo.url
        return None


# ====================== DOCTOR — ÉCRITURE (create/update) ================

class DoctorWriteSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='doctor'),
        error_messages={
            'does_not_exist': "L'utilisateur avec cet ID n'existe pas.",
            'null': "L'utilisateur (médecin) est obligatoire.",
            'required': "L'utilisateur (médecin) est obligatoire.",
        }
    )
    specialty = serializers.PrimaryKeyRelatedField(
        queryset=MedicalSpecialty.objects.all(),
        error_messages={
            'does_not_exist': "La spécialité avec cet ID n'existe pas.",
            'null': 'La spécialité est obligatoire.',
            'required': 'La spécialité est obligatoire.',
        }
    )
    cabinets = serializers.PrimaryKeyRelatedField(
        queryset=Cabinet.objects.filter(is_deleted=False),
        many=True, required=False,
    )

    class Meta:
        model = Doctor
        fields = [
            'user', 'specialty', 'cabinets',
            'license_number', 'years_experience', 'cnam_code',
            'consultation_price', 'bio',
            'education', 'certifications',
            'accepts_new_patients', 'teleconsultation_available',
            'profile_photo',
        ]

        def validate_user(self, value):
        # ✅ Si on modifie un médecin existant et qu'on ne change pas d'utilisateur, on autorise
            if self.instance and self.instance.user_id == value.id:
                return value
            if hasattr(value, 'doctor_profile'):
             raise serializers.ValidationError(
                f"Cet utilisateur ({value.get_full_name()}) a déjà un profil médecin."
            )
            return value

    def validate_license_number(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le numéro de licence est obligatoire.")
        queryset = Doctor.objects.all()
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.filter(license_number__iexact=value).exists():
            raise serializers.ValidationError(
                f"Un médecin avec le numéro de licence '{value}' existe déjà."
            )
        return value

    def validate_years_experience(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Les années d'expérience ne peuvent pas être négatives.")
        if value is not None and value > 70:
            raise serializers.ValidationError("Les années d'expérience ne peuvent pas dépasser 70.")
        return value

    def validate_consultation_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Le prix de consultation ne peut pas être négatif.")
        return value

    def validate_education(self, value):
        if not value or not isinstance(value, list):
            return value
        validated = []
        for item in value:
            if isinstance(item, str) and item.strip():
                validated.append(item.strip())
        return validated

    def validate_certifications(self, value):
        if not value or not isinstance(value, list):
            return value
        validated = []
        for item in value:
            if isinstance(item, str) and item.strip():
                validated.append(item.strip())
        return validated

    def validate(self, attrs):
        user = attrs.get('user')
        if user and self.instance and self.instance.user_id != user.id:
            if hasattr(user, 'doctor_profile'):
                raise serializers.ValidationError({
                    "user": f"Cet utilisateur ({user.get_full_name()}) a déjà un profil médecin."
                })
        return attrs


# ====================== DOCTOR AVAILABILITY — ÉCRITURE (médecin connecté) =============

class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    day_display = serializers.CharField(source='get_day_display', read_only=True)

    class Meta:
        model = DoctorAvailability
        fields = [
            'id', 'day', 'day_display', 'start_time', 'end_time',
            'slot_duration', 'is_available',
        ]
        read_only_fields = ['id', 'day_display']

    def validate_day(self, value):
        valid_days = [d[0] for d in DoctorAvailability.DAY_CHOICES]
        if value not in valid_days:
            raise serializers.ValidationError(
                f"Jour invalide : '{value}'. Jours autorisés : {', '.join(valid_days)}."
            )
        return value

    def validate_slot_duration(self, value):
        if value is not None and value < 5:
            raise serializers.ValidationError(
                "La durée du créneau doit être d'au moins 5 minutes."
            )
        if value is not None and value > 480:
            raise serializers.ValidationError(
                "La durée du créneau ne peut pas dépasser 480 minutes (8h)."
            )
        return value

    def validate(self, attrs):
        start = attrs.get('start_time')
        end = attrs.get('end_time')
        if start and end and start >= end:
            raise serializers.ValidationError({
                "end_time": "L'heure de fin doit être après l'heure de début."
            })
        day = attrs.get('day')
        if start and day:
            queryset = DoctorAvailability.objects.filter(
                doctor__user=self.context['request'].user,
                day=day, start_time=start,
            )
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                day_label = dict(DoctorAvailability.DAY_CHOICES).get(day, day)
                raise serializers.ValidationError({
                    "non_field_errors": [
                        f"Une disponibilité existe déjà pour {day_label} à {str(start)[:5]}."
                    ]
                })
        return attrs


# ====================== DOCTOR UNAVAILABILITY — ÉCRITURE (médecin connecté) =============

class DoctorUnavailabilitySerializer(serializers.ModelSerializer):
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)

    class Meta:
        model = DoctorUnavailability
        fields = [
            'id', 'start_datetime', 'end_datetime', 'reason', 'reason_display',
            'description', 'is_recurring', 'recurrence_rule',
        ]
        read_only_fields = ['id', 'reason_display']

    def validate_reason(self, value):
        valid_reasons = [r[0] for r in DoctorUnavailability.REASON_CHOICES]
        if value not in valid_reasons:
            raise serializers.ValidationError(
                f"Raison invalide : '{value}'. Raisons autorisées : {', '.join(valid_reasons)}."
            )
        return value

    def validate_recurrence_rule(self, value):
        if value and not value.strip():
            return ''
        return value

    def validate(self, attrs):
        start = attrs.get('start_datetime')
        end = attrs.get('end_datetime')
        if start and end and end <= start:
            raise serializers.ValidationError({
                "end_datetime": "La date de fin doit être après la date de début."
            })
        is_recurring = attrs.get('is_recurring', False)
        if not is_recurring:
            attrs['recurrence_rule'] = ''
        return attrs


# ====================== CABINET — ÉCRITURE (MÉDECIN PROPRIÉTAIRE) ================

class DoctorCabinetWriteSerializer(CabinetWriteSerializer):
    """Serializer pour les médecins propriétaires de cabinets."""
    class Meta(CabinetWriteSerializer.Meta):
        fields = [
            'name', 'address', 'city',
            'latitude', 'longitude',
            'phone_number', 'email', 'website',
            'specialties', 'cnam_affiliated', 'cnam_code', 'accreditation',
            'opening_hours', 'appointment_duration', 'timezone',
            'logo', 'banner', 'is_active',
        ]


# ====================== SECRÉTAIRE — LISTE (lecture pour médecin) ================

class DoctorSecretaryListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    cabinets_assigned = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'email', 'phone_number',
            'is_active', 'is_verified',
            'cabinets_assigned',
        ]
        read_only_fields = ['id', 'is_active', 'is_verified']

    def get_cabinets_assigned(self, obj):
        cabinets = Cabinet.objects.filter(
            owner=self.context['request'].user, is_deleted=False, secretaries=obj
        )
        return [{'id': c.id, 'name': c.name, 'is_active': c.is_active} for c in cabinets]


# ====================== SECRÉTAIRE — CRÉATION (médecin propriétaire) ================

class DoctorSecretaryCreateSerializer(serializers.ModelSerializer):
    cabinet = serializers.PrimaryKeyRelatedField(
        queryset=Cabinet.objects.all(),
        required=False,
        write_only=True,
        error_messages={'does_not_exist': "Le cabinet sélectionné n'existe pas."}
    )

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone_number', 'cabinet']

    def validate_first_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le prénom est obligatoire.")
        return value

    def validate_last_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le nom est obligatoire.")
        return value

    def validate_email(self, value):
        value = value.strip().lower() if value else ''
        if not value:
            raise serializers.ValidationError("L'email est obligatoire.")
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un utilisateur avec cet email existe déjà.")
        return value

    def validate_cabinet(self, value):
        if value and value.owner != self.context['request'].user:
            raise serializers.ValidationError("Vous ne pouvez assigner qu'à vos propres cabinets.")
        if value and value.is_deleted:
            raise serializers.ValidationError("Ce cabinet a été supprimé.")
        return value

    def validate(self, attrs):
        return attrs

    def create(self, validated_data):
        import secrets
        import string
        cabinet = validated_data.pop('cabinet', None)
        email = validated_data.get('email', '')
        phone = validated_data.get('phone_number')
        base_username = email.split('@')[0] if email else f"sec_{secrets.token_hex(4)}"
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1
        password = ''.join(secrets.choice(string.ascii_letters + string.digits + '!@#$%&*') for _ in range(14))
        user = User(
            username=username,
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=phone,
            role='secretary',
            is_active=True,
        )
        user.set_password(password)
        user.save()
        if cabinet:
            cabinet.secretaries.add(user)
        user._generated_password = password
        return user


# ====================== SECRÉTAIRE — MODIFICATION (médecin propriétaire) ================

class DoctorSecretaryUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone_number']

    def validate_first_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le prénom est obligatoire.")
        return value

    def validate_last_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Le nom est obligatoire.")
        return value

    def validate_email(self, value):
        value = value.strip().lower() if value else ''
        if not value:
            raise serializers.ValidationError("L'email est obligatoire.")
        queryset = User.objects.filter(email__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Un utilisateur avec cet email existe déjà.")
        return value


# ====================== CABINET PUBLIC — LISTE (pour patients) ==============
class PublicCabinetSerializer(serializers.ModelSerializer):
    """Serializer pour l'annuaire public des cabinets (vue liste)."""
    city_name = serializers.CharField(source='city.name', read_only=True)
    governorate_name = serializers.CharField(source='city.governorate.name', read_only=True)
    specialties_list = serializers.SerializerMethodField()
    doctors_info = serializers.SerializerMethodField()
    doctors_count = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    opening_hours_display = serializers.SerializerMethodField()

    class Meta:
        model = Cabinet
        fields = [
            'id', 'name', 'address', 'city', 'city_name', 'governorate_name',
            'phone_number', 'email', 'website',
            'specialties_list', 'doctors_info', 'doctors_count',
            'cnam_affiliated', 'opening_hours', 'opening_hours_display',
            'appointment_duration',
            'logo_url', 'avg_rating',
            'latitude', 'longitude',
            'is_active',
        ]

    def get_specialties_list(self, obj):
        return list(obj.specialties.values('id', 'name', 'code'))

    def get_doctors_info(self, obj):
        doctors = []
        for d in obj.doctors.filter(user__is_active=True).select_related('user', 'specialty'):
            avails = d.availabilities.filter(is_available=True)
            avail_list = [
                {
                    'day': a.day, 'day_display': a.get_day_display(),
                    'start_time': str(a.start_time)[:5], 'end_time': str(a.end_time)[:5],
                    'slot_duration': a.slot_duration,
                }
                for a in avails
            ]
            doctors.append({
                'id': d.id, 'full_name': d.user.get_full_name(),
                'specialty': d.specialty.name if d.specialty else None,
                'specialty_id': d.specialty_id,
                'consultation_price': float(d.consultation_price) if d.consultation_price else 0,
                'rating': float(d.rating) if d.rating else 0,
                'review_count': d.review_count,
                'years_experience': d.years_experience,
                'accepts_new_patients': d.accepts_new_patients,
                'teleconsultation_available': d.teleconsultation_available,
                'profile_photo_url': self._get_image_url(d.profile_photo),
                'availabilities': avail_list,
            })
        return doctors

    def get_doctors_count(self, obj):
        return obj.doctors.filter(user__is_active=True).count()

    def get_logo_url(self, obj):
        return self._get_image_url(obj.logo)

    def get_avg_rating(self, obj):
        from django.db.models import Avg
        avg = obj.doctors.filter(user__is_active=True).aggregate(avg_rating=Avg('rating'))['avg_rating']
        return round(float(avg), 1) if avg else None

    def get_opening_hours_display(self, obj):
        hours = obj.opening_hours
        if not hours or not isinstance(hours, dict):
            return None
        day_labels = {
            'lundi': 'Lundi', 'mardi': 'Mardi', 'mercredi': 'Mercredi',
            'jeudi': 'Jeudi', 'vendredi': 'Vendredi', 'samedi': 'Samedi', 'dimanche': 'Dimanche',
        }
        result = {}
        for day_key, day_label in day_labels.items():
            slots = hours.get(day_key, [])
            if slots and isinstance(slots, list) and len(slots) > 0:
                result[day_key] = {'label': day_label, 'slots': slots}
        return result if result else None

    def _get_image_url(self, image_field):
        if image_field:
            request = self.context.get('request')
            return request.build_absolute_uri(image_field.url) if request else image_field.url
        return None


# ====================== CABINET PUBLIC — DÉTAIL COMPLET (Profil Cabinet) ==============
class PublicCabinetDetailSerializer(PublicCabinetSerializer):
    """
    ✅ Version ENRICHI pour le profil complet du cabinet.
    Ajoute : banner, accreditation, owner_name, cnam_code,
    les infos DÉTAILLÉES de chaque médecin,
    et les secrétaires du cabinet.
    """
    banner_url = serializers.SerializerMethodField()
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    secretaries_info = serializers.SerializerMethodField()

    class Meta(PublicCabinetSerializer.Meta):
        fields = PublicCabinetSerializer.Meta.fields + [
            'banner_url', 'owner_name', 'owner_email',
            'accreditation', 'cnam_code',
            'secretaries_info',
        ]

    def get_banner_url(self, obj):
        return self._get_image_url(obj.banner)

    def get_secretaries_info(self, obj):
        """✅ Retourne les secrétaires du cabinet avec photo, nom, email, téléphone."""
        secretaries = []
        for s in obj.secretaries.filter(is_active=True):
            profile_photo_url = None
            initials = None
            full_name = s.get_full_name() or s.username

            if hasattr(s, 'profile_photo') and s.profile_photo:
                profile_photo_url = self._get_image_url(s.profile_photo)

            if not profile_photo_url:
                parts = full_name.strip().split()
                if len(parts) >= 2:
                    initials = f"{parts[0][0]}{parts[-1][0]}".upper()
                elif parts:
                    initials = parts[0][0].upper()

            secretaries.append({
                'id': s.id,
                'full_name': full_name,
                'email': s.email,
                'phone_number': str(s.phone_number) if hasattr(s, 'phone_number') and s.phone_number else None,
                'profile_photo_url': profile_photo_url,
                'initials': initials,
                'role': 'secretary',
            })
        return secretaries

    def get_doctors_info(self, obj):
        """
        ✅ Version ENRICHI : retourne toutes les informations du médecin
        pour le profil complet du cabinet.
        """
        from django.utils import timezone as dtz_now

        doctors = []
        for d in obj.doctors.filter(user__is_active=True).select_related('user', 'specialty'):
            # ── Toutes les disponibilités (activées ET désactivées) pour le calendrier ──
            all_avails = d.availabilities.all().order_by('day', 'start_time')
            avail_list = [
                {
                    'id': a.id,
                    'day': a.day,
                    'day_display': a.get_day_display(),
                    'start_time': str(a.start_time)[:5],
                    'end_time': str(a.end_time)[:5],
                    'slot_duration': a.slot_duration,
                    'is_available': a.is_available,
                }
                for a in all_avails
            ]

            # ── Indisponibilités à venir ──
            now = dtz_now.now()
            upcoming_unavails = d.unavailabilities.filter(
                end_datetime__gte=now
            ).order_by('start_datetime')
            unavail_list = [
                {
                    'id': u.id,
                    'start_datetime': u.start_datetime.isoformat(),
                    'end_datetime': u.end_datetime.isoformat(),
                    'reason': u.reason,
                    'reason_display': u.get_reason_display(),
                    'description': u.description,
                    'is_recurring': u.is_recurring,
                }
                for u in upcoming_unavails
            ]

            # ── Créneaux activés uniquement (pour le résumé) ──
            active_avails = [a for a in avail_list if a['is_available']]

            doctors.append({
                'id': d.id,
                'full_name': d.user.get_full_name(),
                'email': d.user.email,
                'phone_number': str(d.user.phone_number) if d.user.phone_number else None,
                'specialty': d.specialty.name if d.specialty else None,
                'specialty_id': d.specialty_id,
                'specialty_code': d.specialty.code if d.specialty else None,
                'license_number': d.license_number,
                'consultation_price': float(d.consultation_price) if d.consultation_price else 0,
                'rating': float(d.rating) if d.rating else 0,
                'review_count': d.review_count,
                'years_experience': d.years_experience,
                'bio': d.bio or '',
                'education': d.education or [],
                'certifications': d.certifications or [],
                'accepts_new_patients': d.accepts_new_patients,
                'teleconsultation_available': d.teleconsultation_available,
                'profile_photo_url': self._get_image_url(d.profile_photo),
                'availabilities': active_avails,
                'all_availabilities': avail_list,
                'upcoming_unavailabilities': unavail_list,
            })
        return doctors


# ====================== SECRÉTAIRE — ÉDITION CABINET ================================

class SecretaryCabinetListSerializer(serializers.ModelSerializer):
    """
    Serializer pour la liste des cabinets assignés à un secrétaire.
    """
    city_name = serializers.CharField(source='city.name', read_only=True)
    governorate_name = serializers.CharField(source='city.governorate.name', read_only=True)
    specialties_names = serializers.SerializerMethodField()
    doctors_count = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)

    class Meta:
        model = Cabinet
        fields = [
            'id', 'name', 'address', 'city', 'city_name', 'governorate_name',
            'phone_number', 'email', 'website',
            'specialties_names', 'doctors_count',
            'cnam_affiliated', 'is_active',
            'logo_url', 'owner_name',
            'opening_hours',
        ]
        read_only_fields = fields

    def get_specialties_names(self, obj):
        return list(obj.specialties.values_list('name', flat=True))

    def get_doctors_count(self, obj):
        return obj.doctors.filter(user__is_active=True).count()

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url
        return None


class SecretaryCabinetDetailSerializer(serializers.ModelSerializer):
    """
    Serializer pour le détail d'un cabinet assigné au secrétaire.
    Inclut les médecins avec leurs infos complètes.
    """
    city_name = serializers.CharField(source='city.name', read_only=True)
    governorate_name = serializers.CharField(source='city.governorate.name', read_only=True)
    specialties_names = serializers.SerializerMethodField()
    specialties_list = serializers.SerializerMethodField()
    doctors_info = serializers.SerializerMethodField()
    doctors_count = serializers.SerializerMethodField()
    secretaries_info = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    banner_url = serializers.SerializerMethodField()
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    opening_hours_display = serializers.SerializerMethodField()

    class Meta:
        model = Cabinet
        fields = [
            'id', 'name', 'address', 'city', 'city_name', 'governorate_name',
            'phone_number', 'email', 'website',
            'specialties_names', 'specialties_list',
            'doctors_info', 'doctors_count',
            'secretaries_info',
            'cnam_affiliated', 'cnam_code', 'accreditation',
            'opening_hours', 'opening_hours_display', 'appointment_duration',
            'logo', 'logo_url', 'banner', 'banner_url',
            'is_active', 'owner_name',
            'latitude', 'longitude',
        ]
        read_only_fields = ['id', 'logo_url', 'banner_url', 'owner_name']

    def get_specialties_names(self, obj):
        return list(obj.specialties.values_list('name', flat=True))

    def get_specialties_list(self, obj):
        return list(obj.specialties.values('id', 'name', 'code'))

    def get_doctors_count(self, obj):
        return obj.doctors.filter(user__is_active=True).count()

    def get_doctors_info(self, obj):
        doctors = []
        for d in obj.doctors.filter(user__is_active=True).select_related('user', 'specialty'):
            avails = d.availabilities.filter(is_available=True)
            avail_list = [
                {
                    'id': a.id,
                    'day': a.day,
                    'day_display': a.get_day_display(),
                    'start_time': str(a.start_time)[:5],
                    'end_time': str(a.end_time)[:5],
                    'slot_duration': a.slot_duration,
                    'is_available': a.is_available,
                }
                for a in d.availabilities.all().order_by('day', 'start_time')
            ]
            doctors.append({
                'id': d.id,
                'full_name': d.user.get_full_name(),
                'email': d.user.email,
                'phone_number': str(d.user.phone_number) if d.user.phone_number else None,
                'specialty': d.specialty.name if d.specialty else None,
                'specialty_id': d.specialty_id,
                'consultation_price': float(d.consultation_price) if d.consultation_price else 0,
                'rating': float(d.rating) if d.rating else 0,
                'review_count': d.review_count,
                'years_experience': d.years_experience,
                'bio': d.bio or '',
                'accepts_new_patients': d.accepts_new_patients,
                'teleconsultation_available': d.teleconsultation_available,
                'profile_photo_url': self._get_image_url(d.profile_photo),
                'availabilities': avail_list,
            })
        return doctors

    def get_secretaries_info(self, obj):
        secretaries = []
        for s in obj.secretaries.filter(is_active=True):
            profile_photo_url = None
            initials = None
            full_name = s.get_full_name() or s.username
            if hasattr(s, 'profile_photo') and s.profile_photo:
                profile_photo_url = self._get_image_url(s.profile_photo)
            if not profile_photo_url:
                parts = full_name.strip().split()
                if len(parts) >= 2:
                    initials = f"{parts[0][0]}{parts[-1][0]}".upper()
                elif parts:
                    initials = parts[0][0].upper()
            secretaries.append({
                'id': s.id,
                'full_name': full_name,
                'email': s.email,
                'phone_number': str(s.phone_number) if hasattr(s, 'phone_number') and s.phone_number else None,
                'profile_photo_url': profile_photo_url,
                'initials': initials,
            })
        return secretaries

    def get_logo_url(self, obj):
        return self._get_image_url(obj.logo)

    def get_banner_url(self, obj):
        return self._get_image_url(obj.banner)

    def get_opening_hours_display(self, obj):
        hours = obj.opening_hours
        if not hours or not isinstance(hours, dict):
            return None
        day_labels = {
            'lundi': 'Lundi', 'mardi': 'Mardi', 'mercredi': 'Mercredi',
            'jeudi': 'Jeudi', 'vendredi': 'Vendredi', 'samedi': 'Samedi', 'dimanche': 'Dimanche',
        }
        result = {}
        for day_key, day_label in day_labels.items():
            slots = hours.get(day_key, [])
            if slots and isinstance(slots, list) and len(slots) > 0:
                result[day_key] = {'label': day_label, 'slots': slots}
        return result if result else None

    def _get_image_url(self, image_field):
        if image_field:
            request = self.context.get('request')
            return request.build_absolute_uri(image_field.url) if request else image_field.url
        return None


class SecretaryCabinetUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer pour la modification du cabinet par le secrétaire.
    Champs limités : ne peut pas changer owner, supprimer, etc.
    """
    city = serializers.PrimaryKeyRelatedField(
        queryset=City.objects.all(),
        required=False,
        allow_null=True,
    )
    specialties = serializers.PrimaryKeyRelatedField(
        queryset=MedicalSpecialty.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = Cabinet
        fields = [
            'name', 'address', 'city',
            'phone_number', 'email', 'website',
            'specialties',
            'cnam_affiliated', 'cnam_code', 'accreditation',
            'opening_hours', 'appointment_duration',
            'logo', 'banner',
            'latitude', 'longitude',
        ]

    def validate_opening_hours(self, value):
        if not value or not isinstance(value, dict):
            return value
        valid_days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
        for day, slots in value.items():
            if day.lower() not in valid_days:
                raise serializers.ValidationError(
                    f"Jour invalide : '{day}'. Jours autorisés : {', '.join(valid_days)}."
                )
            if not isinstance(slots, list):
                raise serializers.ValidationError(
                    f"Les horaires de '{day}' doivent être une liste de créneaux."
                )
            for slot in slots:
                if not isinstance(slot, str) or '-' not in slot:
                    raise serializers.ValidationError(
                        f"Créneau invalide pour '{day}' : '{slot}'. Format attendu : 'HH:MM-HH:MM'."
                    )
        return value
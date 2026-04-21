from rest_framework import serializers
from django.utils import timezone
from .models import Appointment


# ====================== APPOINTMENT — LISTE (résumé) ========================

class AppointmentListSerializer(serializers.ModelSerializer):
    """
    Serializer pour la liste des rendez-vous.
    Informations résumées pour un affichage en tableau / cartes.
    """
    patient_name = serializers.SerializerMethodField()
    patient_info = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    doctor_info = serializers.SerializerMethodField()
    cabinet_name = serializers.SerializerMethodField()
    cabinet_info = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    consultation_type_display = serializers.CharField(source='get_consultation_type_display', read_only=True)
    symptoms_summary = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'patient_name', 'patient_info',
            'doctor', 'doctor_name', 'doctor_info',
            'cabinet', 'cabinet_name', 'cabinet_info',
            'date_time', 'duration',
            'status', 'status_display',
            'is_teleconsultation', 'consultation_type', 'consultation_type_display',
            'symptoms_summary',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    # ── Patient helpers ──

    def _get_patient_full_name(self, patient):
        if hasattr(patient, 'user') and patient.user:
            return patient.user.get_full_name()
        return str(patient)

    def _build_patient_info(self, patient):
        info = {'id': patient.id}
        info['full_name'] = self._get_patient_full_name(patient)
        if hasattr(patient, 'user') and patient.user:
            info['first_name'] = patient.user.first_name
            info['last_name'] = patient.user.last_name
            if hasattr(patient.user, 'phone_number') and patient.user.phone_number:
                info['phone_number'] = str(patient.user.phone_number)
            if hasattr(patient.user, 'email') and patient.user.email:
                info['email'] = patient.user.email
        if hasattr(patient, 'date_of_birth') and patient.date_of_birth:
            info['date_of_birth'] = str(patient.date_of_birth)
        if hasattr(patient, 'gender'):
            info['gender'] = patient.gender
        return info

    # ── Doctor helpers ──

    def _get_doctor_full_name(self, doctor):
        if hasattr(doctor, 'user') and doctor.user:
            return doctor.user.get_full_name()
        return str(doctor)

    def _build_doctor_info(self, doctor):
        info = {'id': doctor.id}
        info['full_name'] = self._get_doctor_full_name(doctor)
        if hasattr(doctor, 'user') and doctor.user:
            info['first_name'] = doctor.user.first_name
            info['last_name'] = doctor.user.last_name
            if hasattr(doctor.user, 'email') and doctor.user.email:
                info['email'] = doctor.user.email
        if hasattr(doctor, 'specialty') and doctor.specialty:
            info['specialty'] = doctor.specialty.name if hasattr(doctor.specialty, 'name') else str(doctor.specialty)
        if hasattr(doctor, 'license_number') and doctor.license_number:
            info['license_number'] = doctor.license_number
        return info

    # ── Cabinet helpers ──

    def _build_cabinet_info(self, cabinet):
        info = {'id': cabinet.id}
        info['name'] = cabinet.name if hasattr(cabinet, 'name') else str(cabinet)
        if hasattr(cabinet, 'address') and cabinet.address:
            info['address'] = cabinet.address
        if hasattr(cabinet, 'phone') and cabinet.phone:
            info['phone'] = str(cabinet.phone)
        if hasattr(cabinet, 'email') and cabinet.email:
            info['email'] = cabinet.email
        if hasattr(cabinet, 'city') and cabinet.city:
            info['city'] = cabinet.city.name if hasattr(cabinet.city, 'name') else str(cabinet.city)
        return info

    # ── MethodFields ──

    def get_patient_name(self, obj):
        return self._get_patient_full_name(obj.patient)

    def get_patient_info(self, obj):
        return self._build_patient_info(obj.patient)

    def get_doctor_name(self, obj):
        return self._get_doctor_full_name(obj.doctor)

    def get_doctor_info(self, obj):
        return self._build_doctor_info(obj.doctor)

    def get_cabinet_name(self, obj):
        return obj.cabinet.name if hasattr(obj.cabinet, 'name') else str(obj.cabinet)

    def get_cabinet_info(self, obj):
        return self._build_cabinet_info(obj.cabinet)

    def get_symptoms_summary(self, obj):
        if obj.symptoms and obj.symptoms.strip():
            text = obj.symptoms.strip()
            return text[:100] + '...' if len(text) > 100 else text
        return None


# ====================== APPOINTMENT — DÉTAIL COMPLET ========================

class AppointmentDetailSerializer(serializers.ModelSerializer):
    """
    Serializer complet pour un rendez-vous.
    """
    patient_info = serializers.SerializerMethodField()
    doctor_info = serializers.SerializerMethodField()
    cabinet_info = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    consultation_type_display = serializers.CharField(source='get_consultation_type_display', read_only=True)
    cancellation_reason_display = serializers.CharField(source='get_cancellation_reason_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    last_modified_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'patient_info',
            'doctor', 'doctor_info',
            'cabinet', 'cabinet_info',
            'date_time', 'duration',
            'status', 'status_display',
            'is_teleconsultation', 'consultation_type', 'consultation_type_display',
            'symptoms', 'notes',
            'cancellation_reason', 'cancellation_reason_display', 'cancellation_notes',
            'reminder_sent_24h', 'reminder_sent_1h',
            'created_by', 'created_by_name',
            'last_modified_by', 'last_modified_by_name',
            'approved_by', 'approved_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    # ── Reuse parent helpers ──

    def _get_patient_full_name(self, patient):
        if hasattr(patient, 'user') and patient.user:
            return patient.user.get_full_name()
        return str(patient)

    def _build_patient_info(self, patient):
        info = {'id': patient.id}
        info['full_name'] = self._get_patient_full_name(patient)
        if hasattr(patient, 'user') and patient.user:
            info['first_name'] = patient.user.first_name
            info['last_name'] = patient.user.last_name
            if hasattr(patient.user, 'phone_number') and patient.user.phone_number:
                info['phone_number'] = str(patient.user.phone_number)
            if hasattr(patient.user, 'email') and patient.user.email:
                info['email'] = patient.user.email
        if hasattr(patient, 'date_of_birth') and patient.date_of_birth:
            info['date_of_birth'] = str(patient.date_of_birth)
        if hasattr(patient, 'gender'):
            info['gender'] = patient.gender
        if hasattr(patient, 'blood_type') and patient.blood_type:
            info['blood_type'] = patient.blood_type
        if hasattr(patient, 'cin') and patient.cin:
            info['cin'] = patient.cin
        if hasattr(patient, 'address') and patient.address:
            info['address'] = patient.address
        return info

    def _get_doctor_full_name(self, doctor):
        if hasattr(doctor, 'user') and doctor.user:
            return doctor.user.get_full_name()
        return str(doctor)

    def _build_doctor_info(self, doctor):
        info = {'id': doctor.id}
        info['full_name'] = self._get_doctor_full_name(doctor)
        if hasattr(doctor, 'user') and doctor.user:
            info['first_name'] = doctor.user.first_name
            info['last_name'] = doctor.user.last_name
            if hasattr(doctor.user, 'email') and doctor.user.email:
                info['email'] = doctor.user.email
        if hasattr(doctor, 'specialty') and doctor.specialty:
            info['specialty'] = doctor.specialty.name if hasattr(doctor.specialty, 'name') else str(doctor.specialty)
        if hasattr(doctor, 'license_number') and doctor.license_number:
            info['license_number'] = doctor.license_number
        return info

    def _build_cabinet_info(self, cabinet):
        info = {'id': cabinet.id}
        info['name'] = cabinet.name if hasattr(cabinet, 'name') else str(cabinet)
        if hasattr(cabinet, 'address') and cabinet.address:
            info['address'] = cabinet.address
        if hasattr(cabinet, 'phone') and cabinet.phone:
            info['phone'] = str(cabinet.phone)
        if hasattr(cabinet, 'email') and cabinet.email:
            info['email'] = cabinet.email
        if hasattr(cabinet, 'city') and cabinet.city:
            info['city'] = cabinet.city.name if hasattr(cabinet.city, 'name') else str(cabinet.city)
        return info

    # ── MethodFields ──

    def get_patient_info(self, obj):
        return self._build_patient_info(obj.patient)

    def get_doctor_info(self, obj):
        return self._build_doctor_info(obj.doctor)

    def get_cabinet_info(self, obj):
        return self._build_cabinet_info(obj.cabinet)

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None

    def get_last_modified_by_name(self, obj):
        if obj.last_modified_by:
            return obj.last_modified_by.get_full_name()
        return None

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name()
        return None


# ====================== APPOINTMENT — ÉCRITURE ========================

class AppointmentWriteSerializer(serializers.ModelSerializer):
    """
    Serializer pour créer ou modifier un rendez-vous.
    """
    class Meta:
        model = Appointment
        fields = [
            'patient', 'doctor', 'cabinet',
            'date_time', 'duration',
            'is_teleconsultation', 'consultation_type',
            'symptoms', 'notes',
            'status',
        ]

    def validate_patient(self, value):
        if not value:
            raise serializers.ValidationError("Le patient est obligatoire.")
        return value

    def validate_doctor(self, value):
        if not value:
            raise serializers.ValidationError("Le médecin est obligatoire.")
        return value

    def validate_cabinet(self, value):
        if not value:
            raise serializers.ValidationError("Le cabinet est obligatoire.")
        return value

    def validate_date_time(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError(
                "Le rendez-vous doit être dans le futur."
            )
        return value

    def validate_duration(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError(
                "La durée doit être supérieure à 0 minutes."
            )
        if value is not None and value > 480:
            raise serializers.ValidationError(
                "La durée ne peut pas dépasser 480 minutes (8 heures)."
            )
        return value

    def validate_consultation_type(self, value):
        valid_types = ['first', 'followup', 'emergency', 'routine']
        if value and value not in valid_types:
            raise serializers.ValidationError(
                f"Type de consultation invalide : '{value}'. "
                f"Valeurs autorisées : {', '.join(valid_types)}."
            )
        return value

    def validate_status(self, value):
        valid_statuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']
        if value and value not in valid_statuses:
            raise serializers.ValidationError(
                f"Statut invalide : '{value}'. "
                f"Valeurs autorisées : {', '.join(valid_statuses)}."
            )
        return value

    def validate(self, attrs):
        # Vérifier que le cabinet appartient au médecin
        doctor = attrs.get('doctor')
        cabinet = attrs.get('cabinet')
        if doctor and cabinet:
            if hasattr(doctor, 'cabinets'):
                if cabinet not in doctor.cabinets.all():
                    raise serializers.ValidationError({
                        "cabinet": "Ce cabinet n'est pas associé à ce médecin."
                    })

        # Vérifier la cohérence statut / raison d'annulation
        status = attrs.get('status')
        if status == 'cancelled':
            reason = attrs.get('cancellation_reason')
            # On ne bloque pas ici, la raison peut être ajoutée via le cancel endpoint
            pass
        return attrs


# ====================== APPOINTMENT — ANNULATION ========================

class AppointmentCancelSerializer(serializers.ModelSerializer):
    """
    Serializer pour l'annulation d'un rendez-vous.
    """
    class Meta:
        model = Appointment
        fields = ['cancellation_reason', 'cancellation_notes']

    def validate_cancellation_reason(self, value):
        if not value:
            raise serializers.ValidationError(
                "La raison de l'annulation est obligatoire."
            )
        valid = [c[0] for c in Appointment.CANCELLATION_REASON_CHOICES]
        if value not in valid:
            raise serializers.ValidationError(
                f"Raison invalide : '{value}'. "
                f"Valeurs autorisées : {', '.join(valid)}."
            )
        return value
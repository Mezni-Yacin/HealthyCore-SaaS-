# -*- coding: utf-8 -*-
from rest_framework import serializers
from django.utils import timezone
from .models import WaitingQueueEntry


# ══════════════════════════════════════════
#  LISTE (résumé léger)
# ══════════════════════════════════════════

class WaitingQueueListSerializer(serializers.ModelSerializer):
    """Serializer léger pour les listes et tableaux."""
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    wait_time = serializers.SerializerMethodField()

    class Meta:
        model = WaitingQueueEntry
        fields = [
            'id', 'patient', 'patient_name', 'doctor', 'doctor_name',
            'status', 'status_display',
            'priority', 'priority_display',
            'reason', 'reason_display', 'reason_details',
            'position', 'estimated_wait_minutes', 'wait_time',
            'joined_at', 'called_at', 'started_at', 'ended_at',
            'created_at',
        ]
        read_only_fields = fields

    def get_patient_name(self, obj):
        return obj.get_patient_full_name()

    def get_doctor_name(self, obj):
        return obj.get_doctor_full_name()

    def get_wait_time(self, obj):
        """Calcule le temps d'attente réel ou en cours."""
        if not obj.joined_at:
            return None

        # Temps réel si la consultation a commencé ou terminée
        if obj.started_at:
            return round((obj.started_at - obj.joined_at).total_seconds() / 60)
        if obj.ended_at:
            return round((obj.ended_at - obj.joined_at).total_seconds() / 60)

        # Temps en cours pour les patients en attente
        if obj.status == 'waiting':
            return round((timezone.now() - obj.joined_at).total_seconds() / 60)

        # Fallback sur la valeur stockée
        return obj.actual_wait_minutes


# ══════════════════════════════════════════
#  DÉTAIL COMPLET
# ══════════════════════════════════════════

class WaitingQueueDetailSerializer(serializers.ModelSerializer):
    """Serializer complet avec infos imbriquées."""
    patient_info = serializers.SerializerMethodField()
    doctor_info = serializers.SerializerMethodField()
    cabinet_info = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    wait_time = serializers.SerializerMethodField()

    class Meta:
        model = WaitingQueueEntry
        fields = [
            'id', 'patient', 'patient_info',
            'doctor', 'doctor_info',
            'cabinet', 'cabinet_info',
            'appointment',
            'status', 'status_display',
            'priority', 'priority_display',
            'reason', 'reason_display', 'reason_details',
            'position', 'estimated_wait_minutes', 'wait_time',
            'joined_at', 'called_at', 'started_at', 'ended_at',
            'actual_wait_minutes', 'consultation_duration_minutes',
            'notes', 'doctor_notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'position', 'joined_at', 'called_at', 'started_at',
            'ended_at', 'actual_wait_minutes', 'consultation_duration_minutes',
            'created_at', 'updated_at',
        ]

    def get_patient_info(self, obj):
        """Infos détaillées du patient."""
        p = obj.patient
        if not p:
            return None

        info = {'id': p.id}

        # Profil utilisateur lié
        if p.user_id and p.user:
            info['full_name'] = p.user.get_full_name()
            info['first_name'] = p.user.first_name
            info['last_name'] = p.user.last_name
            if p.user.phone_number:
                info['phone_number'] = str(p.user.phone_number)
            if p.user.email:
                info['email'] = p.user.email
        else:
            info['full_name'] = str(p)

        # Infos médicales de base
        if hasattr(p, 'date_of_birth') and p.date_of_birth:
            info['date_of_birth'] = str(p.date_of_birth)
        if hasattr(p, 'gender'):
            info['gender'] = p.gender

        return info

    def get_doctor_info(self, obj):
        """Infos détaillées du médecin."""
        d = obj.doctor
        if not d:
            return None

        info = {'id': d.id}

        if d.user_id and d.user:
            info['full_name'] = d.user.get_full_name()

        if hasattr(d, 'specialty') and d.specialty:
            info['specialty'] = d.specialty.name

        return info

    def get_cabinet_info(self, obj):
        """Infos du cabinet."""
        c = obj.cabinet
        if not c:
            return None

        info = {'id': c.id, 'name': c.name}

        if hasattr(c, 'address') and c.address:
            info['address'] = c.address
        if hasattr(c, 'city') and c.city:
            info['city'] = str(c.city)

        return info

    def get_wait_time(self, obj):
        """Même logique que WaitingQueueListSerializer."""
        if not obj.joined_at:
            return None

        if obj.started_at:
            return round((obj.started_at - obj.joined_at).total_seconds() / 60)
        if obj.ended_at:
            return round((obj.ended_at - obj.joined_at).total_seconds() / 60)
        if obj.status == 'waiting':
            return round((timezone.now() - obj.joined_at).total_seconds() / 60)

        return obj.actual_wait_minutes


# ══════════════════════════════════════════
#  ÉCRITURE (création / mise à jour)
# ══════════════════════════════════════════

class WaitingQueueWriteSerializer(serializers.ModelSerializer):
    """
    Serializer pour la création et la mise à jour.

    Le doctor et created_by sont injectés automatiquement via self.context
    (passés depuis la vue) et non pas par serializer.save(doctor=...).
    """

    class Meta:
        model = WaitingQueueEntry
        fields = [
            'patient',
            'cabinet', 'appointment',
            'priority', 'reason', 'reason_details', 'notes',
        ]
        extra_kwargs = {
            # ✅ CORRIGÉ : cabinet et appointment sont nullable dans le modèle,
            # le serializer doit les marquer required=False explicitement.
            # Sinon DRF attend une valeur non-null → erreur 400.
            'cabinet': {'required': False, 'allow_null': True},
            'appointment': {'required': False, 'allow_null': True},
            'reason_details': {'required': False, 'allow_blank': True},
            'notes': {'required': False, 'allow_blank': True},
        }

    def validate_patient(self, value):
        """Le patient est obligatoire."""
        if not value:
            raise serializers.ValidationError("Le patient est obligatoire.")
        return value

    def create(self, validated_data):
        """
        Injecte doctor et created_by depuis self.context avant la création.
        Ces champs ne sont pas dans 'fields' du serializer, donc DRF ne les
        attend pas dans la requête — ils proviennent uniquement du context.
        """
        doctor = self.context.get('doctor')
        created_by = self.context.get('created_by')

        if not doctor:
            raise serializers.ValidationError({
                'doctor': 'Le contexte du médecin est requis pour la création.'
            })

        validated_data['doctor'] = doctor
        if created_by:
            validated_data['created_by'] = created_by

        return super().create(validated_data)

    def update(self, instance, validated_data):
        """
        Mise à jour partielle. Le doctor et le created_by ne sont PAS
        modifiables après la création.
        """
        return super().update(instance, validated_data)
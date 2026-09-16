from rest_framework import serializers
from django.utils import timezone
from .models import MedicalRecord, Prescription, MedicalAttachment


# ====================== PRESCRIPTION — LISTE (résumé) ========================

class PrescriptionListSerializer(serializers.ModelSerializer):
    """Serializer léger pour les prescriptions dans les vues liste."""
    form_display = serializers.CharField(source='get_form_display', read_only=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'medication_name', 'dosage', 'form', 'form_display',
            'frequency', 'duration', 'quantity',
            'is_active', 'is_electronic', 'prescribed_at',
        ]
        read_only_fields = ['id', 'prescribed_at']


# ====================== PRESCRIPTION — DÉTAIL COMPLET ========================

class PrescriptionDetailSerializer(serializers.ModelSerializer):
    """Serializer complet pour les prescriptions."""
    form_display = serializers.CharField(source='get_form_display', read_only=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'medication_name', 'dosage', 'form', 'form_display',
            'frequency', 'duration', 'quantity',
            'instructions', 'with_meals', 'before_meals', 'after_meals',
            'is_generic_allowed', 'refills_allowed',
            'is_active', 'is_electronic', 'prescribed_at',
        ]
        read_only_fields = ['id', 'prescribed_at']


# ====================== PRESCRIPTION — ÉCRITURE ========================

class PrescriptionWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'medication_name', 'dosage', 'form',
            'frequency', 'duration', 'quantity',
            'instructions', 'with_meals', 'before_meals', 'after_meals',
            'is_generic_allowed', 'refills_allowed',
            'is_active', 'is_electronic',
        ]

    def validate_medication_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le nom du médicament est obligatoire.")
        return value.strip()

    def validate_dosage(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("La posologie est obligatoire.")
        return value.strip()

    def validate_frequency(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("La fréquence est obligatoire (ex: 3 fois par jour).")
        return value.strip()

    def validate_duration(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("La durée est obligatoire (ex: 7 jours).")
        return value.strip()

    def validate_quantity(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("La quantité doit être supérieure à 0.")
        return value

    def validate_form(self, value):
        valid_forms = ['tablet', 'capsule', 'liquid', 'injection', 'cream', 'ointment', 'other']
        if value and value not in valid_forms:
            raise serializers.ValidationError(
                f"Forme invalide : '{value}'. "
                f"Formes autorisées : {', '.join(valid_forms)}."
            )
        return value


# ====================== PIÈCE JOINTE — LECTURE ========================

class MedicalAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = MedicalAttachment
        fields = [
            'id', 'file', 'file_url', 'file_type', 'file_type_display',
            'description', 'uploaded_by', 'uploaded_by_name',
            'uploaded_at', 'file_size',
        ]
        read_only_fields = [
            'id', 'file_url', 'file_type',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at', 'file_size',
        ]

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name()
        return None

    def get_file_size(self, obj):
        if obj.file:
            try:
                return obj.file.size
            except Exception:
                return None
        return None


# ====================== PIÈCE JOINTE — UPLOAD ========================

class MedicalAttachmentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalAttachment
        fields = ['file', 'file_type', 'description']

    def validate_file(self, value):
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            size_mb = value.size / (1024 * 1024)
            raise serializers.ValidationError(
                f"Le fichier est trop volumineux ({size_mb:.1f} MB). "
                f"La taille maximale autorisée est de 10 MB."
            )
        return value

    def validate_file_type(self, value):
        valid_types = [f[0] for f in MedicalAttachment.FILE_TYPE_CHOICES]
        if value and value not in valid_types:
            raise serializers.ValidationError(
                f"Type de fichier invalide : '{value}'. "
                f"Types autorisés : {', '.join(valid_types)}."
            )
        return value


# ====================== DOSSIER MÉDICAL — LISTE ========================

class MedicalRecordListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_info = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    doctor_info = serializers.SerializerMethodField()
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    confidentiality_display = serializers.CharField(source='get_confidentiality_level_display', read_only=True)
    diagnosis_summary = serializers.SerializerMethodField()
    prescriptions_count = serializers.SerializerMethodField()
    attachments_count = serializers.SerializerMethodField()

    class Meta:
        model = MedicalRecord
        fields = [
            'id', 'patient', 'patient_name', 'patient_info',
            'doctor', 'doctor_name', 'doctor_info',
            'appointment',
            'diagnosis_summary', 'diagnosis_code',
            'priority', 'priority_display',
            'confidentiality_level', 'confidentiality_display',
            'follow_up_needed', 'follow_up_date',
            'prescriptions_count', 'attachments_count',
            'date', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    # ── Patient helpers ──
    def _get_patient_full_name(self, patient):
        if hasattr(patient, 'user') and patient.user:
            full_name = patient.user.get_full_name()
            if full_name:
                return full_name
            return patient.user.username or patient.user.email or f"Patient #{patient.id}"
        return str(patient) if str(patient) != "Patient object" else f"Patient #{patient.id}"

    def _build_patient_info(self, patient):
        info = {'id': patient.id}
        info['full_name'] = self._get_patient_full_name(patient)
        if hasattr(patient, 'date_of_birth') and patient.date_of_birth:
            info['date_of_birth'] = str(patient.date_of_birth)
        if hasattr(patient, 'gender'):
            info['gender'] = patient.gender
        if hasattr(patient, 'cin') and patient.cin:
            info['cin'] = patient.cin
        if hasattr(patient, 'blood_type') and patient.blood_type:
            info['blood_type'] = patient.blood_type
        if hasattr(patient, 'user') and patient.user:
            if hasattr(patient.user, 'phone_number') and patient.user.phone_number:
                info['phone_number'] = str(patient.user.phone_number)
            if hasattr(patient.user, 'email') and patient.user.email:
                info['email'] = patient.user.email
            if hasattr(patient.user, 'cin') and patient.user.cin and not info.get('cin'):
                info['cin'] = patient.user.cin
        if hasattr(patient, 'city') and patient.city:
            info['city'] = patient.city.name if hasattr(patient.city, 'name') else str(patient.city)
        return info

    # ── Doctor helpers ──
    def _get_doctor_full_name(self, doctor):
        if not doctor:
            return None
        if hasattr(doctor, 'user') and doctor.user:
            return doctor.user.get_full_name()
        return str(doctor)

    def _build_doctor_info(self, doctor):
        if not doctor:
            return None
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

    # ── MethodFields ──
    def get_patient_name(self, obj):
        return self._get_patient_full_name(obj.patient)

    def get_patient_info(self, obj):
        return self._build_patient_info(obj.patient)

    def get_doctor_name(self, obj):
        return self._get_doctor_full_name(obj.doctor)

    def get_doctor_info(self, obj):
        return self._build_doctor_info(obj.doctor)

    def get_diagnosis_summary(self, obj):
        if obj.diagnosis and obj.diagnosis.strip():
            text = obj.diagnosis.strip()
            return text[:150] + '...' if len(text) > 150 else text
        return None

    def get_prescriptions_count(self, obj):
        return obj.prescriptions.filter(is_active=True).count()

    def get_attachments_count(self, obj):
        return obj.attachments.count()


# ====================== DOSSIER MÉDICAL — DÉTAIL COMPLET ========================

class MedicalRecordDetailSerializer(serializers.ModelSerializer):
    patient_info = serializers.SerializerMethodField()
    doctor_info = serializers.SerializerMethodField()
    appointment_info = serializers.SerializerMethodField()
    cabinet_info = serializers.SerializerMethodField() # ✅ AJOUTÉ ICI
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    confidentiality_display = serializers.CharField(source='get_confidentiality_level_display', read_only=True)
    prescriptions = PrescriptionDetailSerializer(many=True, read_only=True)
    attachments = MedicalAttachmentSerializer(many=True, read_only=True)
    vitals = serializers.SerializerMethodField()

    class Meta:
        model = MedicalRecord
        fields = [
            'id', 'patient', 'patient_info',
            'doctor', 'doctor_info',
            'appointment', 'appointment_info',
            'cabinet_info', # ✅ AJOUTÉ DANS LES CHAMPS
            'symptoms', 'diagnosis', 'diagnosis_code',
            'treatment', 'follow_up_needed', 'follow_up_date',
            'priority', 'priority_display',
            'confidentiality_level', 'confidentiality_display',
            'vitals',
            'temperature', 'blood_pressure_systolic', 'blood_pressure_diastolic',
            'heart_rate', 'respiratory_rate', 'oxygen_saturation',
            'notes',
            'prescriptions', 'attachments',
            'date', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'date', 'created_at', 'updated_at']

    # ✅ CORRIGÉ : Méthode déplacée hors de la classe Meta
    def get_cabinet_info(self, obj):
        if obj.appointment and hasattr(obj.appointment, 'cabinet') and obj.appointment.cabinet:
            c = obj.appointment.cabinet
            return {
                'id': c.id,
                'name': c.name,
                'address': getattr(c, 'address', None)
            }
        return None

    def get_patient_info(self, obj):
        p = obj.patient
        if not p:
            return None
        info = {'id': p.id}
        if hasattr(p, 'user') and p.user:
            full_name = p.user.get_full_name()
            if not full_name:
                full_name = p.user.username or p.user.email or f"Patient #{p.id}"
            info['full_name'] = full_name
            info['first_name'] = p.user.first_name
            info['last_name'] = p.user.last_name
            if hasattr(p.user, 'email') and p.user.email:
                info['email'] = p.user.email
            if hasattr(p.user, 'phone_number') and p.user.phone_number:
                info['phone_number'] = str(p.user.phone_number)
            if hasattr(p.user, 'profile_picture') and p.user.profile_picture:
                info['profile_picture'] = str(p.user.profile_picture)
        else:
            info['full_name'] = f"Patient #{p.id}"
        if hasattr(p, 'date_of_birth') and p.date_of_birth:
            info['date_of_birth'] = str(p.date_of_birth)
        if hasattr(p, 'gender'):
            info['gender'] = p.gender
        if hasattr(p, 'blood_type') and p.blood_type:
            info['blood_type'] = p.blood_type
        if hasattr(p, 'height') and p.height:
            info['height'] = float(p.height)
        if hasattr(p, 'weight') and p.weight:
            info['weight'] = float(p.weight)
        if hasattr(p, 'allergies') and p.allergies:
            info['allergies'] = p.allergies
        if hasattr(p, 'chronic_diseases') and p.chronic_diseases:
            info['chronic_diseases'] = p.chronic_diseases
        if hasattr(p, 'cin') and p.cin:
            info['cin'] = p.cin
        if hasattr(p, 'address') and p.address:
            info['address'] = p.address
        if hasattr(p, 'city') and p.city:
            info['city'] = p.city.name if hasattr(p.city, 'name') else str(p.city)
        if hasattr(p, 'emergency_contact_name') and p.emergency_contact_name:
            info['emergency_contact_name'] = p.emergency_contact_name
        if hasattr(p, 'emergency_contact_phone') and p.emergency_contact_phone:
            info['emergency_contact_phone'] = str(p.emergency_contact_phone)
        if hasattr(p, 'insurance_number') and p.insurance_number:
            info['insurance_number'] = p.insurance_number
        if hasattr(p, 'insurance_company') and p.insurance_company:
            info['insurance_company'] = (
                p.insurance_company.name if hasattr(p.insurance_company, 'name')
                else str(p.insurance_company)
            )
        record_count = MedicalRecord.objects.filter(patient=p, is_deleted=False).count()
        info['medical_records_count'] = record_count
        return info

    def get_doctor_info(self, obj):
        d = obj.doctor
        if not d:
            return None
        info = {'id': d.id}
        if hasattr(d, 'user') and d.user:
            info['full_name'] = d.user.get_full_name()
            info['email'] = d.user.email
        if hasattr(d, 'specialty') and d.specialty:
            info['specialty'] = d.specialty.name
            info['specialty_code'] = d.specialty.code
        if hasattr(d, 'license_number'):
            info['license_number'] = d.license_number
        return info

    def get_appointment_info(self, obj):
        a = obj.appointment
        if not a:
            return None
        info = {'id': a.id}
        if hasattr(a, 'date_time'):
            info['date_time'] = str(a.date_time)
        if hasattr(a, 'status'):
            info['status'] = a.status
            info['status_display'] = a.get_status_display() if hasattr(a, 'get_status_display') else a.status
        if hasattr(a, 'notes'):
            info['notes'] = a.notes
        return info

    def get_vitals(self, obj):
        vitals = {}
        if obj.temperature is not None:
            vitals['temperature'] = {
                'value': float(obj.temperature),
                'label': f"{float(obj.temperature)}\u00b0C",
                'unit': '\u00b0C',
            }
        if obj.blood_pressure_systolic is not None or obj.blood_pressure_diastolic is not None:
            sys_val = obj.blood_pressure_systolic
            dia_val = obj.blood_pressure_diastolic
            vitals['blood_pressure'] = {
                'systolic': sys_val,
                'diastolic': dia_val,
                'label': f"{sys_val or '?'}/{dia_val or '?'} mmHg",
                'unit': 'mmHg',
            }
        if obj.heart_rate is not None:
            vitals['heart_rate'] = {
                'value': obj.heart_rate,
                'label': f"{obj.heart_rate} bpm",
                'unit': 'bpm',
            }
        if obj.respiratory_rate is not None:
            vitals['respiratory_rate'] = {
                'value': obj.respiratory_rate,
                'label': f"{obj.respiratory_rate} cpm",
                'unit': 'cpm',
            }
        if obj.oxygen_saturation is not None:
            vitals['oxygen_saturation'] = {
                'value': obj.oxygen_saturation,
                'label': f"{obj.oxygen_saturation}%",
                'unit': '%',
            }
        return vitals if vitals else None


# ====================== DOSSIER MÉDICAL — ÉCRITURE ========================

class MedicalRecordWriteSerializer(serializers.ModelSerializer):
    prescriptions = PrescriptionWriteSerializer(many=True, required=False)

    class Meta:
        model = MedicalRecord
        fields = [
            'patient', 'appointment',
            'symptoms', 'diagnosis', 'diagnosis_code',
            'treatment', 'follow_up_needed', 'follow_up_date',
            'priority', 'confidentiality_level',
            'temperature', 'blood_pressure_systolic', 'blood_pressure_diastolic',
            'heart_rate', 'respiratory_rate', 'oxygen_saturation',
            'notes',
            'prescriptions',
        ]

    def validate_patient(self, value):
        if not value:
            raise serializers.ValidationError("Le patient est obligatoire.")
        return value

    def validate_diagnosis_code(self, value):
        if value is not None:
            value = value.strip().upper()
            if value and not value.replace('.', '').replace(' ', '').replace('-', '').isalnum():
                raise serializers.ValidationError(
                    "Le code CIM-10 doit être alphanumérique (ex: J06.9, I10, S72.0)."
                )
        return value

    def validate_temperature(self, value):
        if value is not None and (value < 30 or value > 45):
            raise serializers.ValidationError("La température doit être entre 30\u00b0C et 45\u00b0C.")
        return value

    def validate_blood_pressure_systolic(self, value):
        if value is not None and (value < 50 or value > 300):
            raise serializers.ValidationError("La pression systolique doit être entre 50 et 300 mmHg.")
        return value

    def validate_blood_pressure_diastolic(self, value):
        if value is not None and (value < 30 or value > 200):
            raise serializers.ValidationError("La pression diastolique doit être entre 30 et 200 mmHg.")
        return value

    def validate_heart_rate(self, value):
        if value is not None and (value < 20 or value > 300):
            raise serializers.ValidationError("Le rythme cardiaque doit être entre 20 et 300 bpm.")
        return value

    def validate_respiratory_rate(self, value):
        if value is not None and (value < 5 or value > 100):
            raise serializers.ValidationError("Le rythme respiratoire doit être entre 5 et 100 cpm.")
        return value

    def validate_oxygen_saturation(self, value):
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError("La saturation en oxygène doit être entre 0 et 100%.")
        return value

    def validate_priority(self, value):
        valid = [p[0] for p in MedicalRecord.PRIORITY_CHOICES]
        if value and value not in valid:
            raise serializers.ValidationError(f"Priorité invalide : '{value}'. Valeurs autorisées : {', '.join(valid)}.")
        return value

    def validate_confidentiality_level(self, value):
        valid = [c[0] for c in MedicalRecord.CONFIDENTIALITY_CHOICES]
        if value and value not in valid:
            raise serializers.ValidationError(f"Niveau de confidentialité invalide : '{value}'. Valeurs autorisées : {', '.join(valid)}.")
        return value

    def validate(self, attrs):
        systolic = attrs.get('blood_pressure_systolic')
        diastolic = attrs.get('blood_pressure_diastolic')
        if systolic is not None and diastolic is not None and diastolic >= systolic:
            raise serializers.ValidationError({
                "blood_pressure_diastolic": "La pression diastolique doit être strictement inférieure à la pression systolique.",
            })
        follow_up = attrs.get('follow_up_needed')
        follow_up_date = attrs.get('follow_up_date')
        if follow_up and not follow_up_date:
            raise serializers.ValidationError({
                "follow_up_date": "La date de suivi est obligatoire lorsqu'un suivi est nécessaire.",
            })
        return attrs

    def create(self, validated_data):
        prescriptions_data = validated_data.pop('prescriptions', [])
        record = MedicalRecord.objects.create(**validated_data)
        self._save_prescriptions(record, prescriptions_data)
        return record

    def update(self, instance, validated_data):
        prescriptions_data = validated_data.pop('prescriptions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if prescriptions_data is not None:
            self._save_prescriptions(instance, prescriptions_data, is_update=True)
        return instance

    def _save_prescriptions(self, record, prescriptions_data, is_update=False):
        processed_ids = set()
        for p_data in prescriptions_data:
            p_id = p_data.get('id')
            if p_id is not None:
                processed_ids.add(p_id)
                try:
                    prescription = record.prescriptions.get(id=p_id)
                    for key, val in p_data.items():
                        if key != 'id':
                            setattr(prescription, key, val)
                    prescription.save()
                except Prescription.DoesNotExist:
                    p_data_without_id = {k: v for k, v in p_data.items() if k != 'id'}
                    Prescription.objects.create(medical_record=record, **p_data_without_id)
            else:
                Prescription.objects.create(medical_record=record, **p_data)
        if is_update and processed_ids:
            record.prescriptions.exclude(id__in=processed_ids).update(is_active=False)
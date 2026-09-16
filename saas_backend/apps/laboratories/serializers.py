from rest_framework import serializers
from .models import Laboratory, LabTestType, LabTestRequest, LabResult

# ══════════════════ LabTestType ══════════════════

class LabTestTypeListSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    class Meta:
        model = LabTestType
        fields = ['id', 'name', 'code', 'category', 'category_display', 'turnaround_time', 'price', 'cnam_coverage', 'cnam_price']

class LabTestTypeDetailSerializer(LabTestTypeListSerializer):
    class Meta(LabTestTypeListSerializer.Meta):
        fields = LabTestTypeListSerializer.Meta.fields + ['description', 'preparation_instructions']

class LabTestTypeCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTestType
        fields = ['name', 'code', 'category', 'description', 'preparation_instructions', 'turnaround_time', 'price', 'cnam_coverage', 'cnam_price']


# ══════════════════ Laboratory ══════════════════

class LaboratoryListSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source='city.name', read_only=True)
    
    class Meta:
        model = Laboratory
        fields = [
            'id', 'name', 'address', 'city', 'city_name', 'phone_number', 'email', 
            'cnam_affiliated', 'is_active', 'logo', 'banner', 'latitude', 'longitude',
            'opening_hours', 'sample_collection_hours', 'accreditation', 'accreditation_number',
            'website', 'services_offered', 'created_at'
        ]

class LaboratoryDetailSerializer(LaboratoryListSerializer):
    specialties_info = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()

    class Meta(LaboratoryListSerializer.Meta):
        fields = LaboratoryListSerializer.Meta.fields + [
            'owner', 'owner_name', 'secretaries', 'website', 'accreditation', 'accreditation_number',
            'cnam_code', 'services_offered', 'specialties_info', 'opening_hours',
            'sample_collection_hours', 'timezone', 'created_at'
        ]

    def get_specialties_info(self, obj):
        return [{'id': s.id, 'name': s.name} for s in obj.specialties.all()]

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return None

class LaboratoryCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Laboratory
        fields = [
            'name', 'address', 'city', 'phone_number', 'email', 'website',
            'accreditation', 'accreditation_number', 'cnam_affiliated', 'cnam_code',
            'services_offered', 'specialties', 'opening_hours', 'sample_collection_hours',
            'timezone', 'logo', 'banner', 'latitude', 'longitude'
            # ✅ 'is_active' retiré d'ici
        ]


# ══════════════════ LabTestRequest ══════════════════

class LabTestRequestListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    lab_name = serializers.CharField(source='laboratory.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    test_names = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    has_result = serializers.SerializerMethodField()
    
    # ✅ NOUVEAUX CHAMPS PAIEMENT
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = LabTestRequest
        fields = [
            'id', 'patient_name', 'doctor_name', 'lab_name', 'test_names', 'request_date', 
            'priority', 'priority_display', 'status', 'status_display', 'total_price', 'has_result',
            'payment_status', 'payment_status_display', 'payment_method', 'payment_method_display'
        ]

    def get_patient_name(self, obj):
        u = obj.patient.user
        return f"{u.first_name} {u.last_name}".strip() or u.username

    def get_doctor_name(self, obj):
        return obj.doctor.user.get_full_name() if obj.doctor and obj.doctor.user else '-'

    def get_test_names(self, obj):
        return list(obj.tests.values_list('name', flat=True))

    def get_total_price(self, obj):
        return float(obj.total_price)

    def get_has_result(self, obj):
        return hasattr(obj, 'result')

class LabTestRequestDetailSerializer(LabTestRequestListSerializer):
    tests_detail = LabTestTypeListSerializer(source='tests', many=True, read_only=True)
    sample_collected_by_name = serializers.SerializerMethodField()
    class Meta(LabTestRequestListSerializer.Meta):
        fields = LabTestRequestListSerializer.Meta.fields + [
            'tests_detail', 'clinical_history', 'diagnosis_suspected', 'notes',
            'sample_collected_at', 'sample_collected_by_name'
        ]
    def get_sample_collected_by_name(self, obj):
        return obj.sample_collected_by.get_full_name() if obj.sample_collected_by else None

class LabTestRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTestRequest
        fields = ['patient', 'laboratory', 'tests', 'priority', 'clinical_history', 'diagnosis_suspected', 'notes']
    def validate_tests(self, value):
        if not value: raise serializers.ValidationError("Sélectionnez au moins une analyse.")
        return value

class LabStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=LabTestRequest.STATUS_CHOICES)


# ══════════════════ LabResult ══════════════════

class LabResultListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    request_date = serializers.CharField(source='test_request.request_date', read_only=True)
    class Meta:
        model = LabResult
        fields = ['id', 'patient_name', 'request_date', 'is_abnormal', 'critical_finding', 'analysis_date', 'validation_date']
    def get_patient_name(self, obj):
        u = obj.test_request.patient.user
        return f"{u.first_name} {u.last_name}".strip() or u.username

class LabResultDetailSerializer(serializers.ModelSerializer):
    request_info = LabTestRequestDetailSerializer(source='test_request', read_only=True)
    analyzed_by_name = serializers.SerializerMethodField()
    validated_by_name = serializers.SerializerMethodField()
    class Meta:
        model = LabResult
        fields = [
            'id', 'request_info', 'results', 'conclusion', 'recommendations',
            'analyzed_by_name', 'validated_by_name', 'pdf_report',
            'analysis_date', 'validation_date', 'is_abnormal', 'critical_finding'
        ]
    def get_analyzed_by_name(self, obj): return obj.analyzed_by.get_full_name() if obj.analyzed_by else None
    def get_validated_by_name(self, obj): return obj.validated_by.get_full_name() if obj.validated_by else None

class LabResultCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabResult
        fields = ['results', 'conclusion', 'recommendations', 'pdf_report', 'is_abnormal', 'critical_finding']
    def validate_results(self, value):
        if not value or not isinstance(value, dict):
            raise serializers.ValidationError("Format JSON invalide. Attendu: {'CODE': {'value': 'X', 'unit': 'Y', 'normal_range': 'Z'}}")
        for code, data in value.items():
            if not isinstance(data, dict) or 'value' not in data:
                raise serializers.ValidationError(f"Format invalide pour '{code}'. 'value' est requis.")
        return value
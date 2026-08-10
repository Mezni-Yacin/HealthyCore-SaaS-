from rest_framework import serializers
from .models import Pharmacy, Medication, PharmacyStock, Prescription, PrescriptionItem, Dispensation, DispensationItem
from django.utils import timezone

# ══════════════════ Médicaments & Stock ══════════════════

class MedicationSerializer(serializers.ModelSerializer):
    form_display = serializers.CharField(source='get_form_display', read_only=True)
    class Meta:
        model = Medication
        fields = ['id', 'name', 'active_ingredient', 'dosage', 'form', 'form_display', 'barcode', 'cnam_refunded', 'cnam_refund_rate', 'requires_prescription']

class PharmacyStockSerializer(serializers.ModelSerializer):
    medication_name = serializers.CharField(source='medication.name', read_only=True)
    medication_dosage = serializers.CharField(source='medication.dosage', read_only=True)
    medication_form = serializers.CharField(source='medication.form', read_only=True)
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = PharmacyStock
        fields = ['id', 'pharmacy', 'medication', 'medication_name', 'medication_dosage', 'medication_form', 'quantity', 'buying_price', 'selling_price', 'batch_number', 'expiry_date', 'is_expired', 'last_restocked_at']
        read_only_fields = ['pharmacy']

    def get_is_expired(self, obj):
        if obj.expiry_date:
            return obj.expiry_date < timezone.now().date()
        return False

class PharmacyStockCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PharmacyStock
        fields = ['medication', 'quantity', 'buying_price', 'selling_price', 'batch_number', 'expiry_date']


# ══════════════════ Pharmacie ══════════════════

class PharmacySerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source='city.name', read_only=True)
    owner_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Pharmacy
        fields = [
            'id', 'name', 'owner_name', 'address', 'city', 'city_name', 'phone_number', 
            'email', 'is_on_duty', 'opening_hours', 'logo', 'latitude', 'longitude', 'is_active'
        ]
    
    def get_owner_name(self, obj):
        return obj.owner.get_full_name() or obj.owner.username if obj.owner else None


# ══════════════════ Ordonnances ══════════════════

class PrescriptionItemSerializer(serializers.ModelSerializer):
    medication_name = serializers.CharField(source='medication.name', read_only=True)
    medication_dosage = serializers.CharField(source='medication.dosage', read_only=True)
    class Meta:
        model = PrescriptionItem
        fields = ['id', 'medication', 'medication_name', 'medication_dosage', 'dosage_instruction', 'quantity_prescribed', 'is_dispensed', 'quantity_dispensed']

class PrescriptionSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    items = PrescriptionItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Prescription
        fields = [
            'id', 'patient', 'patient_name', 'doctor', 'doctor_name', 'prescription_date', 
            'status', 'status_display', 'paper_prescription_scan', 'notes', 'items'
        ]
        
    def get_patient_name(self, obj):
        u = obj.patient.user
        return f"{u.first_name} {u.last_name}".strip() or u.username

    def get_doctor_name(self, obj):
        return obj.doctor.user.get_full_name() if obj.doctor and obj.doctor.user else '-'

class PrescriptionCreateSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True)
    
    class Meta:
        model = Prescription
        fields = ['patient', 'notes', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        # ✅ Le médecin est déjà passé via s.save(doctor=doctor) dans la vue,
        # donc il est déjà dans validated_data. On n'a plus qu'à créer l'objet.
        prescription = Prescription.objects.create(**validated_data)
        for item_data in items_data:
            PrescriptionItem.objects.create(prescription=prescription, **item_data)
        return prescription


# ══════════════════ Dispensation (Vente) ══════════════════

class DispensationItemSerializer(serializers.ModelSerializer):
    medication_name = serializers.CharField(source='medication.name', read_only=True)
    medication_dosage = serializers.CharField(source='medication.dosage', read_only=True)
    total_price = serializers.SerializerMethodField()
    
    class Meta:
        model = DispensationItem
        fields = ['id', 'medication', 'medication_name', 'medication_dosage', 'quantity', 'unit_price', 'total_price']
    
    def get_total_price(self, obj):
        return float(obj.quantity * obj.unit_price)

class DispensationSerializer(serializers.ModelSerializer):
    items = DispensationItemSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()
    pharmacist_name = serializers.SerializerMethodField()
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    class Meta:
        model = Dispensation
        fields = [
            'id', 'pharmacy', 'patient', 'patient_name', 'pharmacist_name', 'prescription',
            'dispensation_date', 'total_amount', 'payment_status', 'payment_status_display', 
            'payment_method', 'payment_method_display', 'items'
        ]
        read_only_fields = ['pharmacy', 'pharmacist', 'total_amount']

    def get_patient_name(self, obj):
        if obj.patient:
            u = obj.patient.user
            return f"{u.first_name} {u.last_name}".strip() or u.username
        return "Client de passage"

    def get_pharmacist_name(self, obj):
        return obj.pharmacist.get_full_name() if obj.pharmacist else '-'

class DispensationCreateSerializer(serializers.Serializer):
    patient_id = serializers.IntegerField(required=False, allow_null=True)
    prescription_id = serializers.IntegerField(required=False, allow_null=True)
    payment_method = serializers.ChoiceField(choices=['cash', 'card', 'cnam', 'insurance'])
    items = serializers.ListField(child=serializers.DictField())
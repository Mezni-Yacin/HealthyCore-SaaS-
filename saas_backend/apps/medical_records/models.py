from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator
from django.utils import timezone
from apps.users.models import User, Patient
from apps.cabinets.models import Doctor
from apps.appointments.models import Appointment

class MedicalRecord(models.Model):
    PRIORITY_CHOICES = (
        ('low', 'Basse'),
        ('medium', 'Moyenne'),
        ('high', 'Haute'),
        ('emergency', 'Urgence'),
    )
    
    CONFIDENTIALITY_CHOICES = (
        ('normal', 'Normale'),
        ('sensitive', 'Sensible'),
        ('highly_sensitive', 'Très Sensible'),
    )
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='medical_records')
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, related_name='medical_records')
    appointment = models.ForeignKey(
        Appointment, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='medical_record'
    )
    
    symptoms = models.TextField(blank=True, null=True)
    diagnosis = models.TextField(blank=True, null=True)
    diagnosis_code = models.CharField(max_length=20, blank=True, null=True, help_text="Code CIM-10")
    treatment = models.TextField(blank=True, null=True)
    follow_up_needed = models.BooleanField(default=False)
    follow_up_date = models.DateField(blank=True, null=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    confidentiality_level = models.CharField(max_length=20, choices=CONFIDENTIALITY_CHOICES, default='normal')
    
    temperature = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True)
    blood_pressure_systolic = models.PositiveIntegerField(blank=True, null=True)
    blood_pressure_diastolic = models.PositiveIntegerField(blank=True, null=True)
    heart_rate = models.PositiveIntegerField(blank=True, null=True)
    respiratory_rate = models.PositiveIntegerField(blank=True, null=True)
    oxygen_saturation = models.PositiveIntegerField(
        blank=True, 
        null=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    notes = models.TextField(blank=True, null=True)
    
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)
    
    date = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Dossier Médical")
        verbose_name_plural = _("Dossiers Médicaux")
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['patient', 'date']),
            models.Index(fields=['doctor', 'date']),
        ]
    
    def __str__(self):
        return f"Dossier de {self.patient} - {self.date}"

class Prescription(models.Model):
    medical_record = models.ForeignKey(
        MedicalRecord, 
        on_delete=models.CASCADE, 
        related_name='prescriptions'
    )
    
    medication_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100)
    form = models.CharField(
        max_length=50,
        choices=(
            ('tablet', 'Comprimé'),
            ('capsule', 'Capsule'),
            ('liquid', 'Liquide'),
            ('injection', 'Injection'),
            ('cream', 'Crème'),
            ('ointment', 'Pommade'),
            ('other', 'Autre'),
        ),
        default='tablet'
    )
    
    frequency = models.CharField(max_length=100, help_text="Ex: 3 fois par jour")
    duration = models.CharField(max_length=50, help_text="Ex: 7 jours")
    quantity = models.PositiveIntegerField(help_text="Quantité totale")
    
    instructions = models.TextField(blank=True, null=True)
    with_meals = models.BooleanField(default=False)
    before_meals = models.BooleanField(default=False)
    after_meals = models.BooleanField(default=True)
    
    is_generic_allowed = models.BooleanField(default=True)
    refills_allowed = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_electronic = models.BooleanField(default=False)
    prescribed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Prescription")
        verbose_name_plural = _("Prescriptions")
        ordering = ['-prescribed_at']
    
    def __str__(self):
        return f"{self.medication_name} pour {self.medical_record.patient}"

class MedicalAttachment(models.Model):
    FILE_TYPE_CHOICES = (
        ('image', 'Image'),
        ('pdf', 'PDF'),
        ('lab_result', 'Résultat de laboratoire'),
        ('scan', 'Scanner/IRM'),
        ('xray', 'Radiographie'),
        ('other', 'Autre'),
    )
    
    medical_record = models.ForeignKey(
        MedicalRecord, 
        on_delete=models.CASCADE, 
        related_name='attachments'
    )
    file = models.FileField(
        upload_to='medical_attachments/%Y/%m/%d/',
        validators=[
            FileExtensionValidator(['pdf', 'jpg', 'jpeg', 'png', 'dicom', 'tiff'])
        ]
    )
    file_type = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES)
    description = models.CharField(max_length=200, blank=True, null=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Pièce Jointe Médicale")
        verbose_name_plural = _("Pièces Jointes Médicales")
    
    def __str__(self):
        return f"{self.get_file_type_display()} - {self.medical_record.patient}"
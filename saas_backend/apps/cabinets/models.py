from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import FileExtensionValidator, MinValueValidator
from phonenumber_field.modelfields import PhoneNumberField
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.users.models import User, City, MedicalSpecialty

class Cabinet(models.Model):
    name = models.CharField(max_length=200)
    owner = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='owned_cabinets',
        limit_choices_to={'role': 'doctor'}
    )
    secretaries = models.ManyToManyField(
        User, 
        related_name='managed_cabinets',
        limit_choices_to={'role': 'secretary'},
        blank=True
    )
    
    address = models.TextField()
    city = models.ForeignKey(City, on_delete=models.PROTECT)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    
    phone_number = PhoneNumberField(region='TN')
    email = models.EmailField()
    website = models.URLField(blank=True, null=True)
    
    specialties = models.ManyToManyField(MedicalSpecialty, related_name='cabinets')
    cnam_affiliated = models.BooleanField(default=False)
    cnam_code = models.CharField(max_length=50, blank=True, null=True)
    accreditation = models.TextField(blank=True, null=True)
    
    opening_hours = models.JSONField(
        default=dict,
        help_text='Format: {"lundi": ["08:00-12:00", "14:00-18:00"], ...}'
    )
    appointment_duration = models.PositiveIntegerField(default=30, help_text="Durée par défaut en minutes")
    timezone = models.CharField(max_length=50, default='Africa/Tunis')
    
    logo = models.ImageField(
        upload_to='cabinet_logos/%Y/%m/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png'])]
    )
    banner = models.ImageField(
        upload_to='cabinet_banners/%Y/%m/',
        blank=True,
        null=True
    )
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Cabinet Médical")
        verbose_name_plural = _("Cabinets Médicaux")
        indexes = [
            models.Index(fields=['city', 'is_active']),
            models.Index(fields=['cnam_affiliated']),
        ]
    
    def __str__(self):
        return self.name


class Doctor(models.Model):
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='doctor_profile',
        limit_choices_to={'role': 'doctor'}
    )
    cabinets = models.ManyToManyField(Cabinet, related_name='doctors')
    
    specialty = models.ForeignKey(MedicalSpecialty, on_delete=models.PROTECT, related_name='doctors')
    license_number = models.CharField(max_length=50, unique=True)
    years_experience = models.PositiveIntegerField(default=0)
    cnam_code = models.CharField(max_length=50, blank=True, null=True)
    
    consultation_price = models.DecimalField(
        max_digits=10, 
        decimal_places=3,
        default=0.000,
        validators=[MinValueValidator(0)]
    )
    
    bio = models.TextField(blank=True, null=True)
    education = models.JSONField(default=list, blank=True)
    certifications = models.JSONField(
        default=list,
        blank=True,
        help_text="Liste des certifications (JSON)"
    )
    
    accepts_new_patients = models.BooleanField(default=True)
    teleconsultation_available = models.BooleanField(default=False)
    
    profile_photo = models.ImageField(
        upload_to='doctor_photos/%Y/%m/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png'])]
    )
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    review_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        verbose_name = _("Médecin")
        verbose_name_plural = _("Médecins")
        indexes = [
            models.Index(fields=['specialty']),
            models.Index(fields=['rating']),
        ]
    
    def __str__(self):
        return f"Dr. {self.user.get_full_name()} - {self.specialty.name}"


class DoctorAvailability(models.Model):
    DAY_CHOICES = (
        ('monday', 'Lundi'),
        ('tuesday', 'Mardi'),
        ('wednesday', 'Mercredi'),
        ('thursday', 'Jeudi'),
        ('friday', 'Vendredi'),
        ('saturday', 'Samedi'),
        ('sunday', 'Dimanche'),
    )
    
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='availabilities')
    day = models.CharField(max_length=10, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_duration = models.PositiveIntegerField(default=15, help_text="Durée du créneau en minutes")
    is_available = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = _("Disponibilité du Médecin")
        verbose_name_plural = _("Disponibilités des Médecins")
        unique_together = ['doctor', 'day', 'start_time']
        ordering = ['doctor', 'day', 'start_time']
    
    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError("L'heure de début doit être avant l'heure de fin")
    
    def __str__(self):
        return f"{self.doctor} - {self.get_day_display()} {self.start_time}-{self.end_time}"


class DoctorUnavailability(models.Model):
    REASON_CHOICES = (
        ('vacation', 'Vacances'),
        ('training', 'Formation'),
        ('emergency', 'Urgence'),
        ('conference', 'Conférence'),
        ('other', 'Autre'),
    )
    
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='unavailabilities')
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    description = models.TextField(blank=True, null=True)
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        verbose_name = _("Indisponibilité du Médecin")
        verbose_name_plural = _("Indisponibilités des Médecins")
        indexes = [
            models.Index(fields=['doctor', 'start_datetime']),
        ]
    
    def clean(self):
        if self.end_datetime <= self.start_datetime:
            raise ValidationError("La date de fin doit être après la date de début")
    
    def __str__(self):
        return f"{self.doctor} - Indisponible du {self.start_datetime} au {self.end_datetime}"
# apps/users/models.py
from django.db import models
from decimal import Decimal
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.core.validators import (
    MinValueValidator,
    FileExtensionValidator,
    RegexValidator,
)
from phonenumber_field.modelfields import PhoneNumberField
import uuid
from datetime import date
from django.core.exceptions import ValidationError
from django.utils import timezone


class Governorate(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)
    
    class Meta:
        verbose_name = _("Gouvernorat")
        verbose_name_plural = _("Gouvernorats")
        ordering = ['name']
    
    def __str__(self):
        return self.name


class City(models.Model):
    name = models.CharField(max_length=100)
    governorate = models.ForeignKey(Governorate, on_delete=models.CASCADE, related_name='cities')
    postal_code = models.CharField(max_length=10, blank=True, null=True)
    
    class Meta:
        verbose_name = _("Ville")
        verbose_name_plural = _("Villes")
        ordering = ['name']
        unique_together = ['name', 'governorate']
    
    def __str__(self):
        return f"{self.name} ({self.governorate.name})"


class InsuranceCompany(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True, blank=True, null=True)
    is_cnam = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = _("Compagnie d'Assurance")
        verbose_name_plural = _("Compagnies d'Assurance")
        ordering = ['name']
    
    def __str__(self):
        return self.name


class MedicalSpecialty(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True, help_text="Code CNAM de la spécialité")
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = _("Spécialité Médicale")
        verbose_name_plural = _("Spécialités Médicales")
        ordering = ['name']
    
    def __str__(self):
        return self.name


class User(AbstractUser):
    ROLE_CHOICES = (
        ('super_admin', 'Super Administrateur'),
        ('admin', 'Administrateur'),
        ('doctor', 'Médecin'),
        ('lab_staff', 'Personnel de Laboratoire'),
        ('patient', 'Patient'),
        ('secretary', 'Secrétaire'),
        ('pharmacist', 'Pharmacien'),
    )
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='patient')
    phone_number = PhoneNumberField(region='TN', blank=True, null=True, unique=True)
    address = models.TextField(blank=True, null=True)
    city = models.ForeignKey(City, on_delete=models.SET_NULL, null=True, blank=True)
    
    is_verified = models.BooleanField(default=False)
    verification_token = models.UUIDField(default=uuid.uuid4, editable=False)
    two_factor_enabled = models.BooleanField(default=False)
    last_2fa_code = models.CharField(max_length=6, blank=True, null=True)
    last_2fa_sent = models.DateTimeField(blank=True, null=True)
    
    language_preference = models.CharField(
        max_length=2, 
        choices=(('fr', 'Français'), ('ar', 'Arabe')), 
        default='fr'
    )
    
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_user_groups_set',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_user_permissions_set',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    profile_picture = models.ImageField(
        upload_to='profile_pictures/%Y/%m/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png'])]
    )
    
    class Meta:
        verbose_name = _("Utilisateur")
        verbose_name_plural = _("Utilisateurs")
        indexes = [
            models.Index(fields=['role', 'is_active']),
            models.Index(fields=['phone_number']),
            models.Index(fields=['email']),
        ]
    
    def clean(self):
        if self.role == 'doctor' and not self.email:
            raise ValidationError({'email': 'Les médecins doivent avoir un email'})
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"


class SubscriptionPlan(models.Model):
    PLAN_CHOICES = (
        ('basic', 'Basique'),
        ('pro', 'Professionnel'),
        ('enterprise', 'Entreprise'),
        ('premium', 'Premium'),
        ('custom', 'Personnalisé'),
    )
    

    name = models.CharField(max_length=50, choices=PLAN_CHOICES, default='basic')
    display_name = models.CharField(max_length=100, unique=True, default='Plan')
    description = models.TextField(blank=True, null=True)
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    yearly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_doctors = models.PositiveIntegerField(default=1)
    max_secretaries = models.PositiveIntegerField(default=1)
    max_patients = models.PositiveIntegerField(default=100)
    # Fonctionnalités (liste)
    features = models.JSONField(default=list, blank=True)
    # Options
    is_active = models.BooleanField(default=True)
    is_popular = models.BooleanField(default=False)
    discount_percentage = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'monthly_price']
        verbose_name = _("Plan d'abonnement")
        verbose_name_plural = _("Plans d'abonnement")
    
    def __str__(self):
        return f"{self.display_name} ({self.get_name_display()})"


class Subscription(models.Model):
    PERIOD_CHOICES = (
        ('monthly', 'Mensuel'),        
        ('quarterly', 'Trimestriel'), 
        ('semiannual', 'Semestriel'),  
        ('yearly', 'Annuel'),         
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscriptions')
    period = models.CharField(max_length=10, choices=PERIOD_CHOICES, default='monthly')
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    auto_renew = models.BooleanField(default=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    stripe_subscription_id = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        verbose_name = _("Abonnement")
        verbose_name_plural = _("Abonnements")
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['end_date']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.end_date:
            period_days = {
                'monthly': 30,
                'quarterly': 90,
                'semiannual': 180,
                'yearly': 365,
            }
            days = period_days.get(self.period, 30)
            self.end_date = timezone.now() + timezone.timedelta(days=days)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.user} - {self.plan.display_name}"


class Patient(models.Model):
    GENDER_CHOICES = (
        ('M', 'Homme'),
        ('F', 'Femme'),
        ('O', 'Autre'),
        ('U', 'Non spécifié'),
    )
    
    BLOOD_TYPE_CHOICES = (
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    )
    
    user = models.OneToOneField(
        User, 
        on_delete=models.SET_NULL, 
        null=True,
        blank=True,
        related_name='patient_profile'
    )
    
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='U')
    
    blood_type = models.CharField(max_length=3, choices=BLOOD_TYPE_CHOICES, blank=True, null=True)
    height = models.PositiveIntegerField(blank=True, null=True, help_text="Taille en cm")
    weight = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        blank=True, 
        null=True, 
        help_text="Poids en kg"
    )
    allergies = models.TextField(blank=True, null=True)
    chronic_diseases = models.TextField(blank=True, null=True)
    current_medications = models.TextField(blank=True, null=True)
    family_history = models.TextField(blank=True, null=True)
    
    insurance_company = models.ForeignKey(
        InsuranceCompany, 
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    insurance_number = models.CharField(
        max_length=50, 
        unique=True, 
        blank=True, 
        null=True,
        validators=[
            RegexValidator(
                regex=r'^\d{10,20}$',
                message="Le numéro d'assurance doit contenir 10 à 20 chiffres"
            )
        ]
    )
    
    consent_given = models.BooleanField(default=False)
    consent_date = models.DateTimeField(blank=True, null=True)
    consent_version = models.CharField(max_length=10, blank=True, null=True)
    
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = PhoneNumberField(region='TN', blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Patient")
        verbose_name_plural = _("Patients")
        indexes = [
            models.Index(fields=['date_of_birth']),
            models.Index(fields=['insurance_number']),
        ]
    
    @property
    def age(self):
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )
    
    def clean(self):
        if self.date_of_birth > date.today():
            raise ValidationError({'date_of_birth': "La date de naissance ne peut pas être dans le futur"})
        
        age = self.age
        if age < 0 or age > 120:
            raise ValidationError({'date_of_birth': "L'âge doit être entre 0 et 120 ans"})
    
    def __str__(self):
        return f"{self.user.get_full_name() if self.user else 'Patient anonyme'} ({self.age} ans)"


class UserDocument(models.Model):
    
    DOCUMENT_TYPE_CHOICES = (
        ('diploma', 'Diplôme / Doctorat'),
        ('certificate', 'Certificat / Attestation'),
        ('lab_result', 'Résultat d\'analyse'),
        ('prescription', 'Ordonnance'),
        ('medical_record', 'Dossier médical'),
        ('radio', 'Radiographie / Imagerie'),
        ('other', 'Autre document'),
    )
    
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='documents',
        verbose_name="Utilisateur"
    )
    
    title = models.CharField(max_length=255, verbose_name="Titre du document")
    document_type = models.CharField(
        max_length=20, 
        choices=DOCUMENT_TYPE_CHOICES, 
        default='other',
        verbose_name="Type de document"
    )
    
    file = models.FileField(
        upload_to='user_documents/%Y/%m/',
        validators=[
            FileExtensionValidator(['pdf', 'jpg', 'jpeg', 'png']),
        ],
        verbose_name="Fichier"
    )
    
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    uploaded_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='uploaded_documents',
        verbose_name="Uploadé par"
    )
    
    is_verified = models.BooleanField(default=False, verbose_name="Vérifié")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Document utilisateur")
        verbose_name_plural = _("Documents utilisateur")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'document_type']),
            models.Index(fields=['is_verified']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.get_document_type_display()}) - {self.user}"
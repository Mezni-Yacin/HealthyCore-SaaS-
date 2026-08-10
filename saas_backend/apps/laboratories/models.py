from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from phonenumber_field.modelfields import PhoneNumberField
from django.utils import timezone
from apps.users.models import User, City, MedicalSpecialty, Patient
from apps.cabinets.models import Doctor

class Laboratory(models.Model):
    name = models.CharField(max_length=200)
    owner = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='owned_labs',
        limit_choices_to={'role': 'lab_staff'}
    )
    secretaries = models.ManyToManyField(
        User, 
        related_name='managed_labs',
        limit_choices_to={'role': 'secretary'},
        blank=True
    )
    
    address = models.TextField()
    city = models.ForeignKey(City, on_delete=models.PROTECT)
    
    phone_number = PhoneNumberField(region='TN')
    email = models.EmailField()
    website = models.URLField(blank=True, null=True)
    
    accreditation = models.CharField(max_length=100, blank=True, null=True)
    accreditation_number = models.CharField(max_length=50, blank=True, null=True)
    cnam_affiliated = models.BooleanField(default=False)
    cnam_code = models.CharField(max_length=50, blank=True, null=True)
    
    services_offered = models.JSONField(
        default=list,
        help_text="Services offerts (liste JSON)"
    )
    specialties = models.ManyToManyField(MedicalSpecialty, related_name='laboratories', blank=True)
    
    opening_hours = models.JSONField(default=dict)
    sample_collection_hours = models.JSONField(default=dict, blank=True)
    timezone = models.CharField(max_length=50, default='Africa/Tunis')
    
    logo = models.ImageField(upload_to='lab_logos/%Y/%m/', blank=True, null=True)
    banner = models.ImageField(upload_to='lab_banners/%Y/%m/', blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Laboratoire")
        verbose_name_plural = _("Laboratoires")
        ordering = ['name']
    
    def __str__(self):
        return self.name


class LabTestType(models.Model):
    CATEGORY_CHOICES = (
        ('hematology', 'Hématologie'),
        ('biochemistry', 'Biochimie'),
        ('microbiology', 'Microbiologie'),
        ('immunology', 'Immunologie'),
        ('hormones', 'Hormones'),
        ('urinalysis', 'Analyse d\'urine'),
        ('other', 'Autre'),
    )
    
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True, null=True)
    preparation_instructions = models.TextField(blank=True, null=True)
    turnaround_time = models.PositiveIntegerField(help_text="Délai en heures")
    price = models.DecimalField(max_digits=10, decimal_places=3, validators=[MinValueValidator(0)])
    cnam_coverage = models.BooleanField(default=False)
    cnam_price = models.DecimalField(
        max_digits=10, 
        decimal_places=3, 
        default=0.000,
        validators=[MinValueValidator(0)]
    )
    
    class Meta:
        verbose_name = _("Type d'Analyse")
        verbose_name_plural = _("Types d'Analyses")
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class LabTestRequest(models.Model):
    STATUS_CHOICES = (
        ('requested', 'Demandé'),
        ('sample_collected', 'Prélèvement Effectué'),
        ('in_progress', 'En Cours d\'Analyse'),
        ('completed', 'Complété'),
        ('cancelled', 'Annulé'),
    )
    
    PRIORITY_CHOICES = (
        ('normal', 'Normal'),
        ('urgent', 'Urgent'),
        ('stat', 'Stat (Immédiat)'),
    )

    # ✅ NOUVEAUX CHOIX DE PAIEMENT
    PAYMENT_STATUS_CHOICES = (
        ('unpaid', 'Non Payé'),
        ('paid', 'Payé'),
    )
    PAYMENT_METHOD_CHOICES = (
        ('cash', 'Espèces'),
        ('card', 'Carte Bancaire'),
        ('online', 'Paiement en ligne (Stripe)'),
        ('cnam', 'CNAM'),
        ('insurance', 'Assurance'),
    )
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='lab_requests')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='lab_requests')
    laboratory = models.ForeignKey(Laboratory, on_delete=models.PROTECT, related_name='requests')
    
    tests = models.ManyToManyField(LabTestType, related_name='requests')
    
    request_date = models.DateTimeField(auto_now_add=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='requested')
    
    # ✅ NOUVEAUX CHAMPS DE PAIEMENT
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, blank=True, null=True)
    
    clinical_history = models.TextField(blank=True, null=True)
    diagnosis_suspected = models.CharField(max_length=200, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    sample_collected_at = models.DateTimeField(blank=True, null=True)
    sample_collected_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        limit_choices_to={'role__in': ['lab_staff', 'doctor']}
    )
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        verbose_name = _("Demande d'Analyse")
        verbose_name_plural = _("Demandes d'Analyses")
        ordering = ['-request_date']
        indexes = [
            models.Index(fields=['patient', 'request_date']),
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
        ]
    
    @property
    def total_price(self):
        return sum(test.price for test in self.tests.all())
    
    def __str__(self):
        return f"Analyse pour {self.patient} - {self.request_date.date()}"


class LabResult(models.Model):
    test_request = models.OneToOneField(
        LabTestRequest, 
        on_delete=models.CASCADE, 
        related_name='result'
    )
    
    results = models.JSONField(
        default=dict,
        help_text='Format: {"test_code": {"value": "X", "unit": "Y", "normal_range": "Z"}, ...}'
    )
    conclusion = models.TextField(blank=True, null=True)
    recommendations = models.TextField(blank=True, null=True)
    
    analyzed_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True,
        limit_choices_to={'role': 'lab_staff'}
    )
    validated_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='validated_results',
        limit_choices_to={'role': 'lab_staff'}
    )
    
    pdf_report = models.FileField(
        upload_to='lab_results/%Y/%m/%d/',
        blank=True,
        null=True
    )
    
    analysis_date = models.DateTimeField(auto_now_add=True)
    validation_date = models.DateTimeField(blank=True, null=True)
    is_abnormal = models.BooleanField(default=False)
    critical_finding = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        verbose_name = _("Résultat d'Analyse")
        verbose_name_plural = _("Résultats d'Analyses")
        ordering = ['-analysis_date']
    
    def __str__(self):
        return f"Résultat pour {self.test_request.patient} - {self.analysis_date.date()}"
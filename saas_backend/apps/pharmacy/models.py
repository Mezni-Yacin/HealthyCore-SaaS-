from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from phonenumber_field.modelfields import PhoneNumberField
from django.utils import timezone
from decimal import Decimal
from apps.users.models import User, City, Patient
from apps.cabinets.models import Doctor

# ══════════════════ MODÈLE : PHARMACIE (OFFICINE) ══════════════════

class Pharmacy(models.Model):
    name = models.CharField(max_length=200, verbose_name=_("Nom de la pharmacie"))
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_pharmacies', limit_choices_to={'role': 'pharmacist'})
    address = models.TextField(verbose_name=_("Adresse"))
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name='pharmacies')
    phone_number = PhoneNumberField(region='TN', verbose_name=_("Téléphone"))
    email = models.EmailField(blank=True, null=True)
    is_on_duty = models.BooleanField(default=False, verbose_name=_("Garde actuelle"))
    opening_hours = models.JSONField(default=dict, verbose_name=_("Horaires d'ouverture"))
    logo = models.ImageField(upload_to='pharmacy_logos/%Y/%m/', blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Pharmacie")
        verbose_name_plural = _("Pharmacies")
        ordering = ['name']

    def __str__(self):
        return self.name


# ══════════════════ MODÈLE : MÉDICAMENT (CATALOGUE GLOBAL) ══════════════════

class Medication(models.Model):
    FORM_CHOICES = (
        ('tablet', 'Comprimé'), ('capsule', 'Gélule'), ('syrup', 'Sirop'),
        ('injection', 'Injection'), ('cream', 'Crème/Pommade'), ('drops', 'Gouttes'),
        ('spray', 'Spray'), ('other', 'Autre'),
    )

    name = models.CharField(max_length=200, verbose_name=_("Nom commercial"))
    # ✅ Autoriser un principe actif vide pour la création rapide
    active_ingredient = models.CharField(max_length=200, verbose_name=_("Principe actif"), blank=True, default="Inconnu")
    dosage = models.CharField(max_length=50, verbose_name=_("Dosage (ex: 500mg, 5ml)"))
    form = models.CharField(max_length=20, choices=FORM_CHOICES, verbose_name=_("Forme galénique"), default='tablet')
    barcode = models.CharField(max_length=100, blank=True, null=True, unique=True, verbose_name=_("Code-barres"))
    cnam_refunded = models.BooleanField(default=False, verbose_name=_("Remboursable CNAM"))
    # ✅ Correction de l'avertissement Decimal
    cnam_refund_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'), 
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name=_("Taux de remboursement CNAM (%)")
    )
    requires_prescription = models.BooleanField(default=True, verbose_name=_("Sur ordonnance"))
    
    class Meta:
        verbose_name = _("Médicament")
        verbose_name_plural = _("Médicaments")
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['active_ingredient']),
        ]

    def __str__(self):
        return f"{self.name} {self.dosage} ({self.get_form_display()})"


# ══════════════════ MODÈLE : STOCK DE LA PHARMACIE ══════════════════

class PharmacyStock(models.Model):
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.CASCADE, related_name='stock_items')
    medication = models.ForeignKey(Medication, on_delete=models.PROTECT, related_name='stock_records')
    quantity = models.PositiveIntegerField(default=0, verbose_name=_("Quantité en stock"))
    # ✅ Correction de l'avertissement Decimal
    buying_price = models.DecimalField(max_digits=10, decimal_places=3, validators=[MinValueValidator(Decimal('0'))], verbose_name=_("Prix d'achat"))
    selling_price = models.DecimalField(max_digits=10, decimal_places=3, validators=[MinValueValidator(Decimal('0'))], verbose_name=_("Prix de vente"))
    batch_number = models.CharField(max_length=50, blank=True, null=True, verbose_name=_("Numéro de lot"))
    expiry_date = models.DateField(verbose_name=_("Date de péremption"))
    last_restocked_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Stock Pharmacie")
        verbose_name_plural = _("Stocks Pharmacies")
        unique_together = ('pharmacy', 'medication')
        ordering = ['-expiry_date']

    def __str__(self):
        return f"{self.medication.name} - {self.pharmacy.name} (Stock: {self.quantity})"


# ══════════════════ MODÈLE : ORDONNANCE NUMÉRIQUE ══════════════════

class Prescription(models.Model):
    STATUS_CHOICES = (
        ('pending', 'En attente'), ('dispensed', 'Délivrée'),
        ('partially_dispensed', 'Délivrée partiellement'), ('expired', 'Expirée'),
    )
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='pharmacy_prescriptions')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='issued_prescriptions')
    prescription_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paper_prescription_scan = models.ImageField(upload_to='prescription_scans/%Y/%m/', blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = _("Ordonnance")
        verbose_name_plural = _("Ordonnances")
        ordering = ['-prescription_date']

    def __str__(self):
        return f"Ordonnance {self.id} - {self.patient}"


class PrescriptionItem(models.Model):
    prescription = models.ForeignKey(Prescription, on_delete=models.CASCADE, related_name='items')
    medication = models.ForeignKey(Medication, on_delete=models.PROTECT)
    dosage_instruction = models.CharField(max_length=255, verbose_name=_("Posologie"))
    quantity_prescribed = models.PositiveIntegerField(verbose_name=_("Quantité prescrite"))
    is_dispensed = models.BooleanField(default=False)
    quantity_dispensed = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = _("Ligne d'ordonnance")
        verbose_name_plural = _("Lignes d'ordonnance")

    def __str__(self):
        return f"{self.medication.name} ({self.quantity_prescribed})"


class Dispensation(models.Model):
    PAYMENT_STATUS_CHOICES = (('unpaid', 'Non Payé'), ('paid', 'Payé'))
    PAYMENT_METHOD_CHOICES = (
        ('cash', 'Espèces'), ('card', 'Carte Bancaire'),
        ('cnam', 'CNAM'), ('insurance', 'Assurance'),
    )
    
    pharmacy = models.ForeignKey(Pharmacy, on_delete=models.PROTECT, related_name='dispensations')
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name='pharmacy_dispensations')
    pharmacist = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, limit_choices_to={'role': 'pharmacist'})
    prescription = models.ForeignKey(Prescription, on_delete=models.SET_NULL, null=True, blank=True)
    dispensation_date = models.DateTimeField(auto_now_add=True)
    # ✅ Correction de l'avertissement Decimal
    total_amount = models.DecimalField(max_digits=10, decimal_places=3, default=Decimal('0'), validators=[MinValueValidator(Decimal('0'))])
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = _("Dispensation / Vente")
        verbose_name_plural = _("Dispensations / Ventes")
        ordering = ['-dispensation_date']

    def __str__(self):
        return f"Vente {self.id} - {self.pharmacy.name}"


class DispensationItem(models.Model):
    dispensation = models.ForeignKey(Dispensation, on_delete=models.CASCADE, related_name='items')
    medication = models.ForeignKey(Medication, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(verbose_name=_("Quantité vendue"))
    # ✅ Correction de l'avertissement Decimal
    unit_price = models.DecimalField(max_digits=10, decimal_places=3, validators=[MinValueValidator(Decimal('0'))])
    stock_item = models.ForeignKey(PharmacyStock, on_delete=models.SET_NULL, null=True)

    class Meta:
        verbose_name = _("Ligne de dispensation")
        verbose_name_plural = _("Lignes de dispensation")

    def __str__(self):
        return f"{self.medication.name} x{self.quantity}"
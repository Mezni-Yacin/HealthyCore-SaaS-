from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.users.models import User, Patient
from apps.cabinets.models import Doctor, Cabinet

class Appointment(models.Model):
    STATUS_CHOICES = (
        ('scheduled', 'Programmé'),
        ('confirmed', 'Confirmé'),
        ('in_progress', 'En Cours'),
        ('completed', 'Complété'),
        ('cancelled', 'Annulé'),
        ('no_show', 'Non Présenté'),
    )
    
    CANCELLATION_REASON_CHOICES = (
        ('patient', 'Patient a annulé'),
        ('doctor', 'Médecin a annulé'),
        ('emergency', 'Urgence médicale'),
        ('weather', 'Mauvais temps'),
        ('other', 'Autre'),
    )
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='appointments')
    cabinet = models.ForeignKey(Cabinet, on_delete=models.PROTECT, related_name='appointments')
    
    date_time = models.DateTimeField()
    duration = models.PositiveIntegerField(default=30, help_text="Durée en minutes")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    
    is_teleconsultation = models.BooleanField(default=False)
    consultation_type = models.CharField(
        max_length=20,
        choices=(
            ('first', 'Première consultation'),
            ('followup', 'Consultation de suivi'),
            ('emergency', 'Urgence'),
            ('routine', 'Consultation de routine'),
        ),
        default='routine'
    )
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_appointments')
    last_modified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='modified_appointments')
    approved_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='approved_appointments',
        limit_choices_to={'role__in': ['secretary', 'doctor']}
    )
    cancellation_reason = models.CharField(
        max_length=20, 
        choices=CANCELLATION_REASON_CHOICES, 
        blank=True, 
        null=True
    )
    cancellation_notes = models.TextField(blank=True, null=True)
    
    symptoms = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    reminder_sent_24h = models.BooleanField(default=False)
    reminder_sent_1h = models.BooleanField(default=False)
    
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _("Rendez-vous")
        verbose_name_plural = _("Rendez-vous")
        ordering = ['-date_time']
        indexes = [
            models.Index(fields=['patient', 'date_time']),
            models.Index(fields=['doctor', 'date_time']),
            models.Index(fields=['status', 'date_time']),
            models.Index(fields=['is_teleconsultation']),
        ]
    
    def clean(self):
        if self.date_time <= timezone.now():
            raise ValidationError({'date_time': "Le rendez-vous doit être dans le futur"})
        
        if self.cabinet not in self.doctor.cabinets.all():
            raise ValidationError({'cabinet': "Ce cabinet n'est pas associé à ce médecin"})
        
        if self.pk:
            conflicts = Appointment.objects.filter(
                doctor=self.doctor,
                date_time__date=self.date_time.date(),
                status__in=['scheduled', 'confirmed'],
                cabinet=self.cabinet
            ).exclude(pk=self.pk)
            
            for conflict in conflicts:
                end_time = conflict.date_time + timezone.timedelta(minutes=conflict.duration)
                if self.date_time < end_time:
                    raise ValidationError(
                        {'date_time': f"Conflit avec un autre rendez-vous à {conflict.date_time}"}
                    )
    
    def __str__(self):
        return f"RDV: {self.patient} avec Dr. {self.doctor.user.last_name} le {self.date_time}"
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.contenttypes.models import ContentType
from apps.users.models import User

class AuditLog(models.Model):
    ACTION_CHOICES = (
        ('create', 'Création'),
        ('update', 'Modification'),
        ('delete', 'Suppression'),
        ('view', 'Consultation'),
        ('login', 'Connexion'),
        ('logout', 'Déconnexion'),
        ('access_denied', 'Accès Refusé'),
    )
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100, blank=True, null=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _("Entrée du Journal d'Audit")
        verbose_name_plural = _("Journal d'Audit")
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.get_action_display()} par {self.user} à {self.timestamp}"


class Notification(models.Model):
    TYPE_CHOICES = (
        ('appointment_reminder', 'Rappel de Rendez-vous'),
        ('appointment_confirmation', 'Confirmation de Rendez-vous'),
        ('appointment_cancellation', 'Annulation de Rendez-vous'),
        ('lab_result_ready', 'Résultat d\'Analyse Disponible'),
        ('invoice_generated', 'Facture Générée'),
        ('payment_received', 'Paiement Reçu'),
        ('system_alert', 'Alerte Système'),
        ('security_alert', 'Alerte de Sécurité'),
    )
    
    PRIORITY_CHOICES = (
        ('low', 'Basse'),
        ('medium', 'Moyenne'),
        ('high', 'Haute'),
        ('urgent', 'Urgente'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    content_type = models.ForeignKey(
        ContentType, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    
    is_read = models.BooleanField(default=False)
    is_sent = models.BooleanField(default=False)
    sent_via = models.CharField(
        max_length=20,
        choices=(
            ('in_app', 'Dans l\'application'),
            ('email', 'Email'),
            ('sms', 'SMS'),
            ('push', 'Notification Push'),
        ),
        default='in_app'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        verbose_name = _("Notification")
        verbose_name_plural = _("Notifications")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['type', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} pour {self.user}"
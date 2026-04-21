# -*- coding: utf-8 -*-
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
import datetime

from apps.users.models import User, Patient
from apps.cabinets.models import Doctor, Cabinet


def _today_range():
    """
    ✅ CORRIGÉ CRITIQUE — CONVERT_TZ Bug MySQL

    PROBLÈME : MySQL + USE_TZ=True + TIME_ZONE='Africa/Tunis' génère :
      DATE(CONVERT_TZ(joined_at, UTC, Africa/Tunis)) = 2026-04-10
    Mais CONVERT_TZ retourne NULL si les tables de timezone MySQL
    ne sont pas chargées → DATE(NULL) = NULL → aucun résultat !

    SOLUTION : Utiliser un filtre de plage __gte / __lt qui ne passe
    pas par CONVERT_TZ. On calcule minuit en temps local (Tunis),
    puis Django le convertit automatiquement en UTC pour la requête SQL.

    Exemple pour Africa/Tunis (UTC+1) :
      today_start = 2026-04-10 00:00:00+01:00  →  SQL: 2026-04-09 23:00:00 UTC
      today_end   = 2026-04-11 00:00:00+01:00  →  SQL: 2026-04-10 23:00:00 UTC
    Ce qui génère : WHERE joined_at >= '2026-04-09 23:00:00' AND joined_at < '2026-04-10 23:00:00'
    → Pas de CONVERT_TZ, fonctionne toujours !
    """
    now_local = timezone.localtime(timezone.now())
    today_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + datetime.timedelta(days=1)
    return today_start, today_end


class WaitingQueueEntry(models.Model):
    """
    File d'attente — un patient attend son tour pour consulter un médecin.
    """

    STATUS_CHOICES = (
        ('waiting', 'En attente'),
        ('in_progress', 'En consultation'),
        ('completed', 'Terminé'),
        ('cancelled', 'Annulé'),
        ('no_show', 'Absent'),
    )

    PRIORITY_CHOICES = (
        ('normal', 'Normal'),
        ('urgent', 'Urgent'),
        ('emergency', 'Urgence'),
        ('child', 'Enfant'),
        ('senior', 'Personne âgée'),
        ('pregnant', 'Femme enceinte'),
    )

    REASON_CHOICES = (
        ('consultation', 'Consultation générale'),
        ('follow_up', 'Suivi / Contrôle'),
        ('emergency', 'Urgence'),
        ('vaccination', 'Vaccination'),
        ('analysis', "Résultat d'analyses"),
        ('certificate', 'Certificat médical'),
        ('prescription_renewal', "Renouvellement d'ordonnance"),
        ('other', 'Autre'),
    )

    AVG_CONSULTATION_MINUTES = 15

    # ── Relations ──
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name='waiting_queue_entries',
        verbose_name=_('Patient')
    )
    doctor = models.ForeignKey(
        Doctor, on_delete=models.CASCADE, related_name='waiting_queue_entries',
        verbose_name=_('Médecin')
    )
    cabinet = models.ForeignKey(
        Cabinet, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='waiting_queue_entries',
        verbose_name=_('Cabinet')
    )
    appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='waiting_queue_entry',
        verbose_name=_('Rendez-vous lié')
    )

    # ── Infos file d'attente ──
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='waiting',
        verbose_name=_('Statut')
    )
    priority = models.CharField(
        max_length=20, choices=PRIORITY_CHOICES, default='normal',
        verbose_name=_('Priorité')
    )
    reason = models.CharField(
        max_length=30, choices=REASON_CHOICES, default='consultation',
        verbose_name=_('Motif')
    )
    reason_details = models.CharField(
        max_length=200, blank=True, null=True,
        verbose_name=_('Détails du motif')
    )

    # ── Position & Timing ──
    position = models.PositiveIntegerField(
        default=0, verbose_name=_('Position dans la file')
    )
    estimated_wait_minutes = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Temps d'attente estimé (min)")
    )
    joined_at = models.DateTimeField(
        auto_now_add=True, verbose_name=_("Heure d'arrivée")
    )
    called_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_("Heure d'appel")
    )
    started_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_('Début de consultation')
    )
    ended_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_('Fin de consultation')
    )
    actual_wait_minutes = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_("Temps d'attente réel (min)")
    )
    consultation_duration_minutes = models.PositiveIntegerField(
        null=True, blank=True, verbose_name=_('Durée de consultation (min)')
    )

    # ── Notes ──
    notes = models.TextField(blank=True, null=True, verbose_name=_('Notes'))
    doctor_notes = models.TextField(
        blank=True, null=True, verbose_name=_('Notes du médecin')
    )

    # ── Suivi ──
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='waiting_entries_created',
        verbose_name=_('Créé par')
    )
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Entrée file d'attente")
        verbose_name_plural = _("File d'attente")
        ordering = ['position', 'joined_at']
        indexes = [
            models.Index(fields=['doctor', 'status', 'joined_at']),
            models.Index(fields=['patient', 'status']),
            models.Index(fields=['cabinet', 'status']),
            models.Index(fields=['status', 'priority']),
        ]

    def __str__(self):
        return f"#{self.position} — {self.patient} → {self.doctor} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        if not self.doctor_id:
            super().save(*args, **kwargs)
            return

        if not self.position and self.status == 'waiting':
            self._calculate_position_and_wait()

        super().save(*args, **kwargs)

    def _calculate_position_and_wait(self):
        """Calcule la position et le temps d'attente estimé."""
        # ✅ CORRIGÉ : utilise _today_range() au lieu de joined_at__date=today
        today_start, today_end = _today_range()
        last_pos = WaitingQueueEntry.objects.filter(
            doctor=self.doctor,
            status='waiting',
            is_deleted=False,
            joined_at__gte=today_start,
            joined_at__lt=today_end,
        ).count()
        self.position = last_pos + 1
        self.estimated_wait_minutes = last_pos * self.AVG_CONSULTATION_MINUTES

    def get_patient_full_name(self):
        if not self.patient:
            return '—'
        if self.patient.user_id:
            return self.patient.user.get_full_name()
        return str(self.patient)

    def get_doctor_full_name(self):
        if not self.doctor:
            return '—'
        if self.doctor.user_id:
            return self.doctor.user.get_full_name()
        return str(self.doctor)

    def get_waiting_ahead_count(self):
        if not self.joined_at:
            return 0
        return WaitingQueueEntry.objects.filter(
            doctor=self.doctor,
            status='waiting',
            is_deleted=False,
            joined_at__lt=self.joined_at,
        ).count()
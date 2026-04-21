from django.db import models
from django.conf import settings


class Conversation(models.Model):
    """
    A conversation links an authenticated user (any role) to a cabinet.
    The conversation allows the user to exchange messages with the cabinet's
    secretaries and doctors.
    """
    cabinet = models.ForeignKey(
        'cabinets.Cabinet',
        on_delete=models.CASCADE,
        related_name='conversations',
        verbose_name='Cabinet',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations',
        verbose_name='User (patient)',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_closed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('cabinet', 'user')
        ordering = ['-updated_at']
        verbose_name = 'Conversation'
        verbose_name_plural = 'Conversations'

    def __str__(self):
        return f"Conversation: {self.user.get_full_name()} ↔ {self.cabinet.name}"

    @property
    def last_message(self):
        """Return the most recent message in this conversation."""
        return self.messages.last()


class Message(models.Model):
    """
    A message within a conversation.
    Any participant of the conversation (user or cabinet staff) can send messages.
    """
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='Conversation',
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages',
        verbose_name='Sender',
    )
    content = models.TextField(verbose_name='Content')
    is_read = models.BooleanField(default=False, verbose_name='Read')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Sent at')

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'

    def __str__(self):
        return f"Message by {self.sender.get_full_name()} in {self.conversation}"
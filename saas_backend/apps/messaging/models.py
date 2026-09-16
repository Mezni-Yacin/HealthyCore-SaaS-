from django.db import models
from django.conf import settings

class Conversation(models.Model):
    cabinet = models.ForeignKey('cabinets.Cabinet', on_delete=models.CASCADE, related_name='conversations')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_closed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('cabinet', 'user')
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conversation: {self.user.get_full_name()} ↔ {self.cabinet.name}"

    @property
    def last_message(self):
        return self.messages.last()


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message by {self.sender.get_full_name()} in {self.conversation}"


class DirectConversation(models.Model):
    """Conversation privée entre deux utilisateurs."""
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='direct_conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conversation directe {self.id}"

    @property
    def last_message(self):
        return self.direct_messages.last()


class DirectMessage(models.Model):
    """Message d'une conversation privée."""
    conversation = models.ForeignKey(DirectConversation, on_delete=models.CASCADE, related_name='direct_messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_direct_messages')
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message direct de {self.sender.username}"
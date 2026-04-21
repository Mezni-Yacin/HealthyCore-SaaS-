from rest_framework import serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    """Serializer pour lire un message."""
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'sender_name', 'sender_role',
            'content', 'is_read', 'is_mine', 'created_at'
        ]
        read_only_fields = [
            'id', 'conversation', 'sender', 'sender_name',
            'sender_role', 'is_mine', 'is_read', 'created_at'
        ]

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.username

    def get_sender_role(self, obj):
        request = self.context.get('request')
        if request:
            if obj.sender == request.user:
                return 'me'
            if obj.conversation.cabinet.secretaries.filter(id=obj.sender.id).exists():
                return 'secretary'
        return 'other'

    def get_is_mine(self, obj):
        request = self.context.get('request')
        if request:
            return obj.sender == request.user
        return False


class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer un message — seul le content est requis."""
    content = serializers.CharField(required=True, allow_blank=False)

    class Meta:
        model = Message
        fields = ['content']

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le message ne peut pas être vide.")
        return value.strip()


class ConversationListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des conversations."""
    last_message_preview = serializers.SerializerMethodField()
    last_message_time = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    is_secretary_view = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    cabinet_name = serializers.CharField(source='cabinet.name', read_only=True)
    cabinet_address = serializers.CharField(source='cabinet.address', read_only=True)
    cabinet_logo = serializers.ImageField(source='cabinet.logo', read_only=True)
    secretary_name = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'cabinet', 'cabinet_name', 'cabinet_address', 'cabinet_logo',
            'user', 'created_at', 'updated_at',
            'last_message_preview', 'last_message_time', 'unread_count',
            'is_secretary_view', 'patient_name', 'secretary_name',
        ]

    def get_is_secretary_view(self, obj):
        """True si l'utilisateur actuel est secrétaire du cabinet."""
        request = self.context.get('request')
        if request:
            return obj.cabinet.secretaries.filter(id=request.user.id).exists()
        return False

    def get_patient_name(self, obj):
        """Nom du patient de la conversation."""
        return obj.user.get_full_name() or obj.user.username

    def get_last_message_preview(self, obj):
        last = obj.last_message
        if last:
            sender_name = last.sender.get_full_name() or last.sender.username
            return f"{sender_name}: {last.content[:80]}"
        return "Aucun message"

    def get_last_message_time(self, obj):
        last = obj.last_message
        if last:
            return last.created_at
        return obj.updated_at

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0

    def get_secretary_name(self, obj):
        first_secretary = obj.cabinet.secretaries.first()
        if first_secretary:
            return first_secretary.get_full_name() or first_secretary.username
        return "Secrétariat"


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Serializer pour le détail d'une conversation avec ses messages."""
    messages = serializers.SerializerMethodField()
    is_secretary_view = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    cabinet_name = serializers.CharField(source='cabinet.name', read_only=True)
    cabinet_address = serializers.CharField(source='cabinet.address', read_only=True)
    cabinet_phone = serializers.CharField(source='cabinet.phone_number', read_only=True)
    cabinet_logo = serializers.ImageField(source='cabinet.logo', read_only=True)
    secretary_names = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'cabinet', 'cabinet_name', 'cabinet_address', 'cabinet_phone',
            'cabinet_logo', 'user', 'created_at', 'updated_at',
            'messages', 'is_secretary_view', 'patient_name',
            'secretary_names', 'unread_count',
        ]

    def get_is_secretary_view(self, obj):
        request = self.context.get('request')
        if request:
            return obj.cabinet.secretaries.filter(id=request.user.id).exists()
        return False

    def get_patient_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_messages(self, obj):
        request = self.context.get('request')
        if request:
            obj.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        messages = obj.messages.all()
        serializer = MessageSerializer(messages, many=True, context=self.context)
        return serializer.data

    def get_secretary_names(self, obj):
        secretaries = obj.cabinet.secretaries.all()
        return [s.get_full_name() or s.username for s in secretaries]

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0
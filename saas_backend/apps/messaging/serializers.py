from rest_framework import serializers
from .models import Conversation, Message, DirectConversation, DirectMessage
from apps.users.models import User

# ==========================================
# CONVERSATIONS CABINET (Existant)
# ==========================================

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_name', 'sender_role', 'content', 'is_read', 'is_mine', 'created_at']
        read_only_fields = ['id', 'conversation', 'sender', 'sender_name', 'sender_role', 'is_mine', 'is_read', 'created_at']

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.username

    def get_sender_role(self, obj):
        request = self.context.get('request')
        if request:
            if obj.sender == request.user: return 'me'
            if obj.conversation.cabinet.secretaries.filter(id=obj.sender.id).exists(): return 'secretary'
        return 'other'

    def get_is_mine(self, obj):
        request = self.context.get('request')
        return request and obj.sender == request.user

class MessageCreateSerializer(serializers.ModelSerializer):
    content = serializers.CharField(required=True, allow_blank=False)

    class Meta:
        model = Message
        fields = ['content']

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le message ne peut pas être vide.")
        return value.strip()

class ConversationListSerializer(serializers.ModelSerializer):
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
        fields = ['id', 'cabinet', 'cabinet_name', 'cabinet_address', 'cabinet_logo', 'user', 'created_at', 'updated_at', 'last_message_preview', 'last_message_time', 'unread_count', 'is_secretary_view', 'patient_name', 'secretary_name']

    def get_is_secretary_view(self, obj):
        request = self.context.get('request')
        return request and obj.cabinet.secretaries.filter(id=request.user.id).exists()

    def get_patient_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_last_message_preview(self, obj):
        last = obj.last_message
        if last:
            return f"{last.sender.get_full_name()}: {last.content[:80]}"
        return "Aucun message"

    def get_last_message_time(self, obj):
        last = obj.last_message
        return last.created_at if last else obj.updated_at

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0

    def get_secretary_name(self, obj):
        first_secretary = obj.cabinet.secretaries.first()
        return first_secretary.get_full_name() or first_secretary.username if first_secretary else "Secrétariat"

class ConversationDetailSerializer(serializers.ModelSerializer):
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
        fields = ['id', 'cabinet', 'cabinet_name', 'cabinet_address', 'cabinet_phone', 'cabinet_logo', 'user', 'created_at', 'updated_at', 'messages', 'is_secretary_view', 'patient_name', 'secretary_names', 'unread_count']

    def get_is_secretary_view(self, obj):
        request = self.context.get('request')
        return request and obj.cabinet.secretaries.filter(id=request.user.id).exists()

    def get_patient_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_messages(self, obj):
        request = self.context.get('request')
        if request:
            obj.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        return MessageSerializer(obj.messages.all(), many=True, context=self.context).data

    def get_secretary_names(self, obj):
        return [s.get_full_name() or s.username for s in obj.cabinet.secretaries.all()]

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0


# ==========================================
# MESSAGERIE DIRECTE PRIVÉE (Nouveau)
# ==========================================

class UserSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'role', 'profile_picture']
        
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['full_name'] = instance.get_full_name() or instance.username
        if instance.profile_picture:
            request = self.context.get('request')
            data['profile_picture'] = request.build_absolute_uri(instance.profile_picture.url) if request else instance.profile_picture.url
        return data

class DirectMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = DirectMessage
        fields = ['id', 'sender', 'sender_name', 'content', 'is_read', 'is_mine', 'created_at']

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.username

    def get_is_mine(self, obj):
        request = self.context.get('request')
        return request and obj.sender == request.user

class DirectMessageCreateSerializer(serializers.ModelSerializer):
    content = serializers.CharField(required=True, allow_blank=False)

    class Meta:
        model = DirectMessage
        fields = ['content']

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le message ne peut pas être vide.")
        return value.strip()

class DirectConversationListSerializer(serializers.ModelSerializer):
    last_message_preview = serializers.SerializerMethodField()
    last_message_time = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    other_user = serializers.SerializerMethodField()

    class Meta:
        model = DirectConversation
        fields = ['id', 'other_user', 'last_message_preview', 'last_message_time', 'unread_count', 'created_at', 'updated_at']

    def get_other_user(self, obj):
        request = self.context.get('request')
        if request:
            other = obj.participants.exclude(id=request.user.id).first()
            if other:
                return {
                    'id': other.id,
                    'full_name': other.get_full_name() or other.username,
                    'role': other.get_role_display(),
                    'profile_picture': request.build_absolute_uri(other.profile_picture.url) if other.profile_picture else None
                }
        return None

    def get_last_message_preview(self, obj):
        last = obj.last_message
        if last:
            return f"{last.sender.get_full_name()}: {last.content[:80]}"
        return "Nouvelle conversation"

    def get_last_message_time(self, obj):
        last = obj.last_message
        return last.created_at if last else obj.updated_at

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request:
            return obj.direct_messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0

class DirectConversationDetailSerializer(serializers.ModelSerializer):
    messages = serializers.SerializerMethodField()
    other_user = serializers.SerializerMethodField()

    class Meta:
        model = DirectConversation
        fields = ['id', 'other_user', 'messages', 'created_at', 'updated_at']

    def get_other_user(self, obj):
        request = self.context.get('request')
        if request:
            other = obj.participants.exclude(id=request.user.id).first()
            if other:
                return {
                    'id': other.id,
                    'full_name': other.get_full_name() or other.username,
                    'role': other.get_role_display(),
                    'profile_picture': request.build_absolute_uri(other.profile_picture.url) if other.profile_picture else None
                }
        return None

    def get_messages(self, obj):
        request = self.context.get('request')
        if request:
            obj.direct_messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        return DirectMessageSerializer(obj.direct_messages.all(), many=True, context=self.context).data
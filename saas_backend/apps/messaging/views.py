from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from rest_framework import generics
from django.db.models import Q # ✅ IMPORT MANQUANT AJOUTÉ ICI

from .models import Conversation, Message, DirectConversation, DirectMessage
from .serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    MessageSerializer,
    MessageCreateSerializer,
    UserSearchSerializer,
    DirectConversationListSerializer,
    DirectConversationDetailSerializer,
    DirectMessageSerializer,
    DirectMessageCreateSerializer
)
from apps.users.models import User

# ==========================================
# CONVERSATIONS CABINET (Existant)
# ==========================================

class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Conversation.objects.all()

    def get_serializer_class(self):
        if self.action == 'list': return ConversationListSerializer
        if self.action in ('retrieve', 'create'): return ConversationDetailSerializer
        return ConversationListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Conversation.objects.filter(user=user) | Conversation.objects.filter(cabinet__secretaries=user)
        qs = qs.distinct()
        cabinet_id = self.request.query_params.get('cabinet')
        if cabinet_id: qs = qs.filter(cabinet_id=cabinet_id)
        return qs.order_by('-updated_at')

    def create(self, request, *args, **kwargs):
        cabinet_id = request.data.get('cabinet')
        if not cabinet_id:
            return Response({'error': 'Le paramètre cabinet est requis.'}, status=status.HTTP_400_BAD_REQUEST)
        conversation, created = Conversation.objects.get_or_create(cabinet_id=cabinet_id, user=request.user)
        serializer = ConversationDetailSerializer(conversation, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user and not instance.cabinet.secretaries.filter(id=request.user.id).exists():
            raise PermissionDenied("Vous n'êtes pas participant de cette conversation.")
        return Response(self.get_serializer(instance).data)

class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return MessageCreateSerializer if self.action == 'create' else MessageSerializer

    def get_queryset(self):
        conversation_id = self.kwargs.get('conversation_pk')
        return Message.objects.filter(conversation_id=conversation_id) if conversation_id else Message.objects.none()

    def perform_create(self, serializer):
        conversation_id = self.kwargs.get('conversation_pk')
        conversation = get_object_or_404(Conversation, id=conversation_id)
        if conversation.user != self.request.user and not conversation.cabinet.secretaries.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Vous n'êtes pas participant de cette conversation.")
        serializer.save(conversation=conversation, sender=self.request.user)

    def list(self, request, *args, **kwargs):
        messages = self.get_queryset()
        messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        return Response(self.get_serializer(messages, many=True).data)


# ==========================================
# MESSAGERIE DIRECTE PRIVÉE (Nouveau)
# ==========================================

class UserSearchView(generics.ListAPIView):
    serializer_class = UserSearchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        search = self.request.query_params.get('search', '')
        if len(search) < 2: return User.objects.none()
        return User.objects.filter(
            Q(first_name__icontains=search) | 
            Q(last_name__icontains=search) | 
            Q(username__icontains=search)
        ).exclude(id=self.request.user.id)[:20]

class DirectConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return DirectConversationDetailSerializer if self.action == 'retrieve' else DirectConversationListSerializer
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.participants.filter(id=request.user.id).exists():
            raise PermissionDenied("Action non autorisée.")
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        return DirectConversation.objects.filter(participants=self.request.user).prefetch_related('direct_messages', 'participants')

    def create(self, request, *args, **kwargs):
        target_user_id = request.data.get('user_id')
        if not target_user_id:
            return Response({'error': 'user_id est requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        target_user = get_object_or_404(User, id=target_user_id)
        conv = DirectConversation.objects.filter(participants=request.user).filter(participants=target_user).first()
        
        if not conv:
            conv = DirectConversation.objects.create()
            conv.participants.add(request.user, target_user)
            
        serializer = DirectConversationDetailSerializer(conv, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

class DirectMessageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return DirectMessageCreateSerializer if self.action == 'create' else DirectMessageSerializer

    def get_queryset(self):
        # ✅ FIX : filtrer par conversation_pk au lieu de retourner none()
        conversation_id = self.kwargs.get('conversation_pk')
        if conversation_id:
            return DirectMessage.objects.filter(conversation_id=conversation_id)
        return DirectMessage.objects.none()

    def perform_create(self, serializer):
        conversation_id = self.kwargs.get('conversation_pk')
        conversation = get_object_or_404(DirectConversation, id=conversation_id)
        if not conversation.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("Vous n'êtes pas participant de cette conversation.")
        serializer.save(conversation=conversation, sender=self.request.user)

    # ✅ Ajouter la méthode list pour marquer comme lu (comme MessageViewSet)
    def list(self, request, *args, **kwargs):
        messages = self.get_queryset()
        messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)
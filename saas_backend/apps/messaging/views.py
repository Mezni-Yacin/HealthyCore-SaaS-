from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404

from .models import Conversation, Message
from .serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    MessageSerializer,
    MessageCreateSerializer,
)


class ConversationViewSet(viewsets.ModelViewSet):
    """
    GET    /api/messaging/conversations/              → Liste des conversations
    GET    /api/messaging/conversations/?cabinet=<id>  → Filtrer par cabinet
    POST   /api/messaging/conversations/               → Créer ou récupérer une conversation
    GET    /api/messaging/conversations/<id>/           → Détail avec messages

    Accessible par : le patient (champ user) OU les secrétaires du cabinet.
    """
    permission_classes = [IsAuthenticated]
    queryset = Conversation.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return ConversationListSerializer
        if self.action in ('retrieve', 'create'):
            return ConversationDetailSerializer
        return ConversationListSerializer

    def get_queryset(self):
        """
        ✅ CORRIGÉ : Retourne les conversations où l'utilisateur est :
        - Le patient (champ user)
        - OU un secrétaire du cabinet (cabinet.secretaries)
        """
        user = self.request.user

        # Conversations où l'utilisateur est le patient
        qs_as_patient = Conversation.objects.filter(user=user)

        # Conversations où l'utilisateur est secrétaire du cabinet
        qs_as_secretary = Conversation.objects.filter(
            cabinet__secretaries=user
        )

        # Union des deux + distinct
        qs = qs_as_patient | qs_as_secretary
        qs = qs.distinct()

        # Filtrer par cabinet si le paramètre est fourni
        cabinet_id = self.request.query_params.get('cabinet')
        if cabinet_id:
            qs = qs.filter(cabinet_id=cabinet_id)

        return qs.order_by('-updated_at')

    def create(self, request, *args, **kwargs):
        cabinet_id = request.data.get('cabinet')
        if not cabinet_id:
            return Response(
                {'error': 'Le paramètre cabinet est requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        conversation, created = Conversation.objects.get_or_create(
            cabinet_id=cabinet_id,
            user=request.user
        )
        serializer = ConversationDetailSerializer(
            conversation,
            context={'request': request}
        )
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=status_code)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        if instance.user != user and not instance.cabinet.secretaries.filter(id=user.id).exists():
            raise PermissionDenied("Vous n'êtes pas participant de cette conversation.")
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class MessageViewSet(viewsets.ModelViewSet):
    """
    GET    /api/messaging/conversations/<conversation_id>/messages/  → Liste des messages
    POST   /api/messaging/conversations/<conversation_id>/messages/  → Envoyer un message

    Accessible par : le patient OU les secrétaires du cabinet.
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return MessageCreateSerializer
        return MessageSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        conversation_id = self.kwargs.get('conversation_pk')
        if conversation_id:
            return Message.objects.filter(conversation_id=conversation_id)
        return Message.objects.none()

    def perform_create(self, serializer):
        conversation_id = self.kwargs.get('conversation_pk')
        conversation = get_object_or_404(Conversation, id=conversation_id)
        user = self.request.user
        if conversation.user != user and not conversation.cabinet.secretaries.filter(id=user.id).exists():
            raise PermissionDenied("Vous n'êtes pas participant de cette conversation.")
        serializer.save(
            conversation=conversation,
            sender=user
        )

    def list(self, request, *args, **kwargs):
        messages = self.get_queryset()
        messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)
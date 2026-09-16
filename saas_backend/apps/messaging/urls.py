from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (
    ConversationViewSet, MessageViewSet, 
    UserSearchView, DirectConversationViewSet, DirectMessageViewSet
)

router = SimpleRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'conversations/(?P<conversation_pk>\d+)/messages', MessageViewSet, basename='conversation-messages')

router.register(r'direct-conversations', DirectConversationViewSet, basename='direct-conversation')
router.register(r'direct-conversations/(?P<conversation_pk>\d+)/messages', DirectMessageViewSet, basename='direct-conversation-messages')

urlpatterns = [
    path('', include(router.urls)),
    path('users/search/', UserSearchView.as_view(), name='user-search'),
]
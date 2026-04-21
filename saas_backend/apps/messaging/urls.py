from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import ConversationViewSet, MessageViewSet

router = SimpleRouter()

# Conversations
router.register(r'conversations', ConversationViewSet, basename='conversation')

# Messages (nested sous conversations)
router.register(
    r'conversations/(?P<conversation_pk>\d+)/messages',
    MessageViewSet,
    basename='conversation-messages'
)

urlpatterns = [
    path('', include(router.urls)),
]
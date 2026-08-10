from django.urls import path
from .views import ExplainPatientResultsView, ChatbotView

urlpatterns = [
    path('explain-results/', ExplainPatientResultsView.as_view(), name='explain-results'),
    path('chat/', ChatbotView.as_view(), name='chatbot'), # <-- Route ajoutée
]
# apps/ai/urls.py
from django.urls import path
from .views import chat_with_assistant, create_chat_session, explain_lab_results, generate_lab_conclusion, pharmacy_ai_advisor

urlpatterns = [
    path('chat/', chat_with_assistant, name='api_chat'),
    path('create-session/', create_chat_session, name='api_create_session'),
    path('explain-results/', explain_lab_results, name='api_explain_results'),  
    path('generate-lab-conclusion/', generate_lab_conclusion, name='api_generate_lab_conclusion'),
    path('pharmacy-advisor/', pharmacy_ai_advisor, name='api_pharmacy_advisor'),
]
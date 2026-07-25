from django.urls import path
from .views import ExplainPatientResultsView

urlpatterns = [
    path('explain-results/', ExplainPatientResultsView.as_view(), name='explain-results'),
]
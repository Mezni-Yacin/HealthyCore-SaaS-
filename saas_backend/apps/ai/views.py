from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound, PermissionDenied

from apps.laboratories.models import LabTestRequest, LabResult
from apps.users.models import Patient
from .services import explain_lab_results

class ExplainPatientResultsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request_id = request.data.get('request_id')
        if not request_id:
            return Response({'error': 'request_id est requis.'}, status=400)

        # 1. Récupérer le profil patient
        try:
            patient = Patient.objects.get(user=request.user)
        except Patient.DoesNotExist:
            raise PermissionDenied("Profil patient introuvable.")

        # 2. Récupérer la demande de labo ET vérifier qu'elle appartient à CE patient
        try:
            lab_request = LabTestRequest.objects.select_related('result').get(
                id=request_id, 
                patient=patient, 
                is_deleted=False
            )
        except LabTestRequest.DoesNotExist:
            raise NotFound("Demande introuvable ou non autorisée.")

        # 3. Vérifier qu'il y a bien un résultat
        try:
            result = lab_request.result
            if result.is_deleted:
                raise NotFound("Résultat supprimé.")
        except LabResult.DoesNotExist:
            raise NotFound("Les résultats ne sont pas encore disponibles.")

        # 4. Préparer les données
        from apps.laboratories.serializers import LabResultDetailSerializer
        result_data = LabResultDetailSerializer(result).data

        # 5. Appeler le service IA
        try:
            # === LIGNE DE DEBUG POUR VOIR LA CLE DANS LE TERMINAL ===
            from django.conf import settings
            print(f"🔍 DEBUG CLE MISTRAL : '{settings.MISTRAL_API_KEY}'")
            # ========================================================
            
            explanation = explain_lab_results(result_data)
            return Response({
                'success': True,
                'explanation': explanation,
                'is_abnormal': result.is_abnormal,
                'critical_finding': result.critical_finding
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=500)
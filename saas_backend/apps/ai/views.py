from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound, PermissionDenied

from apps.laboratories.models import LabTestRequest, LabResult
from apps.users.models import Patient
from .services import explain_lab_results, get_chat_response
from .models import ChatMessage

# ══════════════════════════════════════════════════════
# VUE 1 : EXPLICATION DES RÉSULTATS (Déjà existant)
# ══════════════════════════════════════════════════════
class ExplainPatientResultsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request_id = request.data.get('request_id')
        if not request_id:
            return Response({'error': 'request_id est requis.'}, status=400)

        try:
            patient = Patient.objects.get(user=request.user)
        except Patient.DoesNotExist:
            raise PermissionDenied("Profil patient introuvable.")

        try:
            lab_request = LabTestRequest.objects.select_related('result').get(
                id=request_id, 
                patient=patient, 
                is_deleted=False
            )
        except LabTestRequest.DoesNotExist:
            raise NotFound("Demande introuvable ou non autorisée.")

        try:
            result = lab_request.result
            if result.is_deleted:
                raise NotFound("Résultat supprimé.")
        except LabResult.DoesNotExist:
            raise NotFound("Les résultats ne sont pas encore disponibles.")

        from apps.laboratories.serializers import LabResultDetailSerializer
        result_data = LabResultDetailSerializer(result).data

        try:
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


# ══════════════════════════════════════════════════════
# VUE 2 : CHATBOT GÉNÉRAL (Nouveau)
# ══════════════════════════════════════════════════════
class ChatbotView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Récupérer l'historique du chat"""
        messages = ChatMessage.objects.filter(user=request.user).order_by('created_at')[:50]
        data = [{
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "time": m.created_at.strftime("%H:%M")
        } for m in messages]
        return Response(data)

    def post(self, request):
        """Envoyer un message et recevoir la réponse"""
        user_message = request.data.get('message', '').strip()
        if not user_message:
            return Response({'error': 'Le message est vide.'}, status=400)

        # 1. Sauvegarder le message du user
        ChatMessage.objects.create(user=request.user, role='user', content=user_message)

        try:
            # 2. Appeler l'IA
            ai_response = get_chat_response(request.user, user_message)

            # 3. Sauvegarder la réponse de l'IA
            ai_msg = ChatMessage.objects.create(user=request.user, role='assistant', content=ai_response)

            return Response({
                "id": ai_msg.id,
                "role": "assistant",
                "content": ai_response,
                "time": ai_msg.created_at.strftime("%H:%M")
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)
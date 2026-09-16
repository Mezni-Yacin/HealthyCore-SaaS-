from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from apps.users.models import Patient
from .models import ChatSession, ChatMessage
from groq import Groq   # ← IMPORTANT : cet import manquait


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_with_assistant(request):
    user = request.user

    # ← On a enlevé la restriction de rôle
    # Maintenant tous les utilisateurs connectés peuvent utiliser le chatbot

    session_id = request.data.get('session_id')
    user_message = request.data.get('message')

    if not session_id or not user_message:
        return Response({"error": "Session ID et message requis."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        session = ChatSession.objects.get(id=session_id, user=user)
    except ChatSession.DoesNotExist:
        return Response({"error": "Session introuvable."}, status=status.HTTP_404_NOT_FOUND)

    # 1. Sauvegarder le message utilisateur
    ChatMessage.objects.create(session=session, role='user', content=user_message)

    # 2. Prompt système
    system_prompt = (
        "Tu es un assistant médical expert intégré dans un logiciel SaaS pour médecins. "
        "Ton rôle est d'aider le médecin à analyser les dossiers, suggérer des pistes et rédiger. "
        "Ne fais jamais de diagnostic direct. Sois précis, professionnel et prudent."
    )

    if session.patient:
        patient = session.patient
        medical_context = (
            f"\n\nContexte du patient :\n"
            f"- Âge : {getattr(patient, 'age', 'N/A')} ans\n"
            f"- Genre : {patient.get_gender_display() if hasattr(patient, 'get_gender_display') else 'N/A'}\n"
            f"- Allergies : {getattr(patient, 'allergies', None) or 'Aucune'}\n"
            f"- Maladies chroniques : {getattr(patient, 'chronic_diseases', None) or 'Aucune'}\n"
        )
        system_prompt += medical_context

    # 3. Historique
    history = list(
        ChatMessage.objects.filter(session=session)
        .order_by('created_at')[:20]
    )

    messages_for_ai = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages_for_ai.append({"role": msg.role, "content": msg.content})

    # 4. Appel à Groq
    try:
        if not settings.GROQ_API_KEY:
            return Response(
                {"error": "Clé API Groq manquante dans les settings"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        client = Groq(api_key=settings.GROQ_API_KEY)

        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=messages_for_ai,
            temperature=0.2,
            max_tokens=1500,
        )

        bot_reply = response.choices[0].message.content

        ChatMessage.objects.create(session=session, role='assistant', content=bot_reply)

        return Response({"reply": bot_reply}, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": f"Erreur Groq: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_chat_session(request):
    patient_id = request.data.get('patient_id')
    user = request.user

    session = ChatSession.objects.create(user=user)

    if patient_id:
        try:
            patient = Patient.objects.get(id=patient_id)
            session.patient = patient
            session.title = f"Discussion sur {patient.user.get_full_name() if patient.user else 'Patient'}"
            session.save()
        except Patient.DoesNotExist:
            pass

    return Response(
        {"session_id": session.id, "title": session.title},
        status=status.HTTP_201_CREATED
    )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def explain_lab_results(request):
    """
    Analyse les résultats de laboratoire et donne une explication claire + conseils.
    """
    user = request.user
    request_id = request.data.get('request_id')

    if not request_id:
        return Response({"error": "request_id requis."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from apps.laboratories.models import LabTestRequest, LabResult

        lab_request = LabTestRequest.objects.select_related(
            'patient__user', 'laboratory', 'doctor__user'
        ).get(id=request_id, is_deleted=False)

        # ========== SÉCURITÉ SIMPLIFIÉE ==========
        # Autorisé si :
        # - C'est le patient propriétaire de la demande
        # - Ou un médecin / admin / lab_staff
        is_owner = lab_request.patient.user_id == user.id
        is_staff = user.role in ['doctor', 'super_admin', 'admin', 'lab_staff']

        if not (is_owner or is_staff):
            return Response(
                {"error": "Accès non autorisé."},
                status=status.HTTP_403_FORBIDDEN
            )
        # ========================================

    except LabTestRequest.DoesNotExist:
        return Response({"error": "Demande d'analyse introuvable."}, status=status.HTTP_404_NOT_FOUND)

    # Récupérer le résultat
    try:
        result = lab_request.result
        if result.is_deleted:
            return Response({"error": "Résultat supprimé."}, status=status.HTTP_404_NOT_FOUND)
    except LabResult.DoesNotExist:
        return Response({"error": "Résultats non encore disponibles."}, status=status.HTTP_404_NOT_FOUND)

    # Construire le texte des résultats
    results_text = ""
    for code, data in (result.results or {}).items():
        value = data.get('value', '-')
        unit = data.get('unit', '')
        normal = data.get('normal_range', '-')
        is_abnormal = data.get('is_abnormal', False)
        status_label = "⚠️ ANORMAL" if is_abnormal else "✅ Normal"
        results_text += f"- **{code}** : {value} {unit} (Normes : {normal}) → {status_label}\n"

    if not results_text:
        results_text = "Aucun résultat détaillé disponible."

    system_prompt = (
        "Tu es un assistant médical bienveillant, clair et pédagogique. "
        "Tu expliques les résultats d'analyses de laboratoire de façon simple et rassurante "
        "pour un patient non-médecin. "
        "Ne fais JAMAIS de diagnostic définitif. "
        "Donne des explications + des conseils généraux de santé. "
        "Réponds toujours en français, de manière structurée, empathique et professionnelle."
    )

    user_prompt = f"""
Voici les résultats d'analyses du patient :

{results_text}

Conclusion du laboratoire : {result.conclusion or 'Aucune'}
Recommandations du laboratoire : {result.recommendations or 'Aucune'}
Résultat global anormal : {"Oui" if result.is_abnormal else "Non"}
Résultat critique : {"Oui" if result.critical_finding else "Non"}

Explique ces résultats de façon simple et donne des conseils généraux.

Structure ta réponse exactement comme ceci :

### 1. Résumé global
(une courte phrase qui résume la situation)

### 2. Explication des résultats importants
(explique clairement les valeurs anormales ou importantes)

### 3. Conseils de santé généraux
(conseils pratiques : alimentation, hydratation, repos, etc.)

### 4. Quand consulter un médecin
(précise clairement dans quels cas il faut voir un médecin rapidement)
"""

    try:
        if not settings.GROQ_API_KEY:
            return Response(
                {"error": "Clé API Groq manquante"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        client = Groq(api_key=settings.GROQ_API_KEY)

        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=1800,
        )

        explanation = response.choices[0].message.content
        return Response({"explanation": explanation}, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": f"Erreur IA: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_lab_conclusion(request):
    """
    Agent IA pour lab_staff :
    Génère automatiquement conclusion + recommandations + flags (abnormal / critical)
    à partir des résultats saisis.
    """
    user = request.user

    if user.role not in ['lab_staff', 'super_admin', 'admin']:
        return Response({"error": "Accès réservé au personnel de laboratoire."}, status=status.HTTP_403_FORBIDDEN)

    results = request.data.get('results')          # dict des résultats
    clinical_history = request.data.get('clinical_history', '')
    diagnosis_suspected = request.data.get('diagnosis_suspected', '')

    if not results or not isinstance(results, dict):
        return Response({"error": "Les résultats sont requis."}, status=status.HTTP_400_BAD_REQUEST)

    # Construire le texte des résultats
    results_text = ""
    for code, data in results.items():
        value = data.get('value', '-')
        unit = data.get('unit', '')
        normal = data.get('normal_range', '-')
        results_text += f"- {code}: {value} {unit} (Normes: {normal})\n"

    system_prompt = (
        "Tu es un biologiste médical expert. "
        "À partir des résultats d'analyses, tu dois générer :\n"
        "1. Une conclusion claire et professionnelle\n"
        "2. Des recommandations utiles pour le médecin\n"
        "3. Indiquer si le bilan est anormal (true/false)\n"
        "4. Indiquer s'il y a une valeur critique (true/false)\n\n"
        "Réponds UNIQUEMENT au format JSON strict suivant (sans markdown) :\n"
        '{\n'
        '  "conclusion": "...",\n'
        '  "recommendations": "...",\n'
        '  "is_abnormal": true/false,\n'
        '  "critical_finding": true/false\n'
        '}'
    )

    user_prompt = f"""
Résultats d'analyses :
{results_text}

Antécédents cliniques : {clinical_history or 'Non renseignés'}
Diagnostic suspecté : {diagnosis_suspected or 'Non renseigné'}

Génère la conclusion, les recommandations et les flags.
"""

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)

        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            max_tokens=1000,
            response_format={"type": "json_object"}   # force le JSON
        )

        import json
        ai_data = json.loads(response.choices[0].message.content)

        return Response({
            "conclusion": ai_data.get("conclusion", ""),
            "recommendations": ai_data.get("recommendations", ""),
            "is_abnormal": ai_data.get("is_abnormal", False),
            "critical_finding": ai_data.get("critical_finding", False),
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": f"Erreur IA: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pharmacy_ai_advisor(request):
    """
    Agent IA Pharmacie :
    - Analyse une liste de médicaments
    - Détecte d'éventuelles interactions
    - Génère des conseils clairs pour le patient
    """
    user = request.user

    if user.role not in ['pharmacist', 'super_admin', 'admin', 'doctor']:
        return Response(
            {"error": "Accès réservé aux pharmaciens et médecins."},
            status=status.HTTP_403_FORBIDDEN
        )

    medications = request.data.get('medications', [])  # liste de dicts
    patient_info = request.data.get('patient_info', {})  # optionnel (âge, allergies...)
    context = request.data.get('context', 'dispensation')  # dispensation ou prescription

    if not medications or not isinstance(medications, list):
        return Response(
            {"error": "La liste des médicaments est requise."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Construire le texte des médicaments
    meds_text = ""
    for med in medications:
        name = med.get('name', 'Inconnu')
        dosage = med.get('dosage', '')
        form = med.get('form', '')
        instruction = med.get('dosage_instruction', '')
        quantity = med.get('quantity', '')
        meds_text += f"- {name} {dosage} ({form}) | Posologie: {instruction or 'Non précisée'} | Quantité: {quantity}\n"

    patient_text = ""
    if patient_info:
        age = patient_info.get('age', 'Non renseigné')
        allergies = patient_info.get('allergies', 'Aucune')
        chronic = patient_info.get('chronic_diseases', 'Aucune')
        patient_text = f"\nInformations patient :\n- Âge: {age}\n- Allergies: {allergies}\n- Maladies chroniques: {chronic}\n"

    system_prompt = (
        "Tu es un pharmacien expert et un assistant pharmaceutique bienveillant. "
        "Tu analyses une liste de médicaments et tu dois :\n"
        "1. Détecter d'éventuelles interactions médicamenteuses importantes\n"
        "2. Donner des conseils clairs de prise pour le patient\n"
        "3. Signaler les précautions importantes\n"
        "4. Rester prudent (ne jamais faire de diagnostic)\n\n"
        "Réponds UNIQUEMENT en JSON strict (sans markdown) avec cette structure exacte :\n"
        '{\n'
        '  "interactions": "texte ou null si aucune",\n'
        '  "patient_advice": "conseils clairs et structurés pour le patient",\n'
        '  "precautions": "précautions importantes",\n'
        '  "summary": "résumé court pour le pharmacien"\n'
        '}'
    )

    user_prompt = f"""
Contexte : {context}

Médicaments concernés :
{meds_text}
{patient_text}

Analyse ces médicaments et génère les conseils.
"""

    try:
        if not settings.GROQ_API_KEY:
            return Response(
                {"error": "Clé API Groq manquante"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        client = Groq(api_key=settings.GROQ_API_KEY)

        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            max_tokens=1200,
            response_format={"type": "json_object"}
        )

        import json
        ai_data = json.loads(response.choices[0].message.content)

        return Response({
            "interactions": ai_data.get("interactions"),
            "patient_advice": ai_data.get("patient_advice", ""),
            "precautions": ai_data.get("precautions", ""),
            "summary": ai_data.get("summary", ""),
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {"error": f"Erreur IA: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
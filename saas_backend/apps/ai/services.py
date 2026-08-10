from mistralai import Mistral
from django.conf import settings

# ══════════════════════════════════════════════════════
# FONCTION 1 : EXPLICATION DES RÉSULTATS (Déjà existant)
# ══════════════════════════════════════════════════════
def explain_lab_results(result_data_dict):
    """
    Prend les données brutes d'un résultat, les anonymise,
    les envoie à l'IA Mistral et retourne l'explication.
    """
    client = Mistral(api_key=settings.MISTRAL_API_KEY)

    safe_data = {
        "resultats": result_data_dict.get("results", {}),
        "conclusion_biologiste": result_data_dict.get("conclusion", ""),
        "recommandations": result_data_dict.get("recommendations", ""),
        "est_anormal": result_data_dict.get("is_abnormal", False),
        "urgent": result_data_dict.get("critical_finding", False)
    }

    system_prompt = """
    Tu es un assistant médical virtuel bienveillant, clair et pédagogue. 
    Ton rôle est d'expliquer les résultats de laboratoire d'un patient de manière simple, sans jargon médical complexe.
    
    RÈGLES STRICTES :
    1. Ne pose JAMAIS de diagnostic.
    2. Si une valeur est anormale, explique ce que cela signifie généralement, mais insiste sur le fait que seul le médecin traitant peut interpréter ces résultats dans le contexte global du patient.
    3. Si c'est critique (urgent), demande poliment au patient de contacter son médecin en urgence.
    4. Utilise du formatage Markdown (gras, listes à puces) pour rendre la lecture agréable sur un téléphone.
    5. Réponds UNIQUEMENT en français.
    """

    user_prompt = f"""
    Voici les résultats de laboratoire à expliquer au patient :
    {safe_data}

    Rédige une explication rassurante mais précise pour ce patient.
    """

    try:
        response = client.chat.complete(
            model="mistral-small-latest",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            max_tokens=1000
        )
        return response.choices[0].message.content
        
    except Exception as e:
        error_msg = str(e)
        if "401" in error_msg or "Unauthorized" in error_msg:
            raise Exception("Clé API Mistral invalide.")
        elif "429" in error_msg:
            raise Exception("Trop de requêtes IA. Veuillez réessayer dans quelques secondes.")
        else:
            raise Exception(f"Erreur lors de la communication avec l'IA : {error_msg}")


# ══════════════════════════════════════════════════════
# FONCTION 2 : CHATBOT GÉNÉRAL (Nouveau)
# ══════════════════════════════════════════════════════
def get_chat_response(user, user_message):
    client = Mistral(api_key=settings.MISTRAL_API_KEY)

    # 1. Récupérer les 10 derniers messages pour la mémoire
    from .models import ChatMessage
    history = list(ChatMessage.objects.filter(user=user).order_by('-created_at')[:10][::-1])

    messages = []
    
    # 2. Prompt système dynamique selon le rôle de l'utilisateur
    role = getattr(user, 'role', None) 
    user_role_name = "un utilisateur"
    
    if role == 'patient':
        user_role_name = "un patient"
        system_prompt = """
        Tu es l'assistant virtuel bienveillant d'une application médicale SaaS. Tu parles à un patient.
        RÈGLES :
        1. Réponds de manière simple, empathique et rassurante.
        2. NE POSE JAMAIS DE DIAGNOSTIC.
        3. Si le patient décrit des symptômes graves (douleurs poitrine, difficultés respirer), dis-lui d'appeler le 15 ou d'aller aux urgences.
        4. Réponds en français, de façon concise (2-3 phrases max).
        """
    elif role == 'doctor' or role == 'laboratory_staff':
        user_role_name = "un professionnel de santé"
        system_prompt = """
        Tu es l'assistant virtuel d'une application médicale SaaS. Tu parles à un médecin ou du personnel de labo.
        RÈGLES :
        1. Sois concis, précis et professionnel.
        2. Aide à l'organisation, la rédaction ou les infos médicales générales.
        3. Réponds en français, de façon concise.
        """
    else:
        system_prompt = "Tu es l'assistant utile d'une application médicale. Réponds en français de manière concise."

    messages.append({"role": "system", "content": system_prompt})

    # 3. Ajouter l'historique
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    # 4. Ajouter le nouveau message
    messages.append({"role": "user", "content": user_message})

    try:
        response = client.chat.complete(
            model="mistral-small-latest",
            messages=messages,
            temperature=0.5,
            max_tokens=150 
        )
        return response.choices[0].message.content
    except Exception as e:
        raise Exception(f"Erreur IA Chat : {str(e)}")
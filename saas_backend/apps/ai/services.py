from mistralai import Mistral
from django.conf import settings

def explain_lab_results(result_data_dict):
    """
    Prend les données brutes d'un résultat, les anonymise,
    les envoie à l'IA Mistral et retourne l'explication.
    """
    client = Mistral(api_key=settings.MISTRAL_API_KEY)

    # ════════════════ 1. ANONYMISATION DES DONNÉES ════════════════
    safe_data = {
        "resultats": result_data_dict.get("results", {}),
        "conclusion_biologiste": result_data_dict.get("conclusion", ""),
        "recommandations": result_data_dict.get("recommendations", ""),
        "est_anormal": result_data_dict.get("is_abnormal", False),
        "urgent": result_data_dict.get("critical_finding", False)
    }

    # ════════════════ 2. PROMPTING ════════════════
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
        # ════════════════ 3. APPEL À L'API MISTRAL ════════════════
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
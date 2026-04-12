# Skill: tune-persona

Ajuste le comportement du chatbot — system prompt, température, règles de réponse — sans toucher à la base de connaissance.

## Usage

```
/tune-persona
```

## Quand l'utiliser

- Le chatbot répète les mêmes formules
- Il répond de façon trop générique malgré des chunks pertinents
- Il sort du rôle (1ère personne, superlatifs vides, hallucinations)
- Le ton ne convient pas (trop formel, trop décontracté)
- Une règle métier change (salaire, disponibilité, titre)

## Fichier cible

`backend/main.py` — le system prompt est défini dans la fonction `build_system_prompt()` ou dans la variable `SYSTEM_PROMPT` (vers la ligne 80).

## Étapes

1. **Lire `backend/main.py`** pour comprendre la structure du prompt actuel.
2. **Identifier la règle à modifier** — ne jamais réécrire le prompt entièrement.
3. **Modifier chirurgicalement** — ajouter/modifier la règle concernée.
4. **Tester en local** :
   ```bash
   cd backend
   uvicorn main:app --reload --port 8002
   # Tester via curl ou le frontend local
   curl -X POST http://localhost:8002/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Pourquoi Adrien cherche un nouveau poste ?", "history": []}'
   ```
5. **Vérifier** que la réponse respecte toutes les règles :
   - 3ème personne
   - Pas de superlatifs vides
   - Pas de répétition
   - Salaire 45–50k si demandé
6. Proposer le commit uniquement si le comportement est satisfaisant.

## Paramètres LLM dans main.py

```python
temperature=0.7      # Ne pas dépasser 0.85 (hallucinations)
max_tokens=600       # Réponses concises — ne pas augmenter sans raison
model="llama-3.3-70b-versatile"  # Ne pas changer sans tester
```

## Règles du persona — ne jamais supprimer

- 3ème personne obligatoire
- Précis ou honnête (ne pas inventer)
- Anti-répétition dans la conversation
- Pas de superlatifs ("passionné", "excellent") sans contexte concret
- Salaire 45–50k EUR — ne pas dévier
- Adresser les recruteurs avec respect mais sans flagornerie

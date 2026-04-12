# Skill: add-knowledge

Ajoute ou enrichit un bloc de connaissance dans la base RAG d'Adrien Casse, puis rebuild les embeddings et prépare le commit.

## Usage

```
/add-knowledge <sujet>
```

Exemples :
- `/add-knowledge nouvelle expérience chez Fretly Q1 2025`
- `/add-knowledge projet data engineering pipeline Kafka`
- `/add-knowledge disponibilité immédiate`

## Règles impératives avant d'écrire quoi que ce soit

1. **Demande confirmation du contenu exact** si ce n'est pas dans le message — ne rien inventer.
2. **Vrai uniquement** — pas d'embellissement, pas d'exagération.
3. **Orienté impact** — "livré en production" > "compétences en X".
4. **Granulaire** — un paragraphe = une idée, ~400 chars max (taille d'un chunk RAG).
5. **3ème personne** — les .md alimentent le system prompt du LLM.

## Fichier cible selon le sujet

| Sujet | Fichier |
|-------|---------|
| Identité, vie, Maurice, langues | `knowledge/moi.md` |
| Formation, expériences pro (Fretly, C-Ways…) | `knowledge/parcours.md` |
| Compétences techniques, outils, lacunes | `knowledge/stack.md` |
| Projets personnels GitHub | `knowledge/projets.md` |
| Personnalité, passions, sport, culture | `knowledge/humain.md` |
| Motivations, vision de la data, valeurs | `knowledge/valeurs.md` |
| Réponses recruteurs (dispo, salaire, admin…) | `knowledge/faq.md` |

## Étapes à exécuter

1. **Identifier le fichier cible** selon le tableau ci-dessus.
2. **Lire le fichier** pour éviter les doublons et trouver le bon endroit d'insertion.
3. **Rédiger le bloc** en respectant le style existant (3ème personne, dense, factuel).
4. **Éditer le fichier** avec le nouveau contenu.
5. **Rebuild les embeddings** :
   ```bash
   cd backend && python3 embed.py
   ```
   Vérifier que le nombre de chunks a augmenté ou est cohérent.
6. **Afficher un résumé** du texte ajouté et demander validation avant le commit.
7. Si validé, proposer le commit :
   ```bash
   git add knowledge/<fichier>.md backend/data/
   git commit -m "feat(knowledge) : <sujet court>"
   ```

## Ne jamais faire

- Ajouter une information sans avoir demandé ou reçu confirmation qu'elle est vraie.
- Modifier `backend/data/embeddings.npy` ou `chunks.json` manuellement — uniquement via `embed.py`.
- Toucher au system prompt dans `main.py` pour du contenu factuel — ça appartient aux .md.

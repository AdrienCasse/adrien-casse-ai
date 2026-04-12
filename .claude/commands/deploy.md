# Skill: deploy

Déploie le projet adrien-casse-ai — backend Railway et/ou frontend Vercel.

## Usage

```
/deploy             # déploie tout
/deploy backend     # Railway uniquement
/deploy frontend    # Vercel uniquement
/deploy force       # force redeploy Railway sans changement de code
```

## Pré-requis

- Variables d'env sur Railway : `GROQ_API_KEY`
- Variables d'env sur Vercel : `NEXT_PUBLIC_API_URL` (URL Railway)
- Branch `main` à jour

## Étapes

### 1. Vérification avant deploy

```bash
# Statut git
git status
git log --oneline -5

# Health check backend local (si backend en cours)
curl http://localhost:8002/health
```

### 2. Deploy backend (Railway)

Railway auto-déploie sur `git push main`. Le Dockerfile exécute `embed.py` à build time.

```bash
git push origin main
```

Pour forcer un redeploy sans modification :
```bash
git commit --allow-empty -m "chore : force redeploy Railway"
git push origin main
```

**Attendre ~3-5 min** que Railway rebuilde l'image Docker (embed.py prend ~60s).

Vérifier :
```bash
curl https://<railway-url>/health
# Attendu: {"status": "ok", "chunks": 57}
```

### 3. Deploy frontend (Vercel)

Vercel auto-déploie sur `git push main` depuis `frontend/`.

Si le push backend a déjà été fait, Vercel déploie en parallèle.

Vérifier :
- [adrien-casse-rag.vercel.app](https://adrien-casse-rag.vercel.app) charge correctement
- Envoyer un message test dans le chat

### 4. Vérification finale

- [ ] `/health` retourne `chunks: 57` (ou le bon nombre)
- [ ] Frontend charge sans erreur console
- [ ] Un message test reçoit une réponse cohérente
- [ ] Le panel profil affiche les bonnes infos

## Problèmes fréquents

| Symptôme | Cause probable | Fix |
|----------|---------------|-----|
| `502 Bad Gateway` Railway | Build en cours | Attendre ~5min |
| `CORS error` frontend | URL Railway changée | Mettre à jour `NEXT_PUBLIC_API_URL` sur Vercel |
| `chunks: 0` sur /health | embed.py a échoué | Vérifier logs Railway build |
| Frontend bloqué à "loading" | Backend unreachable | Vérifier Railway URL dans env Vercel |

# Comment fonctionne cet assistant

## Ce que c'est
Cet outil est un chatbot RAG (Retrieval-Augmented Generation) construit par Adrien Casse lui-même pour présenter son profil de façon active aux recruteurs et aux contacts data. Il n'utilise pas de framework haut-niveau — tout le pipeline est codé à la main, du chunking à l'inférence. Le code source est public sur GitHub : github.com/AdrienCasse/adrien-casse-rag.

## Pipeline RAG précis, étape par étape
Quand quelqu'un envoie une question, voici ce qui se passe en moins d'une seconde :

1. La question est embeddée côté backend par fastembed, avec le modèle BAAI/bge-small-en-v1.5 — 384 dimensions, format ONNX, environ 33 Mo.
2. Une similarité cosinus en NumPy compare ce vecteur aux 70 chunks pré-calculés issus de la base de connaissance markdown.
3. Les 4 chunks les plus proches (top-K = 4) sont injectés dans le system prompt comme contexte.
4. Le prompt complet est envoyé à Groq, qui fait tourner Llama 3.3 70B Versatile, et qui génère la réponse en streaming non-streamé (renvoyé en une fois).
5. La réponse arrive au navigateur, et la question est loggée anonymement en SQLite (IP hashée SHA-256) pour les analytics.

## Stack technique détaillée
Backend : FastAPI sur Python 3.11, hébergé sur Railway. Auto-déploiement à chaque git push sur la branche main.
Frontend : Next.js 14 (App Router, CSR uniquement, pas de SSR), hébergé sur Vercel.
LLM : Groq (Llama 3.3 70B Versatile) — tier gratuit, 14 400 requêtes/jour, latence d'environ 300 ms.
Embeddings : fastembed (ONNX runtime, pas PyTorch). Choix assumé pour réduire l'image Docker à environ 150 Mo au lieu de 1,5 Go avec sentence-transformers.
Index vectoriel : NumPy cosine similarity. Pas de FAISS, pas de Pinecone, pas de Weaviate — sur 70 chunks, c'est totalement superflu.
Analytics : SQLite locale, pas de PostgreSQL — il n'y a aucune concurrence critique pour ce trafic.
Base de connaissance : 8 fichiers markdown éditables manuellement et versionnés en git, qui produisent environ 70 chunks après découpage.

## Build time vs runtime
Les embeddings sont calculés une seule fois, au moment du build de l'image Docker, par le script embed.py. Ils sont ensuite figés dans l'image sous forme de fichiers embeddings.npy et chunks.json. Au démarrage du backend, ces fichiers sont simplement chargés en mémoire. Conséquence : aucun appel d'embedding au runtime, démarrage immédiat, latence stable et prévisible.

## Sécurité
CORS restreint exclusivement à adrien-casse-rag.vercel.app et localhost. Rate limiting de 20 requêtes par IP par heure, en mémoire. Validation regex anti-injection sur les inputs avec un maximum de 500 caractères par message. Les IPs sont hashées SHA-256 avant stockage — aucune donnée personnelle identifiable n'est conservée. Les variables sensibles (clé API Groq) sont stockées uniquement côté Railway, jamais dans le code.

## Coût d'exploitation
Zéro euro par mois. Groq tier gratuit, Railway hobby plan gratuit, Vercel free, code open source. La stack est pensée pour rester gratuite tant que le trafic ne dépasse pas plusieurs milliers de questions par jour.

## Pourquoi pas LangChain ou LlamaIndex
Choix assumé : le RAG est codé à la main pour démontrer la compréhension réelle des mécanismes sous-jacents — chunking, embedding, retrieval, prompt augmentation, gestion du contexte. Une bibliothèque haut-niveau aurait masqué tout le pipeline. Sur un volume de 70 chunks, le custom est plus simple, plus pédagogique, et plus rapide à débugger.

## Pourquoi Groq plutôt qu'OpenAI ou Anthropic
Tier gratuit largement suffisant, latence très basse (environ 300 ms contre souvent plus d'une seconde sur GPT-4), et Llama 3.3 70B est amplement adapté pour un cas d'usage RAG bien cadré. Aucune carte bancaire requise. Si le trafic explosait, le passage à un provider payant (Anthropic, OpenAI, Mistral) se ferait en changeant deux lignes — l'architecture est agnostique.

## Auteur et maintenance
Cet outil a été conçu, codé, déployé et est maintenu par Adrien Casse, en solo. Backend, frontend, prompt engineering, base de connaissance, infrastructure — tout vient de lui. C'est aussi, et délibérément, un projet de démonstration : le code source montre comment il pense un projet data de bout en bout, depuis la collecte d'information jusqu'à la mise en production.

## Précisions fréquentes
Non, ce n'est pas self-hosted au sens d'un serveur personnel — c'est hébergé sur Railway et Vercel, deux PaaS gérés.
Non, ce n'est pas une instance d'un Llama tourné en local — l'inférence est faite par Groq, un fournisseur d'inférence spécialisé.
Oui, le code source est entièrement public et reproductible.
Oui, la base de connaissance est rédigée par Adrien lui-même, mise à jour quand son profil évolue.

# Mes projets

## Régression hédonique sur les prix immobiliers à Lyon
Projet personnel sur les données DVF (Demandes de Valeurs Foncières) — 47 000 transactions réelles.
J'ai construit un modèle OLS de régression hédonique pour expliquer et prédire les prix au m² à Lyon selon les caractéristiques du bien. R² = 0.72 sur les données de test.
Ce qui m'a intéressé dans ce projet : pas le modèle en lui-même, mais le travail de nettoyage et de structuration de 47 000 lignes de données réelles, avec toutes les incohérences que ça implique. Et la rigueur de l'interprétation économétrique — chaque coefficient a un sens.

## Valeur résiduelle de véhicules — XGBoost vs régression polynomiale
Comparaison de deux approches pour prédire la valeur résiduelle de véhicules d'occasion.
XGBoost vs régression polynomiale, évalué sur MAPE : 4.2% d'erreur moyenne. Ce projet est directement lié à mon travail chez C-Ways — j'ai voulu explorer des méthodes alternatives à ce qu'on faisait en production.

## Job Hunter — outil personnel de recherche d'emploi
Un projet que j'ai construit entièrement pour moi : scraping multi-sources (LinkedIn, WTTJ), scoring automatique des offres via LLM, dashboard de suivi, sync Google Sheets.
Stack : FastAPI, Next.js, SQLite, Python (Playwright, BeautifulSoup), Claude API.
Ce projet illustre bien ma façon de travailler : quand j'ai un problème répétitif, je construis un outil. Et je le construis proprement, avec une vraie architecture.

## Ce chatbot — adrien-casse-ai
Un pipeline RAG complet pour créer un chatbot qui me représente.
Embedding avec sentence-transformers, recherche vectorielle FAISS, inférence via Llama 3.1 70B (Groq), déployé publiquement.
Ce que j'ai voulu montrer : je sais construire un système LLM de bout en bout, pas juste appeler une API.

## GitHub
Tous mes projets sont sur GitHub : https://github.com/AdrienCasse

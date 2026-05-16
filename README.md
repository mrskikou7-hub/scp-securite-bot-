# 🔐 SCP Bot — Département de Sécurité

Bot Discord pour gérer les prises de service et les heures du Département de Sécurité d'un serveur RP SCP.

---

## ✨ Fonctionnalités

- 🟢 **Bouton Prise de Service** — Lance un chrono pour l'agent
- 🔴 **Bouton Fin de Service** — Arrête le chrono et enregistre la session
- 📊 **Leaderboard en temps réel** — Affiche tous les agents en service + leur session actuelle
- 🏆 **Classement total** — Top 10 des heures cumulées par agent
- 🎭 **Attribution de rôle automatique** (optionnel) — Rôle "En Service" ajouté/retiré
- 📈 **/stats-service** — Voir ses propres heures (ou celles d'un autre agent)

---

## 🚀 Installation

### 1. Prérequis
- [Node.js](https://nodejs.org) v18 ou supérieur
- Un bot Discord créé sur [discord.com/developers](https://discord.com/developers)

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer le bot
Copie `.env.example` en `.env` et remplis les valeurs :
```bash
cp .env.example .env
```

Puis édite `.env` :
```
DISCORD_TOKEN=ton_token_ici
IN_SERVICE_ROLE_ID=id_du_role_en_service  # Optionnel
```

### 4. Lancer le bot
```bash
npm start
```

---

## ⚙️ Configuration du Bot sur Discord

1. Va sur [discord.com/developers](https://discord.com/developers) → ton application
2. Dans **Bot** → active les **Privileged Gateway Intents** :
   - ✅ Server Members Intent
3. Dans **OAuth2 → URL Generator** :
   - Scopes : `bot`, `applications.commands`
   - Permissions : `Send Messages`, `Embed Links`, `Manage Roles` (si rôle auto)
4. Invite le bot sur ton serveur avec l'URL générée

---

## 📖 Commandes

| Commande | Description | Permission |
|---|---|---|
| `/setup-service` | Déploie le panneau de service dans le salon | Admin |
| `/stats-service` | Affiche tes heures de service | Tout le monde |
| `/stats-service @agent` | Affiche les heures d'un autre agent | Tout le monde |

---

## 🗂️ Structure des fichiers

```
scp-bot/
├── src/
│   ├── index.js              # Point d'entrée
│   ├── commands/
│   │   ├── setup-service.js  # Déploiement du panneau
│   │   └── stats-service.js  # Stats personnelles
│   ├── events/
│   │   ├── ready.js          # Connexion + enregistrement des commandes
│   │   └── interactionCreate.js  # Gestion boutons + commandes
│   └── utils/
│       ├── db.js             # Base de données JSON
│       └── leaderboard.js    # Construction des embeds
├── data/
│   └── service.json          # Données des agents (auto-créé)
├── .env.example
├── package.json
└── README.md
```

---

## 🧪 Utilisation

1. Va dans le salon où tu veux le panneau
2. Tape `/setup-service` (admin requis)
3. Le bot envoie un embed avec les deux boutons
4. Les agents cliquent sur **🟢 Prise de Service** / **🔴 Fin de Service**
5. Le leaderboard se met à jour automatiquement à chaque action

> 💡 **Astuce** : Crée un salon dédié genre `#service-securite` et épingle le message !

---

## 💾 Données

Les heures sont sauvegardées dans `data/service.json`. Ce fichier est créé automatiquement au premier lancement. **Fais-en des sauvegardes régulières !**

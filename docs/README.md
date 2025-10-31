# 📚 Documentation Technique

## 📋 Vue d'Ensemble

Cette documentation couvre l'architecture, l'API, le débogage et la migration du système **Deck of Cards** - une bibliothèque cross-platform (React Native + Web) pour animations de cartes interactives.

## 📖 Guides Disponibles

### 🏗️ Architecture & Conception
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture technique détaillée
  - Structure monorepo (@deck/core, @deck/web, @deck/rn)
  - Patterns de conception (Hook, Driver, Component Composition)
  - Flux de données et optimisation performance

- **[API.md](./API.md)** - Référence API complète
  - Props DeckView et interfaces TypeScript
  - Structures de données (CardState, CardLayout, DeckState)
  - Fonctions de rendu et exemples d'usage

### 🔧 Développement & Débogage
- **[DEBUGGING.md](./DEBUGGING.md)** - Guide de débogage RN
  - Diagnostic problèmes de centrage
  - Analyse logs détaillés
  - Outils et checklists de validation

- **[CORRECTIFS.md](./CORRECTIFS.md)** - Correctifs implémentés
  - Solutions aux 8 problèmes identifiés
  - Métriques d'amélioration
  - Tests de validation

### 📊 Analyse & Migration
- **[ANALYSIS.md](./ANALYSIS.md)** - Analyse technique approfondie
  - Problèmes identifiés et solutions architecturales
  - Comparaison Baked Scale vs Parent Scale
  - Plan de migration détaillé

- **[MIGRATION_RN.md](./MIGRATION_RN.md)** - Migration Baked → Parent Scale
  - Guide étape par étape
  - Tests et validation
  - Gestion des risques

## 🎯 Points d'Entrée Recommandés

### Nouveau Développeur
1. **[README principal](../README.md)** - Vue d'ensemble
2. **[API.md](./API.md)** - Interface et exemples
3. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Comprendre la structure

### Débogage Problème RN
1. **[DEBUGGING.md](./DEBUGGING.md)** - Diagnostic centrage
2. **[CORRECTIFS.md](./CORRECTIFS.md)** - Solutions appliquées
3. **[ANALYSIS.md](./ANALYSIS.md)** - Analyse technique

### Migration Architecture
1. **[ANALYSIS.md](./ANALYSIS.md)** - Problèmes actuels
2. **[MIGRATION_RN.md](./MIGRATION_RN.md)** - Plan de migration
3. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture cible

## 🏷️ Tags et Organisation

### Par Audience
- **👨‍💻 Développeurs** : API.md, ARCHITECTURE.md
- **🐛 Debuggers** : DEBUGGING.md, CORRECTIFS.md
- **📈 Architectes** : ANALYSIS.md, MIGRATION_RN.md

### Par Sujet
- **🔧 Technique** : ARCHITECTURE.md, API.md
- **🐛 Problèmes** : DEBUGGING.md, CORRECTIFS.md, ANALYSIS.md
- **🚀 Évolution** : MIGRATION_RN.md, ANALYSIS.md

### Par Urgence
- **🔴 Critique** : DEBUGGING.md (problèmes centrage)
- **🟡 Important** : CORRECTIFS.md (solutions implémentées)
- **🟢 Planification** : MIGRATION_RN.md (évolution future)

## 📊 État Actuel

| Document | Statut | Dernière MAJ | Couverture |
|----------|--------|--------------|------------|
| **ARCHITECTURE.md** | ✅ Complet | Oct 2025 | Architecture, patterns, perf |
| **API.md** | ✅ Complet | Oct 2025 | Props, types, exemples |
| **DEBUGGING.md** | ✅ Complet | Oct 2025 | Diagnostic, logs, outils |
| **CORRECTIFS.md** | ✅ Complet | Oct 2025 | Solutions, métriques |
| **ANALYSIS.md** | ✅ Complet | Oct 2025 | Problèmes, solutions |
| **MIGRATION_RN.md** | ✅ Complet | Oct 2025 | Plan migration |

## 🤝 Contribution

### Ajout de Documentation
1. **Format** : Markdown avec emojis cohérents
2. **Structure** : Titres hiérarchiques, sections claires
3. **Liens** : Références croisées entre documents
4. **Mise à jour** : README.md quand nouveau document

### Standards
- **Langue** : Français (code) / Anglais (noms techniques)
- **Emojis** : Cohérents (🔧 tools, 🎯 goals, 📊 data)
- **Code** : Blocs ```typescript avec syntax highlighting
- **Liens** : Relatifs vers autres documents

### Review Process
- **Création** : PR avec description claire
- **Review** : Vérification complétude et cohérence
- **Merge** : Mise à jour table des matières

## 🔄 Synchronisation

### Avec Code
- **API Changes** → Mettre à jour API.md
- **Architecture Changes** → Mettre à jour ARCHITECTURE.md
- **Nouveaux Problèmes** → Mettre à jour DEBUGGING.md

### Avec README Principal
- **Features** → Synchroniser exemples
- **Breaking Changes** → Documenter migration
- **Performance** → Mettre à jour métriques

## 📞 Support

### Pour les Développeurs
- **Questions API** → API.md
- **Problèmes centrage** → DEBUGGING.md
- **Architecture** → ARCHITECTURE.md

### Pour l'Équipe
- **Nouvelles features** → ANALYSIS.md
- **Migration** → MIGRATION_RN.md
- **Correctifs** → CORRECTIFS.md

---

**🎴 Documentation vivante, mise à jour avec le code et les besoins de l'équipe.**

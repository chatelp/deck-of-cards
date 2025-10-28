# 🔄 Instructions pour recharger l'app mobile avec les nouveaux changements

## ⚠️ Problème
Metro bundler ne détecte pas automatiquement les changements dans les packages du monorepo.

## ✅ Solution appliquée

### 1. Cache vidé
```bash
✓ Suppression de .expo et node_modules/.cache
```

### 2. Packages compilés
```bash
✓ Les fichiers dist/ sont à jour (compilés à 12:54)
```

## 🚀 Prochaines étapes

### Option A : Redémarrer avec cache vidé (recommandé)

1. **Arrêter le serveur actuel** si il tourne encore (Ctrl+C)

2. **Démarrer avec le cache vidé** :
   ```bash
   cd apps/mobile
   expo start --clear
   ```

3. **Scanner le QR code** ou presser `i` pour iOS simulator

### Option B : Rebuild complet + redémarrage

Si l'option A ne fonctionne pas :

```bash
# 1. Rebuild tous les packages
pnpm build

# 2. Clear le cache Metro
cd apps/mobile
rm -rf .expo node_modules/.cache

# 3. Clear le cache watchman (si installé)
watchman watch-del-all

# 4. Redémarrer
expo start --clear
```

### Option C : Via la commande root (alternative)

Depuis la racine du projet :

```bash
# Arrêter tous les processus en cours (Ctrl+C), puis:
pnpm dev:mobile
```

Puis dans le terminal Metro, presser :
- `r` - reload app
- `shift + r` - reload app and clear cache

## 🔍 Comment vérifier que ça fonctionne

Les changements que vous devriez observer :

### Mode Ring
- Les cartes devraient être **plus petites** et **mieux centrées**
- **Aucun débordement** visible, même avec 64 cartes
- Plus d'espace autour du ring

### Mode Fan
- Les cartes devraient être **légèrement plus petites**
- L'arc devrait être **complètement contenu** dans le conteneur
- Pas de cartes coupées sur les bords

## 🐛 Si vous ne voyez toujours pas de différence

1. **Vérifier la version des packages** :
   ```bash
   # Dans l'app, ajouter temporairement :
   console.log('DeckView version check:', require('@deck/rn/package.json').version);
   ```

2. **Hard reload sur l'appareil** :
   - iOS: Secouer l'appareil → "Reload"
   - Ou dans le terminal Metro: presser `r`

3. **Rebuild complet** :
   ```bash
   # Root du projet
   pnpm install
   pnpm build
   cd apps/mobile
   rm -rf .expo node_modules/.cache
   expo start --clear
   ```

## 📊 Différences visuelles attendues

### Avant (débordement)
```
┌─────────────────┐
│   🂡         🂱 │  <- cartes débordent
🂮               🂮
│                │
│   🂡         🂱 │
└─────────────────┘
```

### Après (contenu)
```
┌─────────────────┐
│                 │
│  🂡        🂱   │  <- tout contenu
│ 🂮          🂮  │
│  🂡        🂱   │
│                 │
└─────────────────┘
```

## 💡 Note sur le workflow de développement

Pour les prochains changements dans les packages :

1. **Modifier le code** dans `packages/*/src/`
2. **Compiler** : `pnpm build` (à la racine)
3. **Redémarrer Metro avec cache vidé** : `expo start --clear`
4. Ou presser `r` dans le terminal Metro pour reload

Astuce : Ajouter un script dans `package.json` :
```json
"dev:rebuild": "pnpm build && cd apps/mobile && expo start --clear"
```



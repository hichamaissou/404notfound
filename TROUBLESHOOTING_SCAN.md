# 🔧 Dépannage - Bouton "Scan now" ne fonctionne pas

## 🚨 **Problèmes Courants et Solutions**

### **1. Shop non détecté**
**Symptôme :** Toast "Shop not found in URL or localStorage"

**Solutions :**
```bash
# Vérifier l'URL
https://votre-app.vercel.app/embedded/dashboard?shop=votre-shop.myshopify.com

# Vérifier dans la console du navigateur
console.log('Shop detection:', window.location.search)
```

### **2. Shop non trouvé en base de données**
**Symptôme :** Toast "Shop test failed: Shop not found"

**Solutions :**
```bash
# Vérifier si le shop existe
curl "https://votre-app.vercel.app/api/debug/scan-test?shop=votre-shop.myshopify.com"

# Créer les tables si nécessaire
curl "https://votre-app.vercel.app/api/debug/create-tables?key=setup"
```

### **3. Erreur de base de données**
**Symptôme :** Toast "Failed to queue scan: Database error"

**Solutions :**
```bash
# Tester la connexion DB
curl "https://votre-app.vercel.app/api/debug/db"

# Vérifier les variables d'environnement
curl "https://votre-app.vercel.app/api/debug/config"
```

### **4. Problème d'authentification OAuth**
**Symptôme :** Le shop n'est pas enregistré après OAuth

**Solutions :**
1. Vérifier que l'OAuth callback fonctionne
2. Vérifier que le shop est bien enregistré en DB
3. Vérifier les cookies (sameSite: 'none', secure: true)

## 🔍 **Diagnostic Étape par Étape**

### **Étape 1 : Vérifier l'URL**
```javascript
// Dans la console du navigateur
console.log('URL:', window.location.href)
console.log('Search params:', window.location.search)
console.log('Shop param:', new URLSearchParams(window.location.search).get('shop'))
```

### **Étape 2 : Vérifier le shop en localStorage**
```javascript
// Dans la console du navigateur
console.log('Shop from localStorage:', localStorage.getItem('shop_domain'))
```

### **Étape 3 : Tester l'API de scan**
```bash
# Test direct de l'API
curl -X POST "https://votre-app.vercel.app/api/scans/queue" \
  -H "Content-Type: application/json" \
  -d '{"shop":"votre-shop.myshopify.com"}'
```

### **Étape 4 : Vérifier les logs**
```bash
# Vérifier les logs Vercel
vercel logs https://votre-app.vercel.app

# Ou dans la console du navigateur
# Les logs apparaissent maintenant avec plus de détails
```

## 🛠️ **Solutions Spécifiques**

### **Solution 1 : Réinitialiser le shop**
```javascript
// Dans la console du navigateur
localStorage.removeItem('shop_domain')
// Puis recharger la page avec ?shop=votre-shop.myshopify.com
```

### **Solution 2 : Forcer la création du shop**
```bash
# Si le shop n'existe pas en DB, l'ajouter manuellement
# Via l'API de debug ou directement en base
```

### **Solution 3 : Vérifier la configuration**
```bash
# Vérifier toutes les variables d'environnement
curl "https://votre-app.vercel.app/api/debug/config"

# Vérifier la connexion DB
curl "https://votre-app.vercel.app/api/debug/db"
```

## 📊 **Debug Amélioré**

Le dashboard affiche maintenant des informations de debug dans la console :

1. **Shop Detection** - Vérifie si le shop est détecté
2. **Shop Test** - Teste si le shop existe en DB
3. **Scan Queue Response** - Affiche la réponse de l'API

## 🎯 **Test Rapide**

```bash
# 1. Tester l'endpoint de debug
curl "https://votre-app.vercel.app/api/debug/scan-test?shop=votre-shop.myshopify.com"

# 2. Si OK, tester l'API de scan
curl -X POST "https://votre-app.vercel.app/api/scans/queue" \
  -H "Content-Type: application/json" \
  -d '{"shop":"votre-shop.myshopify.com"}'

# 3. Vérifier les scans existants
curl "https://votre-app.vercel.app/api/scans/status?shop=votre-shop.myshopify.com"
```

## 🚀 **Si Rien Ne Fonctionne**

1. **Vérifier les logs Vercel** pour les erreurs serveur
2. **Vérifier la base de données** Supabase
3. **Vérifier les variables d'environnement** dans Vercel
4. **Redéployer** l'application si nécessaire

Le problème est probablement lié à :
- Shop non enregistré en DB après OAuth
- Variables d'environnement manquantes
- Problème de connexion à la base de données

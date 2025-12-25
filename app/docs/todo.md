SMS flow from another app

# Guide d'Envoi SMS après Action Client

## 📱 Vue d'ensemble

Ce document explique comment envoyer un SMS automatiquement après qu'un client ait effectué une tâche dans votre application. Vous avez déjà l'API key configurée, voici comment utiliser le flow pour envoyer le SMS.

---

## 🔄 Flow Simple

```
Client effectue une action → Appel API → SMS envoyé automatiquement
```

### Étapes du Flow

1. **Client effectue une tâche** (ex: crée un dépôt, passe une commande, etc.)
2. **Votre application appelle l'API** avec les données nécessaires
3. **L'API traite la tâche et envoie automatiquement le SMS** au client
4. **Le client reçoit le SMS** avec les informations pertinentes

---

## 📋 Comment Utiliser le Flow

### 1. Appel API depuis votre Application

Après que le client ait effectué sa tâche, appelez l'endpoint API avec les données nécessaires.

#### Exemple: Envoi SMS après création de dépôt

```javascript
// Dans votre handler backend après traitement de la tâche
async function handleClientAction(req, res) {
  try {
    // 1. Traiter la tâche du client
    const { amount, phoneNumber, paymentMethod } = req.body;
    
    // ... votre logique de traitement ...
    
    // 2. Appeler l'API pour envoyer le SMS
    await sendSMS({
      phoneNumber: phoneNumber,
      message: `Votre dépôt de ${amount} a été créé. Lien: https://example.com/pay/123`
    });
    
    // 3. Retourner la réponse
    res.json({
      success: true,
      message: 'Tâche effectuée et SMS envoyé'
    });
    
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
```

### 2. Fonction d'Envoi SMS

Créez une fonction simple pour envoyer le SMS via votre API SMS:

```javascript
// Fonction pour envoyer SMS
async function sendSMS({ phoneNumber, message }) {
  try {
    const response = await fetch('https://votre-api-sms.com/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SMS_API_KEY}` // Votre API key
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de l\'envoi du SMS');
    }
    
    console.log('SMS envoyé avec succès:', data);
    return data;
    
  } catch (error) {
    console.error('Erreur envoi SMS:', error);
    // Ne pas faire échouer l'opération principale si SMS échoue
    // Juste logger l'erreur
    throw error;
  }
}
```

---

## 💡 Exemples Concrets

### Exemple 1: SMS après Dépôt

```javascript
// POST /api/deposits
async function createDeposit(req, res) {
  const { amount, phoneNumber, paymentMethod } = req.body;
  
  // Créer le dépôt
  const deposit = await Deposit.create({
    amount,
    phoneNumber,
    paymentMethod,
    status: 'pending'
  });
  
  // Générer le lien de paiement
  const paymentLink = `https://yourapp.com/pay/${deposit.id}`;
  
  // Envoyer le SMS
  await sendSMS({
    phoneNumber: phoneNumber,
    message: `Bonjour! Votre dépôt de ${amount} a été créé. Lien de paiement: ${paymentLink}`
  });
  
  res.json({ success: true, depositId: deposit.id });
}
```

### Exemple 2: SMS après Commande

```javascript
// POST /api/orders
async function createOrder(req, res) {
  const { items, phoneNumber, total } = req.body;
  
  // Créer la commande
  const order = await Order.create({
    items,
    phoneNumber,
    total,
    status: 'pending'
  });
  
  // Envoyer le SMS de confirmation
  await sendSMS({
    phoneNumber: phoneNumber,
    message: `Votre commande #${order.id} de ${total} a été enregistrée. Vous recevrez un SMS de confirmation.`
  });
  
  res.json({ success: true, orderId: order.id });
}
```

### Exemple 3: SMS après Exécution de Commande

```javascript
// POST /api/commands/execute
async function executeCommand(req, res) {
  const { command, phoneNumber, params } = req.body;
  
  // Exécuter la commande
  const result = await processCommand(command, params);
  
  // Préparer le message SMS selon le résultat
  let smsMessage = '';
  if (result.success) {
    smsMessage = `Commande "${command}" exécutée avec succès. ${result.message}`;
  } else {
    smsMessage = `Erreur lors de l'exécution de "${command}": ${result.error}`;
  }
  
  // Envoyer le SMS
  await sendSMS({
    phoneNumber: phoneNumber,
    message: smsMessage
  });
  
  res.json({ success: true, result, smsSent: true });
}
```

---

## 🔧 Configuration

### Variables d'Environnement

Assurez-vous d'avoir votre API key configurée:

```bash
# .env
SMS_API_KEY=votre_api_key_ici
SMS_API_URL=https://votre-api-sms.com/send
```

### Utilisation dans le Code

```javascript
// Charger la configuration
require('dotenv').config();

// Utiliser l'API key
const SMS_API_KEY = process.env.SMS_API_KEY;
const SMS_API_URL = process.env.SMS_API_URL;
```

---

## 📝 Structure du Message SMS

Le message SMS doit être:
- **Court et clair** (max 160 caractères recommandé)
- **Informatif** (expliquer ce qui s'est passé)
- **Actionnable** (inclure un lien si nécessaire)

### Exemples de Messages

```
✅ Succès:
"Votre dépôt de 5000 a été créé. Lien: https://app.com/pay/123"

✅ Commande:
"Commande #456 créée avec succès. Montant: 15000. Merci!"

✅ Confirmation:
"Votre tâche a été effectuée. Référence: ABC123"
```

---

## ⚠️ Gestion des Erreurs

### Ne pas faire échouer l'opération principale

Si l'envoi SMS échoue, ne faites pas échouer la tâche principale:

```javascript
async function handleClientAction(req, res) {
  try {
    // Traiter la tâche principale
    const result = await processMainTask(req.body);
    
    // Essayer d'envoyer le SMS (mais ne pas faire échouer si ça rate)
    try {
      await sendSMS({
        phoneNumber: req.body.phoneNumber,
        message: 'Votre tâche a été effectuée avec succès'
      });
    } catch (smsError) {
      // Juste logger l'erreur, mais continuer
      console.error('Erreur envoi SMS (non bloquant):', smsError);
    }
    
    // Retourner le succès même si SMS a échoué
    res.json({ success: true, data: result });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

---

## 🎯 Points Importants

1. **Format du numéro**: Utilisez le format international (ex: +2250712345678)
2. **Validation**: Validez le numéro de téléphone avant d'envoyer
3. **Rate Limiting**: Respectez les limites de votre API SMS
4. **Logging**: Loggez tous les envois SMS pour le suivi
5. **Messages**: Gardez les messages courts et pertinents

---

## ✅ Checklist Rapide

- [ ] API key configurée dans les variables d'environnement
- [ ] Fonction `sendSMS()` créée
- [ ] Appel à `sendSMS()` ajouté après traitement de la tâche
- [ ] Gestion d'erreur implémentée (non bloquante)
- [ ] Format du numéro de téléphone validé
- [ ] Message SMS testé et vérifié

---

## 📞 Exemple Complet

Voici un exemple complet d'intégration:

```javascript
// services/smsService.js
const SMS_API_KEY = process.env.SMS_API_KEY;
const SMS_API_URL = process.env.SMS_API_URL;

async function sendSMS({ phoneNumber, message }) {
  const response = await fetch(SMS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SMS_API_KEY}`
    },
    body: JSON.stringify({ to: phoneNumber, message })
  });
  
  if (!response.ok) {
    throw new Error('Erreur envoi SMS');
  }
  
  return await response.json();
}

// routes/deposits.js
app.post('/api/deposits', async (req, res) => {
  try {
    const { amount, phoneNumber } = req.body;
    
    // Créer le dépôt
    const deposit = await createDeposit({ amount, phoneNumber });
    
    // Envoyer SMS
    try {
      await sendSMS({
        phoneNumber,
        message: `Dépôt de ${amount} créé. Lien: https://app.com/pay/${deposit.id}`
      });
    } catch (smsError) {
      console.error('SMS non envoyé:', smsError);
    }
    
    res.json({ success: true, deposit });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

**C'est tout!** Après chaque action client, appelez simplement `sendSMS()` avec le numéro et le message, et le SMS sera envoyé automatiquement.


we already saved our const SMS_API_KEY and SMS_API_URL on .env.local
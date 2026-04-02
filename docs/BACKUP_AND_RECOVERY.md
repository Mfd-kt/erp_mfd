# Sauvegarde et récupération

## Stratégie de sauvegarde

### 1. Sauvegardes automatiques Supabase

Supabase propose des sauvegardes automatiques selon le plan :

- **Pro** : sauvegardes quotidiennes, rétention 7 jours
- **Team** : sauvegardes quotidiennes, rétention 14 jours
- **Enterprise** : personnalisable

**Vérification :** Dashboard Supabase → Project Settings → Database → Backups

### 2. Points de restauration

Les sauvegardes permettent une restauration à un point dans le temps (PITR) sur les plans Pro+.

### 3. Export manuel (tables critiques)

Pour un export manuel des données critiques :

```sql
-- Exemple : export des dettes, paiements, revenus (à adapter selon schéma)
-- Utiliser pg_dump ou l'outil Supabase pour un dump complet
```

**Tables prioritaires :**
- companies, groups, memberships
- debts, payments, revenues
- accounts, creditors, debt_categories, debt_types
- recurring_rules
- exchange_rates
- activity_logs (audit)

### 4. Processus de récupération

1. **Identifier le point de restauration** (date/heure avant l’incident)
2. **Contacter le support Supabase** ou utiliser le Dashboard pour lancer une restauration PITR
3. **Vérifier l’intégrité** après restauration (comptages, contraintes)
4. **Réexécuter les migrations** si la restauration a recréé la base

### 5. Bonnes pratiques

- Ne pas stocker de secrets en clair dans le code
- Utiliser les variables d’environnement pour les clés
- Tester régulièrement la restauration sur une copie
- Documenter les procédures spécifiques à l’équipe

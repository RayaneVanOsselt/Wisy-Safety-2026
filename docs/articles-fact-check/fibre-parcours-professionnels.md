# Fact-check — Les parcours professionnels dans la fibre optique

- **Origine** : https://wisysafety.be/les-parcours-professionnels-dans-la-fibre-optique-du-technicien-a-lingenieur-reseau/
  (archive `content/_legacy/les-parcours-professionnels-dans-la-fibre-optique-du-technicien-a-lingenieur-reseau.md`)
- **Publié** : `article-fibre-parcours-professionnels.html`, et en modale sur `formation-fibre-optique.html#article-fibre-parcours-professionnels`
- **Relu le** : 01/10/2026
- **Verdict** : **Publiable après corrections**. Le contenu sur la France et le marché a été retiré. Les certifications ont été vérifiées auprès des organismes qui les délivrent.

## Affirmations vérifiées

| # | Affirmation d'origine | Vérification | Source | Décision |
|---|---|---|---|---|
| 1 | Trois niveaux de postes (technicien, confirmé ou chef d'équipe, ingénieur) et leurs tâches | Description de métier générale. Ce n'est pas un fait chiffré. | — | Gardé comme **conseil de l'équipe pédagogique** (sections 1, 2 et 4, mention en bas d'article) |
| 2 | « Tests de continuité avec OTDR » | Imprécis : l'OTDR sert à caractériser les événements d'une liaison et au dépannage. | `SRC-FIB-004` (FOA) | Reformulé : « tests et mesures, dont la réflectométrie (OTDR) » |
| 3 | « Supervision des architectures réseaux (GPON, 10G-PON, DWDM) » | Sigles non vérifiés un par un | — | Simplifié en « par exemple les réseaux optiques passifs (PON) » (terme générique repris de l'original) |
| 4 | CAP, Bac pro MELEC, BTS SN, Licence pro | **Diplômes français**, sans équivalent direct en Belgique | — | **Retiré**, remplacé par des voies génériques (enseignement technique, formation professionnelle courte, formation en entreprise) |
| 5 | « Formations courtes (3 à 6 mois) » | Durée non sourcée | — | **Retiré** |
| 6 | CFOT (FOA) : « Durée 3 à 5 jours », « internationalement reconnue » | La FOA présente la CFOT comme sa principale certification pour techniciens. Examen écrit de 100 questions, au moins 70 bonnes réponses. Accès par une école agréée FOA ou par au moins 2 ans d'expérience (certification directe). « 3 à 5 jours » et « internationalement reconnue » ne sont pas repris. | `SRC-FIB-006` | Corrigé selon la FOA |
| 7 | CCNA : « indispensable pour progresser vers ingénieur réseau », « base pour CCNP, CCIE », « routage, commutation, sécurité » | Cisco : la CCNA s'obtient en réussissant l'examen 200-301 CCNA. Contenu : fondamentaux réseau, accès réseau, connectivité et services IP, fondamentaux de la sécurité, automatisation et programmabilité. « Indispensable » n'est pas sourcé. | `SRC-FIB-007` | Corrigé selon Cisco ; présentée comme « utile », pas « indispensable » |
| 8 | « Certifications internes » des opérateurs Orange, SFR, Free, Bouygues | Opérateurs français, non vérifié | — | **Retiré** |
| 9 | Tendances du marché (déploiement massif FTTH en France, 5G, drones et robots, mobilité internationale) | Aucune source | — | **Retiré** (section entière) |
| 10 | Tableau de synthèse (formations CAP/Bac pro, CFOT, CCNP…) | Refait avec les éléments gardés | `SRC-FIB-006`, `SRC-FIB-007` | Remplacé |
| 11 | — | Ajouté : « Wisy Safety ne délivre pas ces certifications : leurs conditions sont fixées par chaque organisme » | — | Ajout de transparence |

## Reste à confirmer

- Rien de publié. Les liens CFOT (thefoa.org) et CCNA (cisco.com) sont contrôlés chaque mois par
  `.github/workflows/check-external-links.yml`. Cisco renvoie un 403 aux robots : la page a été vérifiée manuellement dans un navigateur.
- Images (« Firefly », générées par IA) : légendées « Illustration ».

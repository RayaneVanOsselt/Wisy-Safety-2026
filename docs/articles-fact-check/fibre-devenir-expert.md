# Fact-check — Devenir expert en fibre optique : compétences clés et débouchés professionnels

- **Origine** : https://wisysafety.be/devenir-expert-en-fibre-optique-competences-cles-et-debouches-professionnels/
  (archive `content/_legacy/devenir-expert-en-fibre-optique-competences-cles-et-debouches-professionnels.md`)
- **Publié** : `article-fibre-devenir-expert.html` (titre : « Devenir expert en fibre optique : compétences techniques et outils »),
  et en modale sur `formation-fibre-optique.html#article-fibre-devenir-expert`
- **Relu le** : 01/10/2026
- **Verdict** : **Publiable après corrections**. L'article a été réécrit. Toute la partie « débouchés, salaires, marché » a été retirée faute de source, et les valeurs techniques ont été recalées sur la FOA et l'UIT.

## Affirmations vérifiées

| # | Affirmation d'origine | Vérification | Source | Décision |
|---|---|---|---|---|
| 1 | Rôle et types d'expertise (ingénieur optique FTTH/FTTB/FTTO, raccordement, qualité, chef de projet) | Description de métier générale | — | Gardé, sans superlatif (« hautement qualifié » retiré) |
| 2 | Monomode / multimode, longueurs d'onde 850, 1310, 1550 nm | FOA : monomode, cœur d'environ 9 µm, lasers à 1310 et 1550 nm. Multimode : cœur de 50 ou 62,5 µm, 850 et 1300 nm. | `SRC-FIB-001` | Précisé (1300 nm ajouté pour le multimode) |
| 3 | « Atténuation 0.2-3.5 dB/km » | Non repris : la plage mélange monomode et multimode sans contexte de longueur d'onde | — | **Retiré** |
| 4 | Normes G.652, G.657 | UIT-T G.652 : dispersion nulle vers 1310 nm, utilisable vers 1550 nm. G.657 : moins sensible aux courbures (réseaux d'accès, bâtiments). | `SRC-FIB-002`, `SRC-FIB-003` | Gardé et expliqué |
| 5 | OM3 / OM4 | FOA : multimodes 50/125 optimisées pour les sources VCSEL à 850 nm | `SRC-FIB-008` | Précisé |
| 6 | « Normes & standards : ITU-T, IEC, TIA/EIA » | Liste sans contenu | — | Retiré (seules les recommandations citées restent) |
| 7 | Soudure : « perte < 0.1 dB », « professionnelle < 0.05 dB », « sans bulle d'air », « contrôle systématique à l'OTDR indispensable » | Non sourcé tel quel. La FOA donne des **valeurs typiques pour estimer un budget optique** : 0,3 dB par connecteur, 0,15 dB par épissure fusion monomode, 0,75 dB max (TIA-568) pour connecteurs pré-polis à épissure mécanique. L'OTDR est indiqué pour les longues liaisons avec épissures ou le dépannage, pas « systématiquement ». | `SRC-FIB-004` | Remplacé par les valeurs FOA (présentées comme valeurs de budget, pas comme seuils de qualité) |
| 8 | Soudeuse : « 7-15 secondes », « ±0.5 µm » | Non sourcé | — | **Retiré** |
| 9 | Connecteurs mécaniques « 0.3-0.5 dB » | Non sourcé (voir ligne 7 pour la valeur FOA) | — | **Retiré** |
| 10 | Boîtiers « IP68, -40 °C à +70 °C » | Non sourcé | — | **Retiré** |
| 11 | Instruments : OTDR, photomètre et source, VFL, microscope | FOA : microscope d'inspection 100 à 200×, nettoyage, source + photomètre (perte d'insertion exigée par les normes), VFL laser rouge visible, OTDR | `SRC-FIB-004`, `SRC-FIB-005` | Gardé et précisé ; doublon « réflectomètre » fusionné avec l'OTDR |
| 12 | Marques Exfo, Fluke, Anritsu | Citation de marques non nécessaire | — | **Retiré** |
| 13 | Parcours CAP / BTS / Bac+5 | Diplômes français | — | **Retiré** |
| 14 | Certifications Cisco CCNA/CCNP, Corning, Prysmian, « Fibre FTTH Expert », CompTIA Network+ | Seules CFOT (FOA) et CCNA (Cisco) ont été vérifiées | `SRC-FIB-006`, `SRC-FIB-007` | Réduit aux deux vérifiées, avec renvoi vers l'article « parcours » |
| 15 | « Plusieurs centaines de milliards d'euros », « 40 000 emplois en France », « 100 % croissance continue » | Aucune source | — | **Retiré** |
| 16 | Salaires moyens France 2025 (techniciens, ingénieurs) | Aucune source, et le marché visé est la France, pas la Belgique | — | **Retiré** |
| 17 | Tendances (10G/25G, IA, câbles sous-marins, smart cities), « moins d'énergie que le cuivre » | Aucune source | — | **Retiré** |

## Autres modifications

- La figure est légendée : « Illustration générée par intelligence artificielle : elle ne représente pas une épissure de fibre optique réelle. »
- Encadré « À retenir » : « Une liaison se juge à ses mesures » (comparaison perte mesurée / budget estimé, selon la FOA).

## Reste à confirmer

Rien de publié.

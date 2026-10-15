/* =========================================================================
   WISY SAFETY — Sessions de formation publiées (le SEUL endroit où l'on écrit une date)
   -------------------------------------------------------------------------
   Ce fichier alimente, en une seule fois : la page VCA Base (« Disponibilités »), la page Agenda, le
   parcours d'inscription, l'assistant Wisy et la recherche du site. Il ne faut JAMAIS écrire une date dans
   une page HTML.

   ► AUJOURD'HUI : une session (Nacelles élévatrices, 18/10/2026, 10 places). Sans session, les pages affichent
     « Consultez les prochaines disponibilités » avec les liens vers l'agenda et le contact. Aucune date n'est inventée.

   ► DEPUIS LES RÉSERVATIONS EN LIGNE : les sessions se gèrent dans la feuille Google « Réservations - Wisy Safety »
     (docs/README-RESERVATIONS.md). Ce fichier ne sert plus que de secours si la feuille ne répond pas.

   ► POUR PUBLIER UNE SESSION : ajoutez un bloc entre les crochets ci-dessous (une virgule entre deux blocs),
     enregistrez, mettez en ligne. Toutes les pages sont à jour. Guide pas à pas : docs/README-SESSIONS.md.

   Modèle d'une session (remplacez chaque valeur ; les champs marqués « facultatif » peuvent être omis) :

       {
         id: "AAAA-MM-JJ-langue",   // ex. la date et la langue de la session ; minuscules, chiffres, tirets ; unique
         training: "vca-base",      // identifiant de la formation (voir js/site-content.js)
         date: "AAAA-MM-JJ",        // jour de la session
         startTime: "HH:MM",        // facultatif — heure de début
         endTime: "HH:MM",          // facultatif — heure de fin
         language: "fr",            // facultatif — fr, nl, en…
         location: "…",             // facultatif — par défaut : le centre d'Anderlecht
         capacity: 12,              // facultatif — nombre de places au total (les places RESTANTES ne s'écrivent jamais
                                    // ici : la feuille de réservation les calcule à partir des réservations enregistrées)
         status: "open"             // facultatif — open (défaut), full (complet) ou cancelled (annulée)
       }

   Une session mal remplie n'est pas affichée (elle est ignorée) : la console du navigateur l'indique.
   Les sessions passées disparaissent toutes seules.

   Autre source possible (sans toucher au code) : une table Supabase — voir supabase/sessions.sql.
   ========================================================================= */
window.WISY_SESSIONS = {
  updatedAt: "2026-10-15",
  sessions: [
    /* Session demandée par Wisy Safety le 15/10/2026 — la même figure dans la feuille de réservation (même identifiant).
       Ce fichier ne sert que tant que la feuille n'est pas branchée (ou si elle ne répond pas) : il n'affiche que la
       capacité, jamais des places restantes. Une fois la feuille en service, les sessions se gèrent dans la feuille. */
    {
      id: "2026-10-18-nacelle",
      training: "nacelle",
      date: "2026-10-18",
      startTime: "10:00",
      endTime: "18:00",
      capacity: 10
    }
  ]
};

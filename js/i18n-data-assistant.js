/* =========================================================================
   WISY SAFETY — Traductions de l'ASSISTANT WISY (chrome de l'interface)
   Chargé sur toutes les pages (après i18n-data-common.js). Fusionne dans
   window.I18N. Ne contient que les libellés d'INTERFACE : le contenu des
   réponses (formations, coordonnées) provient de la base de connaissances.
   Fallback automatique vers "fr" pour toute langue non listée (voir i18n.js).
   ========================================================================= */
(function () {
  var I = window.I18N || (window.I18N = {});
  function m(lang, obj) { I[lang] = Object.assign(I[lang] || {}, obj); }

  /* ---------------- FRANÇAIS (langue source) ---------------- */
  m("fr", {
    "assistant.aria_open": "Ouvrir l’assistant Wisy Safety",
    "assistant.launcher_label": "Besoin d’aide ?",
    "assistant.header_title": "Assistant Wisy Safety",
    "assistant.header_subtitle": "Votre guide formation",
    "assistant.status": "Assistant disponible",
    "assistant.role_note": "Je réponds à partir des informations publiées sur ce site. Pour une situation particulière, notre équipe vous répond directement.",
    "assistant.related_label": "Questions associées\u00a0:",
    "assistant.see_help_center": "Voir dans le Centre d’aide",
    "assistant.minimize": "Réduire l’assistant",
    "assistant.close": "Fermer l’assistant",
    "assistant.new_chat": "Nouvelle conversation",
    "assistant.placeholder": "Posez votre question…",
    "assistant.send": "Envoyer le message",
    "assistant.hint_enter": "Entrée pour envoyer · Maj+Entrée = nouvelle ligne",
    "assistant.typing": "Wisy prépare votre réponse",
    "assistant.followups_label": "Vous pouvez aussi demander :",
    "assistant.error": "Une difficulté technique empêche momentanément l’assistant de répondre. Vous pouvez réessayer ou contacter directement Wisy Safety.",
    "assistant.retry": "Réessayer",
    "assistant.nudge": "Besoin d’aide pour trouver une formation ?",
    "assistant.nudge_close": "Fermer",
    "assistant.card_training": "Formation",
    "assistant.card_page": "Page",
    "assistant.card_signup": "S’inscrire",
    "assistant.card_view_training": "Voir la formation",
    "assistant.card_view_page": "Voir la page",
    "assistant.contact_title": "Contacter Wisy Safety",
    "assistant.contact_call": "Appeler",
    "assistant.contact_email": "Envoyer un e-mail",
    "assistant.contact_page": "Ouvrir la page contact",
    "assistant.sources": "Source",
    "assistant.you": "Vous"
  });

  /* ---------------- ENGLISH ---------------- */
  m("en", {
    "assistant.aria_open": "Open the Wisy Safety assistant",
    "assistant.launcher_label": "Need help?",
    "assistant.header_title": "Wisy Safety Assistant",
    "assistant.header_subtitle": "Your training guide",
    "assistant.status": "Assistant available",
    "assistant.role_note": "I answer from the information published on this site. For a specific situation, our team will reply directly.",
    "assistant.related_label": "Related questions:",
    "assistant.see_help_center": "See it in the Help centre",
    "assistant.minimize": "Minimise assistant",
    "assistant.close": "Close assistant",
    "assistant.new_chat": "New conversation",
    "assistant.placeholder": "Ask your question…",
    "assistant.send": "Send message",
    "assistant.hint_enter": "Enter to send · Shift+Enter = new line",
    "assistant.typing": "Wisy is preparing your answer",
    "assistant.followups_label": "You can also ask:",
    "assistant.error": "A technical issue is preventing the assistant from replying right now. You can try again or contact Wisy Safety directly.",
    "assistant.retry": "Try again",
    "assistant.nudge": "Need help finding a course?",
    "assistant.nudge_close": "Close",
    "assistant.card_training": "Course",
    "assistant.card_page": "Page",
    "assistant.card_signup": "Sign up",
    "assistant.card_view_training": "View the course",
    "assistant.card_view_page": "View the page",
    "assistant.contact_title": "Contact Wisy Safety",
    "assistant.contact_call": "Call",
    "assistant.contact_email": "Send an e-mail",
    "assistant.contact_page": "Open the contact page",
    "assistant.sources": "Source",
    "assistant.you": "You"
  });

  /* ---------------- NEDERLANDS ---------------- */
  m("nl", {
    "assistant.aria_open": "Open de Wisy Safety-assistent",
    "assistant.launcher_label": "Hulp nodig?",
    "assistant.header_title": "Wisy Safety-assistent",
    "assistant.header_subtitle": "Uw opleidingsgids",
    "assistant.status": "Assistent beschikbaar",
    "assistant.role_note": "Ik antwoord op basis van de informatie die op deze site is gepubliceerd. Voor een specifieke situatie antwoordt ons team u rechtstreeks.",
    "assistant.related_label": "Gerelateerde vragen:",
    "assistant.see_help_center": "Bekijk in het Helpcentrum",
    "assistant.minimize": "Assistent minimaliseren",
    "assistant.close": "Assistent sluiten",
    "assistant.new_chat": "Nieuw gesprek",
    "assistant.placeholder": "Stel uw vraag…",
    "assistant.send": "Bericht verzenden",
    "assistant.hint_enter": "Enter om te verzenden · Shift+Enter = nieuwe regel",
    "assistant.typing": "Wisy stelt uw antwoord op",
    "assistant.followups_label": "U kunt ook vragen:",
    "assistant.error": "Door een technisch probleem kan de assistent momenteel niet antwoorden. Probeer het opnieuw of neem rechtstreeks contact op met Wisy Safety.",
    "assistant.retry": "Opnieuw proberen",
    "assistant.nudge": "Hulp nodig bij het vinden van een opleiding?",
    "assistant.nudge_close": "Sluiten",
    "assistant.card_training": "Opleiding",
    "assistant.card_page": "Pagina",
    "assistant.card_signup": "Inschrijven",
    "assistant.card_view_training": "Bekijk de opleiding",
    "assistant.card_view_page": "Bekijk de pagina",
    "assistant.contact_title": "Contacteer Wisy Safety",
    "assistant.contact_call": "Bellen",
    "assistant.contact_email": "E-mail sturen",
    "assistant.contact_page": "Open de contactpagina",
    "assistant.sources": "Bron",
    "assistant.you": "U"
  });
})();

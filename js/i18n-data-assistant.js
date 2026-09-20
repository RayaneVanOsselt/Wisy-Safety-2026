/* =========================================================================
   WISY SAFETY — Traductions de l'ASSISTANT WISY (chrome de l'interface)
   Chargé sur toutes les pages (après i18n-data-common.js). Fusionne dans
   window.I18N. Ne contient que les libellés d'INTERFACE : le contenu des
   réponses (formations, coordonnées) provient de la base de connaissances.
   Fallback automatique vers "fr" pour toute langue non listée (voir i18n.js).

   ✎ Modifier les textes du LAUNCHER (bouton flottant + bulle) :
     assistant.launcher_title  → titre de la bulle           « Besoin d’aide ? »
     assistant.launcher_text   → sous-titre de la bulle      « Demandez à l’Assistant Wisy »
     assistant.launcher_open   → nom accessible du bouton (fermé)
     assistant.launcher_close  → nom accessible du bouton (assistant ouvert)
     assistant.launcher_desc   → description lue par les lecteurs d'écran
     assistant.badge_ai        → pastille « IA »
   ========================================================================= */
(function () {
  var I = window.I18N || (window.I18N = {});
  function m(lang, obj) { I[lang] = Object.assign(I[lang] || {}, obj); }

  /* ---------------- FRANÇAIS (langue source) ---------------- */
  m("fr", {
    /* Launcher (bouton flottant + bulle d'invitation) */
    "assistant.launcher_open": "Ouvrir l’Assistant Wisy",
    "assistant.launcher_close": "Fermer l’Assistant Wisy",
    "assistant.launcher_desc": "Assistant virtuel de Wisy Safety : il répond automatiquement à vos questions à partir des informations publiées sur ce site.",
    "assistant.launcher_title": "Besoin d’aide ?",
    "assistant.launcher_text": "Demandez à l’Assistant Wisy",
    "assistant.badge_ai": "IA",
    "assistant.bubble_dismiss": "Masquer ce message",
    "assistant.loading": "Ouverture de l’assistant…",
    "assistant.unavailable_title": "Assistant momentanément indisponible",
    "assistant.unavailable_text": "Réessayez dans un instant ou contactez l’équipe.",
    "assistant.unavailable_cta": "Nous contacter",
    /* Panneau */
    "assistant.header_title": "Assistant Wisy",
    "assistant.header_subtitle": "Assistance Wisy Safety",
    "assistant.role_note": "Je réponds à partir des informations publiées sur ce site. Pour une situation particulière, notre équipe vous répond directement.",
    "assistant.related_label": "Questions associées :",
    "assistant.see_help_center": "Voir dans le Centre d’aide",
    "assistant.close": "Fermer l’Assistant Wisy",
    "assistant.conversation": "Conversation",
    "assistant.new_chat": "Nouvelle conversation",
    "assistant.new_messages": "Nouveaux messages",
    "assistant.placeholder": "Posez votre question…",
    "assistant.send": "Envoyer le message",
    "assistant.hint_enter": "Entrée pour envoyer",
    "assistant.typing": "Wisy prépare votre réponse",
    "assistant.followups_label": "Vous pouvez aussi demander :",
    "assistant.error": "Une erreur est survenue. Réessayez dans quelques instants.",
    "assistant.error_offline": "Vous semblez hors connexion. Vérifiez votre connexion, puis réessayez.",
    "assistant.error_contact": "Contacter l’équipe",
    "assistant.retry": "Réessayer",
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
    "assistant.launcher_open": "Open the Wisy Assistant",
    "assistant.launcher_close": "Close the Wisy Assistant",
    "assistant.launcher_desc": "Wisy Safety virtual assistant: it answers your questions automatically, based on the information published on this site.",
    "assistant.launcher_title": "Need help?",
    "assistant.launcher_text": "Ask the Wisy Assistant",
    "assistant.badge_ai": "AI",
    "assistant.bubble_dismiss": "Dismiss this message",
    "assistant.loading": "Opening the assistant…",
    "assistant.unavailable_title": "Assistant temporarily unavailable",
    "assistant.unavailable_text": "Please try again in a moment or contact the team.",
    "assistant.unavailable_cta": "Contact us",
    "assistant.header_title": "Wisy Assistant",
    "assistant.header_subtitle": "Wisy Safety support",
    "assistant.role_note": "I answer from the information published on this site. For a specific situation, our team will reply directly.",
    "assistant.related_label": "Related questions:",
    "assistant.see_help_center": "See it in the Help centre",
    "assistant.close": "Close the Wisy Assistant",
    "assistant.conversation": "Conversation",
    "assistant.new_chat": "New conversation",
    "assistant.new_messages": "New messages",
    "assistant.placeholder": "Ask your question…",
    "assistant.send": "Send message",
    "assistant.hint_enter": "Enter to send",
    "assistant.typing": "Wisy is preparing your answer",
    "assistant.followups_label": "You can also ask:",
    "assistant.error": "Something went wrong. Please try again in a few moments.",
    "assistant.error_offline": "You seem to be offline. Check your connection, then try again.",
    "assistant.error_contact": "Contact the team",
    "assistant.retry": "Try again",
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
    "assistant.launcher_open": "Open de Wisy-assistent",
    "assistant.launcher_close": "Sluit de Wisy-assistent",
    "assistant.launcher_desc": "Virtuele assistent van Wisy Safety: hij beantwoordt uw vragen automatisch op basis van de informatie op deze site.",
    "assistant.launcher_title": "Hulp nodig?",
    "assistant.launcher_text": "Vraag het aan de Wisy-assistent",
    "assistant.badge_ai": "AI",
    "assistant.bubble_dismiss": "Dit bericht verbergen",
    "assistant.loading": "Assistent openen…",
    "assistant.unavailable_title": "Assistent tijdelijk niet beschikbaar",
    "assistant.unavailable_text": "Probeer het zo opnieuw of neem contact op met het team.",
    "assistant.unavailable_cta": "Neem contact op",
    "assistant.header_title": "Wisy-assistent",
    "assistant.header_subtitle": "Wisy Safety-ondersteuning",
    "assistant.role_note": "Ik antwoord op basis van de informatie die op deze site is gepubliceerd. Voor een specifieke situatie antwoordt ons team u rechtstreeks.",
    "assistant.related_label": "Gerelateerde vragen:",
    "assistant.see_help_center": "Bekijk in het Helpcentrum",
    "assistant.close": "Sluit de Wisy-assistent",
    "assistant.conversation": "Gesprek",
    "assistant.new_chat": "Nieuw gesprek",
    "assistant.new_messages": "Nieuwe berichten",
    "assistant.placeholder": "Stel uw vraag…",
    "assistant.send": "Bericht verzenden",
    "assistant.hint_enter": "Enter om te verzenden",
    "assistant.typing": "Wisy stelt uw antwoord op",
    "assistant.followups_label": "U kunt ook vragen:",
    "assistant.error": "Er is iets misgegaan. Probeer het over enkele ogenblikken opnieuw.",
    "assistant.error_offline": "U lijkt offline te zijn. Controleer uw verbinding en probeer het opnieuw.",
    "assistant.error_contact": "Contacteer het team",
    "assistant.retry": "Opnieuw proberen",
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

/* =========================================================================
   WISY SAFETY — Traductions COMMUNES des articles « Conseils & ressources VCA » (fil d'Ariane, sources, appel à l'action)
   Fusionne dans window.I18N (10 langues : fr, en, nl, af, ar, bg, de, ro, it, sl). Le français est le miroir
   EXACT du HTML servi (tests/i18n-static.test.js) ; contrôle : node scripts/check-i18n.js.
   ========================================================================= */
(function () {
  var I = window.I18N || (window.I18N = {});
  function m(lang, obj) { I[lang] = Object.assign(I[lang] || {}, obj); }

  /* ---------------- FRANÇAIS (langue source — miroir du HTML) ---------------- */
  m("fr", {
    "art.bc_formations": "Formations",
    "art.bc_home": "Accueil",
    "art.bc_label": "Fil d'Ariane",
    "art.bc_vca": "VCA Base",
    "art.cta_h": "Prêt à vous inscrire ?",
    "art.cta_see": "Voir la formation VCA Base",
    "art.cta_signup": "S'inscrire à la formation",
    "art.next_k": "À lire aussi",
    "art.published": "Publié le 26 septembre 2026",
    "art.skip": "Aller au contenu",
    "art.sources_h": "Sources officielles",
    "art.src_actiris": "Actiris — Formations pour les chercheurs d'emploi",
    "art.src_besacc": "BeSaCC-VCA — Sécurité de base (B-VCA)",
    "art.src_besacc_url": "https://www.besacc-vca.be/fr/basisveiligheid-b-vca/",
    "art.src_bf": "Bruxelles Formation — Trouver une formation",
    "art.src_constructiv": "Constructiv — FAQ formation de base en sécurité",
    "art.src_forem": "Forem (Wallonie)",
    "art.src_registre": "Registre central des diplômes VCA",
    "art.src_reglement": "Règlement général des examens VCA (PDF)",
    "art.src_spf": "SPF Emploi — Formation de base en sécurité",
    "art.src_vdab": "VDAB (Flandre)",
    "art.src_warn": "BeSaCC-VCA — Attention aux passes et diplômes non officiels",
    "art.src_warn_url": "https://www.besacc-vca.be/fr/waarschuwing-opgelet-met-niet-officiele-vca-pasjes-diplomas-en-certificaten/",
    "art.toc": "Dans cet article",
    "art.verified": "Informations vérifiées le 26 septembre 2026 auprès de ces sources. Elles ne remplacent pas l'avis de l'organisme concerné."
  });

  /* ---------------- ENGLISH ---------------- */
  m("en", {
    "art.bc_formations": "Training",
    "art.bc_home": "Home",
    "art.bc_label": "Breadcrumb",
    "art.bc_vca": "VCA Basic",
    "art.cta_h": "Ready to register?",
    "art.cta_see": "See the VCA Basic course",
    "art.cta_signup": "Register for the course",
    "art.next_k": "Also read",
    "art.published": "Published on 26 September 2026",
    "art.skip": "Skip to content",
    "art.sources_h": "Official sources",
    "art.src_actiris": "Actiris — Training for job seekers",
    "art.src_besacc": "BeSaCC-VCA — Basic safety (B-VCA)",
    "art.src_besacc_url": "https://www.besacc-vca.be/en/basisveiligheid-b-vca/",
    "art.src_bf": "Bruxelles Formation — Find a course",
    "art.src_constructiv": "Constructiv — Basic safety training FAQ",
    "art.src_forem": "Forem (Wallonia)",
    "art.src_registre": "VCA Central Diploma Register",
    "art.src_reglement": "General VCA exam regulations (PDF)",
    "art.src_spf": "SPF Emploi — Basic safety training",
    "art.src_vdab": "VDAB (Flanders)",
    "art.src_warn": "BeSaCC-VCA — Beware of unofficial passes and diplomas",
    "art.src_warn_url": "https://www.besacc-vca.be/en/waarschuwing-opgelet-met-niet-officiele-vca-pasjes-diplomas-en-certificaten/",
    "art.toc": "In this article",
    "art.verified": "Information checked on 26 September 2026 against these sources. It does not replace the advice of the organisation concerned."
  });

  /* ---------------- NEDERLANDS ---------------- */
  m("nl", {
    "art.bc_formations": "Opleidingen",
    "art.bc_home": "Home",
    "art.bc_label": "Kruimelpad",
    "art.bc_vca": "VCA Basis",
    "art.cta_h": "Klaar om u in te schrijven?",
    "art.cta_see": "Bekijk de opleiding VCA Basis",
    "art.cta_signup": "Inschrijven voor de opleiding",
    "art.next_k": "Lees ook",
    "art.published": "Gepubliceerd op 26 september 2026",
    "art.skip": "Ga naar de inhoud",
    "art.sources_h": "Officiële bronnen",
    "art.src_actiris": "Actiris — Opleidingen voor werkzoekenden",
    "art.src_besacc": "BeSaCC-VCA — Basisveiligheid (B-VCA)",
    "art.src_besacc_url": "https://www.besacc-vca.be/basisveiligheid-b-vca/",
    "art.src_bf": "Bruxelles Formation — Een opleiding zoeken",
    "art.src_constructiv": "Constructiv — FAQ basisopleiding veiligheid",
    "art.src_forem": "Forem (Wallonië)",
    "art.src_registre": "Centraal Diplomaregister VCA",
    "art.src_reglement": "Algemeen examenreglement VCA (PDF)",
    "art.src_spf": "SPF Emploi — Basisopleiding veiligheid",
    "art.src_vdab": "VDAB (Vlaanderen)",
    "art.src_warn": "BeSaCC-VCA — Let op voor niet-officiële pasjes en diploma's",
    "art.src_warn_url": "https://www.besacc-vca.be/waarschuwing-opgelet-met-niet-officiele-vca-pasjes-diplomas-en-certificaten/",
    "art.toc": "In dit artikel",
    "art.verified": "Informatie gecontroleerd op 26 september 2026 bij deze bronnen. Ze vervangt het advies van de betrokken instantie niet."
  });

  /* ---------------- AFRIKAANS ---------------- */
  m("af", {
    "art.bc_formations": "Opleidings",
    "art.bc_home": "Tuis",
    "art.bc_label": "Broodkrummelpad",
    "art.bc_vca": "VCA Basis",
    "art.cta_h": "Gereed om in te skryf?",
    "art.cta_see": "Sien die VCA Basis-opleiding",
    "art.cta_signup": "Skryf in vir die opleiding",
    "art.next_k": "Lees ook",
    "art.published": "Gepubliseer op 26 September 2026",
    "art.skip": "Gaan na die inhoud",
    "art.sources_h": "Amptelike bronne",
    "art.src_actiris": "Actiris — Opleiding vir werksoekers",
    "art.src_besacc": "BeSaCC-VCA — Basiese veiligheid (B-VCA)",
    "art.src_besacc_url": "https://www.besacc-vca.be/en/basisveiligheid-b-vca/",
    "art.src_bf": "Bruxelles Formation — Vind 'n opleiding",
    "art.src_constructiv": "Constructiv — Gereelde vrae oor basiese veiligheidsopleiding",
    "art.src_forem": "Forem (Wallonië)",
    "art.src_registre": "VCA Sentrale Diplomaregister",
    "art.src_reglement": "Algemene VCA-eksamenreëls (PDF)",
    "art.src_spf": "SPF Emploi — Basiese veiligheidsopleiding",
    "art.src_vdab": "VDAB (Vlaandere)",
    "art.src_warn": "BeSaCC-VCA — Wees op u hoede vir nie-amptelike kaarte en diplomas",
    "art.src_warn_url": "https://www.besacc-vca.be/en/waarschuwing-opgelet-met-niet-officiele-vca-pasjes-diplomas-en-certificaten/",
    "art.toc": "In hierdie artikel",
    "art.verified": "Inligting nagegaan op 26 September 2026 by hierdie bronne. Dit vervang nie die advies van die betrokke instansie nie."
  });

  /* ---------------- العربية (RTL) ---------------- */
  m("ar", {
    "art.bc_formations": "الدورات",
    "art.bc_home": "الرئيسية",
    "art.bc_label": "مسار التنقل",
    "art.bc_vca": "VCA الأساسي",
    "art.cta_h": "هل أنت مستعد للتسجيل؟",
    "art.cta_see": "عرض دورة VCA الأساسي",
    "art.cta_signup": "سجّل في الدورة",
    "art.next_k": "اقرأ أيضاً",
    "art.published": "نُشر في 26 سبتمبر 2026",
    "art.skip": "انتقل إلى المحتوى",
    "art.sources_h": "المصادر الرسمية",
    "art.src_actiris": "Actiris — دورات لطالبي العمل",
    "art.src_besacc": "BeSaCC-VCA — السلامة الأساسية (B-VCA)",
    "art.src_besacc_url": "https://www.besacc-vca.be/en/basisveiligheid-b-vca/",
    "art.src_bf": "Bruxelles Formation — ابحث عن دورة",
    "art.src_constructiv": "Constructiv — الأسئلة الشائعة حول التدريب الأساسي على السلامة",
    "art.src_forem": "Forem (والونيا)",
    "art.src_registre": "السجل المركزي لدبلومات VCA",
    "art.src_reglement": "اللائحة العامة لامتحانات VCA (PDF)",
    "art.src_spf": "SPF Emploi — التدريب الأساسي على السلامة",
    "art.src_vdab": "VDAB (فلاندرز)",
    "art.src_warn": "BeSaCC-VCA — احذر من البطاقات والدبلومات غير الرسمية",
    "art.src_warn_url": "https://www.besacc-vca.be/en/waarschuwing-opgelet-met-niet-officiele-vca-pasjes-diplomas-en-certificaten/",
    "art.toc": "في هذا المقال",
    "art.verified": "تم التحقق من المعلومات في 26 سبتمبر 2026 من هذه المصادر. وهي لا تحل محل رأي الجهة المعنية."
  });

  /* ---------------- БЪЛГАРСКИ ---------------- */
  m("bg", {
    "art.bc_formations": "Обучения",
    "art.bc_home": "Начало",
    "art.bc_label": "Навигационна пътека",
    "art.bc_vca": "VCA основи",
    "art.cta_h": "Готови ли сте да се запишете?",
    "art.cta_see": "Вижте обучението VCA основи",
    "art.cta_signup": "Запишете се за обучението",
    "art.next_k": "Прочетете още",
    "art.published": "Публикувано на 26 септември 2026 г.",
    "art.skip": "Към съдържанието",
    "art.sources_h": "Официални източници",
    "art.src_actiris": "Actiris — Обучения за търсещи работа",
    "art.src_besacc": "BeSaCC-VCA — Основна безопасност (B-VCA)",
    "art.src_besacc_url": "https://www.besacc-vca.be/en/basisveiligheid-b-vca/",
    "art.src_bf": "Bruxelles Formation — Намерете обучение",
    "art.src_constructiv": "Constructiv — ЧЗВ за основното обучение по безопасност",
    "art.src_forem": "Forem (Валония)",
    "art.src_registre": "Централен регистър на дипломите VCA",
    "art.src_reglement": "Общ правилник за изпитите VCA (PDF)",
    "art.src_spf": "SPF Emploi — Основно обучение по безопасност",
    "art.src_vdab": "VDAB (Фландрия)",
    "art.src_warn": "BeSaCC-VCA — Внимание към неофициални карти и дипломи",
    "art.src_warn_url": "https://www.besacc-vca.be/en/waarschuwing-opgelet-met-niet-officiele-vca-pasjes-diplomas-en-certificaten/",
    "art.toc": "В тази статия",
    "art.verified": "Информацията е проверена на 26 септември 2026 г. по тези източници. Тя не замества становището на съответната организация."
  });

  /* ---------------- DEUTSCH ---------------- */
  m("de", {
    "art.bc_formations": "Schulungen",
    "art.bc_home": "Startseite",
    "art.bc_label": "Brotkrumennavigation",
    "art.bc_vca": "VCA Grundlagen",
    "art.cta_h": "Bereit zur Anmeldung?",
    "art.cta_see": "Schulung VCA Grundlagen ansehen",
    "art.cta_signup": "Für die Schulung anmelden",
    "art.next_k": "Lesen Sie auch",
    "art.published": "Veröffentlicht am 26. September 2026",
    "art.skip": "Zum Inhalt springen",
    "art.sources_h": "Offizielle Quellen",
    "art.src_actiris": "Actiris — Weiterbildungen für Arbeitsuchende",
    "art.src_besacc": "BeSaCC-VCA — Basissicherheit (B-VCA)",
    "art.src_besacc_url": "https://www.besacc-vca.be/en/basisveiligheid-b-vca/",
    "art.src_bf": "Bruxelles Formation — Eine Schulung finden",
    "art.src_constructiv": "Constructiv — FAQ Sicherheitsgrundschulung",
    "art.src_forem": "Forem (Wallonien)",
    "art.src_registre": "Zentrales Diplomregister VCA",
    "art.src_reglement": "Allgemeines VCA-Prüfungsreglement (PDF)",
    "art.src_spf": "SPF Emploi — Sicherheitsgrundschulung",
    "art.src_vdab": "VDAB (Flandern)",
    "art.src_warn": "BeSaCC-VCA — Vorsicht vor nicht offiziellen Ausweisen und Diplomen",
    "art.src_warn_url": "https://www.besacc-vca.be/en/waarschuwing-opgelet-met-niet-officiele-vca-pasjes-diplomas-en-certificaten/",
    "art.toc": "In diesem Artikel",
    "art.verified": "Informationen am 26. September 2026 anhand dieser Quellen geprüft. Sie ersetzen nicht die Auskunft der zuständigen Stelle."
  });

  /* ---------------- ROMÂNĂ ---------------- */
  m("ro", {
    "art.bc_formations": "Cursuri",
    "art.bc_home": "Acasă",
    "art.bc_label": "Traseu de navigare",
    "art.bc_vca": "VCA de bază",
    "art.cta_h": "Sunteți gata să vă înscrieți?",
    "art.cta_see": "Vedeți cursul VCA de bază",
    "art.cta_signup": "Înscrieți-vă la formare",
    "art.next_k": "Citiți și",
    "art.published": "Publicat la 26 septembrie 2026",
    "art.skip": "Treceți la conținut",
    "art.sources_h": "Surse oficiale",
    "art.src_actiris": "Actiris — Formări pentru persoanele aflate în căutarea unui loc de muncă",
    "art.src_besacc": "BeSaCC-VCA — Securitate de bază (B-VCA)",
    "art.src_besacc_url": "https://www.besacc-vca.be/en/basisveiligheid-b-vca/",
    "art.src_bf": "Bruxelles Formation — Găsiți un curs",
    "art.src_constructiv": "Constructiv — Întrebări frecvente despre formarea de bază în securitate",
    "art.src_forem": "Forem (Valonia)",
    "art.src_registre": "Registrul central al diplomelor VCA",
    "art.src_reglement": "Regulamentul general al examenelor VCA (PDF)",
    "art.src_spf": "SPF Emploi — Formare de bază în securitate",
    "art.src_vdab": "VDAB (Flandra)",
    "art.src_warn": "BeSaCC-VCA — Atenție la cardurile și diplomele neoficiale",
    "art.src_warn_url": "https://www.besacc-vca.be/en/waarschuwing-opgelet-met-niet-officiele-vca-pasjes-diplomas-en-certificaten/",
    "art.toc": "În acest articol",
    "art.verified": "Informații verificate la 26 septembrie 2026 în aceste surse. Ele nu înlocuiesc avizul organismului în cauză."
  });

  /* ---------------- ITALIANO ---------------- */
  m("it", {
    "art.bc_formations": "Corsi",
    "art.bc_home": "Home",
    "art.bc_label": "Percorso di navigazione",
    "art.bc_vca": "VCA base",
    "art.cta_h": "Pronto a iscriverti?",
    "art.cta_see": "Vedi il corso VCA base",
    "art.cta_signup": "Iscriviti al corso",
    "art.next_k": "Leggi anche",
    "art.published": "Pubblicato il 26 settembre 2026",
    "art.skip": "Vai al contenuto",
    "art.sources_h": "Fonti ufficiali",
    "art.src_actiris": "Actiris — Formazione per chi cerca lavoro",
    "art.src_besacc": "BeSaCC-VCA — Sicurezza di base (B-VCA)",
    "art.src_besacc_url": "https://www.besacc-vca.be/en/basisveiligheid-b-vca/",
    "art.src_bf": "Bruxelles Formation — Trova un corso",
    "art.src_constructiv": "Constructiv — FAQ sulla formazione di base sulla sicurezza",
    "art.src_forem": "Forem (Vallonia)",
    "art.src_registre": "Registro centrale dei diplomi VCA",
    "art.src_reglement": "Regolamento generale degli esami VCA (PDF)",
    "art.src_spf": "SPF Emploi — Formazione di base sulla sicurezza",
    "art.src_vdab": "VDAB (Fiandre)",
    "art.src_warn": "BeSaCC-VCA — Attenzione a tessere e diplomi non ufficiali",
    "art.src_warn_url": "https://www.besacc-vca.be/en/waarschuwing-opgelet-met-niet-officiele-vca-pasjes-diplomas-en-certificaten/",
    "art.toc": "In questo articolo",
    "art.verified": "Informazioni verificate il 26 settembre 2026 su queste fonti. Non sostituiscono il parere dell'ente interessato."
  });

  /* ---------------- SLOVENŠČINA ---------------- */
  m("sl", {
    "art.bc_formations": "Usposabljanja",
    "art.bc_home": "Domov",
    "art.bc_label": "Drobtinice",
    "art.bc_vca": "VCA osnovni",
    "art.cta_h": "Ste se pripravljeni prijaviti?",
    "art.cta_see": "Poglejte usposabljanje VCA osnovni",
    "art.cta_signup": "Prijavite se na usposabljanje",
    "art.next_k": "Berite tudi",
    "art.published": "Objavljeno 26. septembra 2026",
    "art.skip": "Preskoči na vsebino",
    "art.sources_h": "Uradni viri",
    "art.src_actiris": "Actiris — Usposabljanja za iskalce zaposlitve",
    "art.src_besacc": "BeSaCC-VCA — Osnovna varnost (B-VCA)",
    "art.src_besacc_url": "https://www.besacc-vca.be/en/basisveiligheid-b-vca/",
    "art.src_bf": "Bruxelles Formation — Poiščite usposabljanje",
    "art.src_constructiv": "Constructiv — Pogosta vprašanja o osnovnem usposabljanju o varnosti",
    "art.src_forem": "Forem (Valonija)",
    "art.src_registre": "Centralni register diplom VCA",
    "art.src_reglement": "Splošni pravilnik o izpitih VCA (PDF)",
    "art.src_spf": "SPF Emploi — Osnovno usposabljanje o varnosti",
    "art.src_vdab": "VDAB (Flandrija)",
    "art.src_warn": "BeSaCC-VCA — Pozor na neuradne izkaznice in diplome",
    "art.src_warn_url": "https://www.besacc-vca.be/en/waarschuwing-opgelet-met-niet-officiele-vca-pasjes-diplomas-en-certificaten/",
    "art.toc": "V tem članku",
    "art.verified": "Informacije so bile 26. septembra 2026 preverjene v teh virih. Ne nadomeščajo mnenja pristojne organizacije."
  });
})();

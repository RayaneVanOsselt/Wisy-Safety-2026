/* =========================================================================
   WISY SAFETY — Assistant · Mascotte « Wisy » (SVG propriétaire)
   -------------------------------------------------------------------------
   Micro-personnage abstrait et professionnel — PAS un robot, pas d'emoji,
   pas de gros yeux. Fusion subtile de trois idées :
     • une bulle de conversation (le contour arrondi + pointe basse = queue) ;
     • une forme protectrice (silhouette de bouclier) ;
     • un guide (à l'intérieur : une « tête » + des bras ouverts = accueil,
       accompagnement).

   Palette stricte : Épinette (corps), Sarcelle (profondeur, dégradé),
   Crème (figure intérieure), Turquoise en MICRO-accent unique (étincelle
   de disponibilité). Le turquoise ne domine jamais.

   Le SVG est purement décoratif (aria-hidden) : le nom accessible est porté
   par le <button> du launcher. Les états sont pilotés par des classes sur
   l'élément racine (voir css/assistant.css) : is-thinking, is-error…

   Expose `window.WisyAssistant.Mascot.svg({ id, className })`.
   ========================================================================= */
(function (root) {
  "use strict";

  /**
   * Renvoie le markup SVG de la mascotte.
   * @param {Object} [o]
   * @param {string} [o.id]        suffixe unique pour les IDs de dégradé
   * @param {string} [o.className] classes additionnelles sur le <svg>
   */
  function svg(o) {
    o = o || {};
    var uid = o.id || "m";
    var cls = "wm " + (o.className || "");
    var gBody = "wmBody-" + uid;
    var gGlow = "wmGlow-" + uid;

    return (
      '<svg class="' + cls.trim() + '" viewBox="0 0 40 40" width="40" height="40" ' +
        'fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
        "<defs>" +
          '<linearGradient id="' + gBody + '" x1="20" y1="2.5" x2="20" y2="37.5" gradientUnits="userSpaceOnUse">' +
            '<stop offset="0" stop-color="#2A8477"/>' +   /* épinette éclaircie (haut) */
            '<stop offset="0.55" stop-color="#1F6F64"/>' + /* épinette (primaire) */
            '<stop offset="1" stop-color="#2F7D8C"/>' +    /* sarcelle (profondeur) */
          "</linearGradient>" +
          '<radialGradient id="' + gGlow + '" cx="0.32" cy="0.26" r="0.75">' +
            '<stop offset="0" stop-color="#F4FAF9" stop-opacity="0.30"/>' +
            '<stop offset="0.6" stop-color="#F4FAF9" stop-opacity="0"/>' +
          "</radialGradient>" +
        "</defs>" +

        /* Corps : bulle de conversation arrondie (squircle) avec une queue
           discrète en bas à gauche + un galbe protecteur. Path unique. */
        "<path class=\"wm-body\" d=\"" +
          "M19.5 3.2" +
          "C27.9 3.2 34.4 8.7 34.4 16.7" +           /* épaule haut-droite */
          "C34.4 24 29 29.4 21.2 30.3" +             /* flanc droit → bas */
          "C19 30.55 17.1 30.4 15.2 29.9" +          /* base, vers la gauche */
          "C13.4 32.8 10.9 34.4 7.6 34.9" +          /* queue vers le bas-gauche */
          "C9.4 32.6 9.9 30.6 9.3 28.7" +            /* retour intérieur de la queue */
          "C6.5 26.2 4.6 21.9 4.6 16.7" +            /* flanc gauche */
          "C4.6 8.7 11.1 3.2 19.5 3.2Z" +
          "\" fill=\"url(#" + gBody + ")\"/>" +

        /* Reflet doux (profondeur premium) */
        "<path class=\"wm-sheen\" d=\"" +
          "M19.5 3.2" +
          "C27.9 3.2 34.4 8.7 34.4 16.7" +
          "C34.4 24 29 29.4 21.2 30.3" +
          "C19 30.55 17.1 30.4 15.2 29.9" +
          "C13.4 32.8 10.9 34.4 7.6 34.9" +
          "C9.4 32.6 9.9 30.6 9.3 28.7" +
          "C6.5 26.2 4.6 21.9 4.6 16.7" +
          "C4.6 8.7 11.1 3.2 19.5 3.2Z" +
          "\" fill=\"url(#" + gGlow + ")\"/>" +

        /* Figure « guide » : une tête + des bras ouverts qui se relèvent
           (geste d'accueil / « je vous guide »), volontairement abstraite. */
        '<g class="wm-figure">' +
          '<circle class="wm-head" cx="19.2" cy="12.9" r="2.75" fill="#F4FAF9"/>' +
          '<path class="wm-arms" d="M12.3 22.2C13.2 18.7 16.1 17.4 19.2 17.4C22.3 17.4 25.2 18.7 26.1 22.2" ' +
            'stroke="#F4FAF9" stroke-width="2.75" stroke-linecap="round"/>' +
        "</g>" +

        /* Micro-accent turquoise unique : étincelle « disponible / guidage » */
        '<circle class="wm-spark" cx="27.6" cy="9.7" r="1.7" fill="#48D6C2"/>' +
      "</svg>"
    );
  }

  root.WisyAssistant = root.WisyAssistant || {};
  root.WisyAssistant.Mascot = { svg: svg };
})(typeof self !== "undefined" ? self : this);

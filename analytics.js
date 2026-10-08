// Mesure d'audience (PostHog), chargée uniquement après consentement.
// app.js signale les étapes du parcours par des événements DOM « chapitrr:* » ; ce fichier les traduit
// en événements PostHog. Aucune donnée saisie (prénom, email, réponses) n'est jamais transmise.
(() => {
  const POSTHOG_TOKEN = "phc_ya7zCyjV9whANdrC8MSYxxhYawisMntSWue5uHooGpsB"; // projet PostHog 298122
  const POSTHOG_HOST = "https://eu.i.posthog.com";
  const CONSENT_KEY = "chapitrr_consent";
  const CONSENT_MAX_AGE = 182 * 24 * 60 * 60 * 1000; // le choix est redemandé au bout de 6 mois
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"];
  const EVENTS = ["$pageview", "quiz_started", "quiz_question_answered", "quiz_completed", "signup_started", "signup_completed"];

  // Source de la visite, gardée en mémoire seulement jusqu'au consentement (rien n'est stocké avant)
  const params = new URLSearchParams(window.location.search);
  const utm = {};
  UTM_KEYS.forEach(key => {
    const value = params.get(key);
    if (value) utm[key] = value;
  });

  const sent = new Set(); // chaque événement n'est envoyé qu'une fois par page vue
  let consent = readConsent();
  let loaded = false;

  function readConsent() {
    try {
      const saved = JSON.parse(localStorage.getItem(CONSENT_KEY));
      const fresh = saved && Date.now() - saved.date < CONSENT_MAX_AGE;
      if (fresh && (saved.value === "granted" || saved.value === "denied")) return saved.value;
    } catch (error) {
      // stockage indisponible : le choix sera redemandé
    }
    return null;
  }

  function saveConsent(value) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ value, date: Date.now() }));
    } catch (error) {
      // le choix vaut alors pour cette page uniquement
    }
  }

  function loadPostHog() {
    if (loaded) {
      window.posthog.set_config({ disable_persistence: false });
    } else {
      loaded = true;
      // Snippet officiel PostHog : charge array.js en asynchrone et met les appels en file d'attente
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
      window.posthog.init(POSTHOG_TOKEN, {
        api_host: POSTHOG_HOST,
        defaults: "2026-05-30",
        person_profiles: "identified_only",
        capture_pageview: false, // $pageview est envoyé manuellement, une seule fois (pas de doublon sur les ancres)
        capture_pageleave: false,
        autocapture: false,
        capture_dead_clicks: false,
        capture_heatmaps: false,
        capture_exceptions: false,
        capture_performance: false,
        disable_session_recording: true,
        disable_surveys: true,
        advanced_disable_flags: true,
        // Seuls les événements du tunnel partent : aucun autre événement automatique de PostHog ($set, $opt_in…)
        before_send: event => (event && EVENTS.includes(event.event) ? event : null)
      });
    }
    // Lève un éventuel refus précédent, sans envoyer d'événement « $opt_in »
    window.posthog.opt_in_capturing({ captureEventName: false });
    // Dernière source connue : conservée par PostHog et ajoutée à tous les événements jusqu'à l'inscription
    if (Object.keys(utm).length) window.posthog.register(utm);
  }

  function stopPostHog() {
    if (!loaded) return;
    try {
      window.posthog.opt_out_capturing();
      window.posthog.set_config({ disable_persistence: true });
    } catch (error) {
      // PostHog absent : rien à arrêter
    }
    try {
      Object.keys(localStorage).filter(key => key.startsWith("ph_")).forEach(key => localStorage.removeItem(key));
    } catch (error) {
      // stockage indisponible : rien à effacer
    }
    const domain = window.location.hostname.replace(/^www\./, "");
    document.cookie.split(";").map(cookie => cookie.split("=")[0].trim()).filter(name => name.startsWith("ph_"))
      .forEach(name => {
        document.cookie = `${name}=; Max-Age=0; path=/`;
        document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`;
      });
  }

  function trackOnce(key, event = key, properties = {}) {
    if (consent !== "granted" || !loaded || sent.has(key)) return;
    sent.add(key);
    try {
      window.posthog.capture(event, properties);
    } catch (error) {
      // la mesure ne doit jamais gêner le site
    }
  }

  function start() {
    loadPostHog();
    trackOnce("$pageview");
  }

  // Bandeau de consentement
  const banner = document.createElement("div");
  banner.className = "consent";
  banner.setAttribute("role", "region");
  banner.setAttribute("aria-label", "Mesure d’audience");
  banner.hidden = true;
  banner.innerHTML = `
    <p class="consent-title">Mesure d’audience</p>
    <p>Avec votre accord, nous utilisons PostHog pour compter les visites et les étapes du parcours (quiz,
      inscription). Vos réponses et vos coordonnées ne sont jamais transmises.
      <a href="confidentialite.html#mesure-audience">En savoir plus</a></p>
    <div class="consent-actions">
      <button class="btn btn-small" type="button" data-consent="denied">Refuser</button>
      <button class="btn btn-small" type="button" data-consent="granted">Accepter</button>
    </div>`;
  document.body.append(banner);

  banner.addEventListener("click", event => {
    const button = event.target.closest("[data-consent]");
    if (!button) return;
    consent = button.dataset.consent;
    saveConsent(consent);
    banner.hidden = true;
    if (consent === "granted") start();
    else stopPostHog();
  });

  document.querySelectorAll("[data-consent-open]").forEach(link => {
    link.hidden = false;
    link.addEventListener("click", () => {
      banner.hidden = false;
      banner.querySelector("[data-consent]").focus();
    });
  });

  if (consent === "granted") start();
  else if (consent === null) banner.hidden = false;

  // Étapes du parcours
  document.addEventListener("chapitrr:quiz-started", () => trackOnce("quiz_started"));
  document.addEventListener("chapitrr:quiz-answered", event => {
    const questionNumber = Number(event.detail && event.detail.questionNumber);
    if (questionNumber) {
      trackOnce(`quiz_question_answered:${questionNumber}`, "quiz_question_answered", { question_number: questionNumber });
    }
  });
  document.addEventListener("chapitrr:quiz-completed", () => trackOnce("quiz_completed"));
  document.addEventListener("chapitrr:signup-completed", () => trackOnce("signup_completed"));

  const form = document.getElementById("signupForm");
  if (form) {
    const onSignupStarted = () => trackOnce("signup_started");
    form.addEventListener("input", onSignupStarted);
    form.addEventListener("change", onSignupStarted);
  }
})();

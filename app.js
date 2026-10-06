// chapitre. — v2
// Quiz (4 questions) → récapitulatif → inscription. Les réponses du quiz partent avec l'inscription.
//
// Chaque question nourrit une couche du matching :
// - couche 1, compatibilité individuelle (A ↔ B) : "affinites"
// - couche 2, compatibilité du groupe de quatre : "role", "ambiance", "lecture"
// Le formulaire ajoute l'intention (amour, amitié…) et le genre. L'attirance sera demandée dans l'application.

const questions = [
  {
    id: "role",
    label: "À table",
    title: "À table, vous êtes plutôt du genre à…",
    hint: "Une bonne table, c’est un mélange de rôles.",
    options: [
      { value: "lance", label: "Lancer les sujets" },
      { value: "questionne", label: "Poser mille questions" },
      { value: "ecoute", label: "Écouter… puis placer LA phrase" },
      { value: "fait-rire", label: "Faire rire toute la tablée" }
    ]
  },
  {
    id: "ambiance",
    label: "La soirée idéale",
    title: "Votre soirée idéale à quatre, c’est…",
    hint: "Pour réunir des gens qui ont envie de la même soirée.",
    options: [
      { value: "debat", label: "Refaire le monde jusqu’à pas d’heure" },
      { value: "confidences", label: "Des confidences, des vraies" },
      { value: "fous-rires", label: "Des fous rires en série" },
      { value: "decouverte", label: "Découvrir des univers loin du mien" }
    ]
  },
  {
    id: "affinites",
    label: "En commun",
    title: "Avec les trois autres, vous aimeriez partager…",
    hint: "Répondez spontanément.",
    options: [
      { value: "humour", label: "Le même humour" },
      { value: "valeurs", label: "Les mêmes valeurs" },
      { value: "passions", label: "Les mêmes passions" },
      { value: "surprise", label: "Pas grand-chose : surprenez-moi" }
    ]
  },
  {
    id: "lecture",
    label: "La lecture",
    title: "100 pages en 10 jours, pour vous c’est…",
    hint: "Soyez honnête, c’est entre nous.",
    options: [
      { value: "formalite", label: "Une formalité : je dévore" },
      { value: "faisable", label: "Faisable : je lis de temps en temps" },
      { value: "petit-defi", label: "Un petit défi : je lis rarement" },
      { value: "vrai-defi", label: "Un vrai défi… et c’est ce qui me tente" }
    ]
  }
];

const $ = id => document.getElementById(id);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const card = $("quizCard");
const stage = $("quizStage");
const count = $("quizCount");
const dots = document.querySelectorAll(".dots li");
const hint = $("quizHint");
const nextBtn = $("quizNext");
const footer = $("quizFooter");
const done = $("quizDone");
const answersList = $("quizAnswers");

let current = 0;
let selected = null;
let answers = [];

function renderQuestion() {
  const q = questions[current];
  selected = null;
  nextBtn.disabled = true;
  nextBtn.firstChild.textContent = current === questions.length - 1 ? "Voir mes réponses " : "Continuer ";
  count.textContent = `Question ${current + 1} sur ${questions.length}`;
  dots.forEach((dot, i) => dot.classList.toggle("is-on", i <= current));
  hint.textContent = q.hint;

  stage.innerHTML = `
    <p class="q-kicker hand">${String(current + 1).padStart(2, "0")} · ${q.label}</p>
    <h3 class="q-title" tabindex="-1">${q.title}</h3>
    <div class="options" role="group" aria-label="Réponses possibles">
      ${q.options.map((option, i) => `
        <button class="option" type="button" data-quiz-option data-index="${i}" aria-pressed="false">${option.label}</button>
      `).join("")}
    </div>
  `;
}

function showSummary() {
  count.textContent = "Terminé !";
  dots.forEach(dot => dot.classList.add("is-on"));
  answersList.innerHTML = answers.map((a, i) => `
    <li><span class="a-label">${questions[i].label}</span><span class="a-value">${a.answer}</span></li>
  `).join("");
  stage.hidden = true;
  footer.hidden = true;
  done.hidden = false;
  done.focus({ preventScroll: true });
  card.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

stage.addEventListener("click", event => {
  const option = event.target.closest("[data-quiz-option]");
  if (!option) return;
  stage.querySelectorAll("[data-quiz-option]").forEach(btn => {
    btn.setAttribute("aria-pressed", String(btn === option));
  });
  selected = Number(option.dataset.index);
  nextBtn.disabled = false;
});

nextBtn.addEventListener("click", () => {
  if (selected === null) return;
  const q = questions[current];
  const option = q.options[selected];
  answers[current] = { id: q.id, question: q.title, answer: option.label, value: option.value };

  if (current < questions.length - 1) {
    current += 1;
    renderQuestion();
    stage.querySelector(".q-title").focus({ preventScroll: true });
    return;
  }
  showSummary();
});

$("quizRestart").addEventListener("click", () => {
  current = 0;
  answers = [];
  done.hidden = true;
  stage.hidden = false;
  footer.hidden = false;
  renderQuestion();
  stage.querySelector(".q-title").focus({ preventScroll: true });
});

// Candidature : envoi à Formspree (adresse dans l'attribut action du formulaire), en deux temps :
// 1. la candidature (type = "candidature"), dès que le formulaire est validé ;
// 2. la réponse à la question sur le prix (type = "prix"), affichée juste après.
// Les deux envois partagent le même candidature_id pour les relier dans Formspree.
// Sans JavaScript, le formulaire part quand même en HTML classique (sans la question sur le prix).
// Tous les champs sont à plat (pas de JSON imbriqué) : chacun arrive séparément dans Formspree.
const form = $("signupForm");
const pricePanel = $("pricePanel");
const thanksPanel = $("thanksPanel");
const formError = $("signupError");
const priceError = $("priceError");
const priceButtons = [...pricePanel.querySelectorAll("[data-prix-reponse]")];
const submitBtn = form.querySelector('[type="submit"]');
const submitLabel = submitBtn.querySelector(".btn-label");
const submitText = submitLabel.textContent;

const LANDING_VERSION = "v2"; // pour comparer plusieurs versions de la landing dans Formspree
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
let candidate = null; // { id, prenom, email } une fois la candidature envoyée

const newCandidatureId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function buildCandidature(id) {
  const data = new FormData(form); // type, prenom, email, intention, genre, _gotcha
  const prenom = form.elements.prenom.value.trim();
  data.set("prenom", prenom);
  data.set("email", form.elements.email.value.trim());
  data.append("candidature_id", id);

  // Réponses du quiz, seulement celles qui ont été données
  const answered = answers.filter(Boolean);
  let quizStatus = "non fait";
  if (answered.length === questions.length) quizStatus = "complet";
  else if (answered.length > 0) quizStatus = "partiel";
  data.append("quiz_statut", quizStatus);
  answered.forEach(a => data.append(`quiz_${a.id}`, a.value));

  // Provenance du visiteur, si le lien partagé contient des paramètres UTM
  data.append("landing", LANDING_VERSION);
  const params = new URLSearchParams(window.location.search);
  UTM_KEYS.forEach(key => {
    const value = params.get(key);
    if (value) data.append(key, value);
  });

  data.append("_subject", `Nouvelle inscription : ${prenom}`); // objet de l'email de notification
  return data;
}

async function sendToFormspree(data) {
  const response = await fetch(form.action, {
    method: "POST",
    body: data,
    headers: { Accept: "application/json" }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const details = (body.errors || []).map(e => e.message).join(", ");
    throw new Error(details || `HTTP ${response.status}`);
  }
}

// fetch lève une TypeError quand le réseau ne répond pas ; les autres erreurs viennent de Formspree
const errorText = (error, what) => error instanceof TypeError
  ? `Oups, ${what} n’est pas partie. Vérifiez votre connexion et réessayez.`
  : `Oups, ${what} n’est pas partie. Réessayez dans un instant.`;

function showPanel(panel) {
  document.querySelectorAll(".js-prenom").forEach(el => { el.textContent = candidate.prenom; });
  form.hidden = true;
  pricePanel.hidden = panel !== pricePanel;
  thanksPanel.hidden = panel !== thanksPanel;
  panel.focus();
}

function setSending(sending) {
  submitBtn.disabled = sending;
  submitBtn.setAttribute("aria-busy", String(sending));
  submitLabel.textContent = sending ? "Envoi en cours…" : submitText;
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  formError.hidden = true;
  setSending(true);
  const id = newCandidatureId();
  const data = buildCandidature(id);

  try {
    await sendToFormspree(data);
  } catch (error) {
    console.error("Inscription non envoyée :", error);
    formError.textContent = errorText(error, "votre inscription");
    formError.hidden = false;
    setSending(false);
    return;
  }

  candidate = { id, prenom: data.get("prenom"), email: data.get("email") };
  showPanel(pricePanel);
});

// Question sur le prix : un clic suffit, la réponse part aussitôt
priceButtons.forEach(button => button.addEventListener("click", async () => {
  const prix = pricePanel.dataset.prix;
  priceError.hidden = true;
  priceButtons.forEach(b => {
    b.setAttribute("aria-pressed", String(b === button));
    b.disabled = true;
  });

  const data = new FormData();
  data.append("type", "prix");
  data.append("prenom", candidate.prenom);
  data.append("email", candidate.email);
  data.append("candidature_id", candidate.id);
  data.append("prix_teste", prix);
  data.append("prix_reponse", button.dataset.prixReponse);
  data.append("landing", LANDING_VERSION);
  data.append("_subject", `Prix ${prix} € : ${candidate.prenom} a répondu « ${button.textContent.trim()} »`);

  try {
    await sendToFormspree(data);
  } catch (error) {
    console.error("Réponse prix non envoyée :", error);
    priceError.textContent = errorText(error, "votre réponse");
    priceError.hidden = false;
    priceButtons.forEach(b => { b.disabled = false; });
    return;
  }

  showPanel(thanksPanel);
}));

// Surligneur et cercles qui se dessinent quand ils entrent à l'écran
const drawables = document.querySelectorAll("mark, [data-draw]");
if (!reduceMotion && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-drawn");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -12% 0px" });
  drawables.forEach(el => observer.observe(el));
} else {
  drawables.forEach(el => el.classList.add("is-drawn"));
}

// Slider du hero : la photo du dessus s'envole et passe sous la pile.
// Défilement auto pendant deux tours, sauf si l'utilisateur prend la main (ou préfère moins d'animations).
const slider = $("heroSlider");
const slides = [...slider.querySelectorAll(".polaroid")];
const sliderDots = [...document.querySelectorAll(".slider-dot")];
let activeSlide = 0;
let sliderTimer = null;
let sliderTicks = 0;
let userTookOver = false;

function showSlide(index) {
  if (index === activeSlide) return;
  const leaving = slides[activeSlide];
  if (!reduceMotion) {
    leaving.classList.remove("is-tossed");
    leaving.getBoundingClientRect(); // force un reflow pour relancer l'animation si on clique vite
    leaving.classList.add("is-tossed");
  }
  activeSlide = index;
  slides.forEach((slide, i) => {
    const pos = (i - activeSlide + slides.length) % slides.length;
    slide.dataset.pos = pos;
    slide.setAttribute("aria-hidden", String(pos !== 0));
  });
  sliderDots.forEach((dot, i) => dot.setAttribute("aria-pressed", String(i === activeSlide)));
}

const nextSlide = () => showSlide((activeSlide + 1) % slides.length);
const stopSlider = () => { clearInterval(sliderTimer); sliderTimer = null; };
const startSlider = () => {
  if (reduceMotion || userTookOver || sliderTimer || sliderTicks >= slides.length * 2) return;
  sliderTimer = setInterval(() => {
    nextSlide();
    sliderTicks += 1;
    if (sliderTicks >= slides.length * 2) stopSlider();
  }, 4000);
};
const takeOver = () => { userTookOver = true; stopSlider(); };

slides.forEach(slide => slide.addEventListener("animationend", () => slide.classList.remove("is-tossed")));
sliderDots.forEach((dot, i) => dot.addEventListener("click", () => { takeOver(); showSlide(i); }));
slider.addEventListener("click", () => { takeOver(); nextSlide(); });
[slider, ...sliderDots].forEach(el => {
  el.addEventListener("mouseenter", stopSlider);
  el.addEventListener("mouseleave", startSlider);
  el.addEventListener("focus", stopSlider);
  el.addEventListener("blur", startSlider);
});
startSlider();

// Bordure sous la barre de navigation une fois qu'on a scrollé
const nav = $("nav");
const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

renderQuestion();

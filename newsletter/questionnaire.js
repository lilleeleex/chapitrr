// Questionnaire de préparation de la 1re édition, envoyé par email aux inscrits.
// Lien personnel : ?id=<identifiant de l'inscrit>&prenom=<prénom> (prénom facultatif).
// Sans id, la page demande l'email d'inscription pour relier les réponses.
// Envoi à Formspree (adresse : attribut action du formulaire), avec des champs à plat.

const form = document.getElementById("qnForm");
const thanks = document.getElementById("qnThanks");
const identify = document.getElementById("qnIdentify");
const emailInput = document.getElementById("qnEmail");
const formError = document.getElementById("qnFormError");
const submitWrap = form.querySelector(".qn-submit");
const submitBtn = form.querySelector('[type="submit"]');
const submitLabel = submitBtn.querySelector(".btn-label");
const submitText = submitLabel.textContent;
const backBtn = document.getElementById("qnBack");
const nextBtn = document.getElementById("qnNext");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const params = new URLSearchParams(window.location.search);
const participant = (params.get("id") || "").trim().slice(0, 100);
const prenom = (params.get("prenom") || "").trim().slice(0, 40);

// La validation est gérée ici, question par question (sans JavaScript, celle du navigateur s'applique)
form.noValidate = true;

// Barre sous l'en-tête : elle avance avec la question affichée
const progress = document.querySelector(".qn-progress");
const progressFill = progress.querySelector(".qn-progress-fill");
function updateProgress() {
  if (form.hidden || !steps.length) return;
  const ratio = (index + 1) / steps.length;
  progressFill.style.transform = `scaleX(${ratio})`;
  const value = String(Math.round(ratio * 100));
  if (progress.getAttribute("aria-valuenow") !== value) progress.setAttribute("aria-valuenow", value);
}

if (participant) {
  document.getElementById("qnParticipant").value = participant;
  identify.hidden = true;
} else {
  emailInput.required = true;
}
if (prenom) {
  document.getElementById("qnHello").textContent = `Merci d’avoir rejoint l’aventure, ${prenom} !`;
  thanks.querySelector(".js-prenom").textContent = `, ${prenom}`;
}

// Questions à choix multiples :
// - une réponse « data-exclusive » (Peu importe, Un peu de tout, Flexibles) ne se combine pas avec les autres ;
// - limite de réponses (data-max, « jusqu'à 3 ») : les autres choix se grisent une fois la limite atteinte.
form.querySelectorAll(".qn-q").forEach(group => {
  const boxes = [...group.querySelectorAll('input[type="checkbox"]')];
  if (!boxes.length) return;
  const max = Number(group.dataset.max || boxes.length);
  group.addEventListener("change", event => {
    const changed = event.target;
    if (changed.checked) {
      boxes.forEach(box => {
        if (box !== changed && (changed.hasAttribute("data-exclusive") || box.hasAttribute("data-exclusive"))) box.checked = false;
      });
    }
    const count = boxes.filter(box => box.checked).length;
    boxes.forEach(box => { box.disabled = !box.checked && count >= max && !box.hasAttribute("data-exclusive"); });
  });
});

// Rencontrer des personnes « de ma génération » suppose de connaître sa tranche d'âge :
// « Je ne préfère pas répondre » (question 4) et « plutôt de ma génération » (question 5) s'excluent dès la sélection
const ageUnknown = form.querySelector('input[name="age"][value="non-precise"]');
const myGeneration = form.querySelector('input[name="generation"][value="ma-generation"]');
function syncAgeAndGeneration() {
  if (ageUnknown.checked && myGeneration.checked) myGeneration.checked = false; // état restauré par le navigateur
  myGeneration.disabled = ageUnknown.checked;
  ageUnknown.disabled = myGeneration.checked;
  document.getElementById("qnGenerationNote").hidden = !ageUnknown.checked;
  document.getElementById("qnAgeNote").hidden = !myGeneration.checked;
}
form.addEventListener("change", syncAgeAndGeneration);
syncAgeAndGeneration();

function setError(block, message) {
  const error = block.querySelector(".qn-error");
  if (!error) return; // question facultative (sujets à éviter)
  block.classList.toggle("is-invalid", Boolean(message));
  error.textContent = message;
  error.hidden = !message;
}

// Réévalue les questions en erreur à chaque réponse (une erreur peut dépendre d'une autre question)
form.addEventListener("change", () => {
  form.querySelectorAll(".qn-q.is-invalid").forEach(block => setError(block, errorFor(block)));
});
emailInput.addEventListener("input", () => {
  setError(identify, "");
  if (steps[index] !== identify) return;
  const ready = !errorFor(identify);
  nextBtn.disabled = !ready;
  submitBtn.disabled = !ready;
});

function errorFor(block) {
  if (block === identify) {
    if (participant) return "";
    if (!emailInput.value.trim()) return "Indique ton email d’inscription.";
    return emailInput.checkValidity() ? "" : "Cet email ne semble pas valide.";
  }
  const count = block.querySelectorAll("input:checked").length;
  if (block.hasAttribute("data-required") && !count) return "Choisis une réponse.";
  if (count < Number(block.dataset.min || 0)) return "Choisis au moins une réponse.";
  return "";
}

// Une question à la fois. Retour libre. Continuer seulement si la question affichée a déjà une réponse.
// La question facultative (sujets à éviter) n'en exige pas : on peut la passer.
const steps = [...form.querySelectorAll(".qn-identify, .qn-q")].filter(step => !step.hidden);
let index = 0;
document.querySelector(".qn").classList.add("is-wizard");

function makeGhost(previous, direction) {
  document.querySelector(".qn-ghost")?.remove();
  const ghost = previous.cloneNode(true);
  ghost.classList.remove("is-arriving", "is-from-back");
  ghost.classList.add("qn-ghost");
  if (direction < 0) ghost.classList.add("is-from-back");
  ghost.setAttribute("aria-hidden", "true");
  ghost.removeAttribute("id");
  ghost.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
  ghost.querySelectorAll("input, textarea, button, select").forEach(node => {
    node.disabled = true;
    node.removeAttribute("name");
  });
  return ghost;
}

function placeGhost(ghost, step) {
  form.appendChild(ghost);
  ghost.style.top = `${step.offsetTop}px`;
  ghost.style.left = `${step.offsetLeft}px`;
  ghost.style.width = `${step.offsetWidth}px`;
  ghost.addEventListener("animationend", event => {
    if (event.target !== ghost) return;
    ghost.remove();
  });
  window.setTimeout(() => ghost.remove(), 700);
}

function renderStep(direction) {
  const step = steps[index];
  const previous = direction && !reduceMotion
    ? steps.find(item => !item.hidden && item !== step)
    : null;
  const ghost = previous ? makeGhost(previous, direction) : null;
  const last = index === steps.length - 1;
  steps.forEach((item, i) => { item.hidden = i !== index; });
  step.classList.remove("is-arriving", "is-from-back");
  if (ghost) placeGhost(ghost, step);
  if (direction && !reduceMotion) {
    void step.offsetWidth;
    step.classList.add("is-arriving");
    if (direction < 0) step.classList.add("is-from-back");
  }
  submitWrap.classList.toggle("is-last", last);
  backBtn.hidden = index === 0;
  const ready = !errorFor(step);
  nextBtn.disabled = !ready;
  submitBtn.disabled = !ready;
  updateProgress();
  if (!direction) return;
  step.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  const field = step.querySelector("input:not(:disabled), textarea");
  if (field) field.focus({ preventScroll: true });
}

function goNext() {
  const message = errorFor(steps[index]);
  setError(steps[index], message);
  if (message || index >= steps.length - 1) return;
  index += 1;
  renderStep(1);
}

function goBack() {
  if (index === 0) return;
  index -= 1;
  renderStep(-1);
}

backBtn.addEventListener("click", goBack);
nextBtn.addEventListener("click", goNext);
form.addEventListener("change", () => {
  const ready = !errorFor(steps[index]);
  nextBtn.disabled = !ready;
  submitBtn.disabled = !ready;
});
renderStep(false);

// Renvoie la première question sans réponse, dans l'ordre de la page
function validate() {
  let firstInvalid = null;
  form.querySelectorAll(".qn-identify, .qn-q").forEach(block => {
    const message = errorFor(block);
    setError(block, message);
    if (message && !firstInvalid) firstInvalid = block;
  });
  return firstInvalid;
}

function buildAnswers() {
  const raw = new FormData(form);
  const data = new FormData();
  const id = participant || emailInput.value.trim();
  data.append("type", "questionnaire");
  data.append("participant", id);
  data.append("identification", participant ? "lien" : "email");
  if (prenom) data.append("prenom", prenom);
  // Les choix multiples sont regroupés dans une seule colonne, séparés par des virgules
  ["genres", "conversation", "temps_libres", "qualites"].forEach(name => data.append(name, raw.getAll(name).join(", ")));
  ["ambiance", "age", "generation", "secteur", "enfants", "statut", "energie"].forEach(name => data.append(name, raw.get(name)));
  data.append("sujets_a_eviter", String(raw.get("sujets_a_eviter") || "").trim());
  data.append("disponibilites", raw.getAll("disponibilites").join(", "));
  data.append("participation", raw.get("participation"));
  data.append("_gotcha", raw.get("_gotcha") || "");
  data.append("_subject", `Questionnaire : ${prenom ? `${prenom} (${id})` : id}`);
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

function setSending(sending) {
  submitBtn.disabled = sending;
  submitBtn.setAttribute("aria-busy", String(sending));
  submitLabel.textContent = sending ? "Envoi en cours…" : submitText;
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  formError.hidden = true;
  if (index < steps.length - 1) {
    goNext();
    return;
  }

  const invalid = validate();
  if (invalid) {
    const target = steps.indexOf(invalid);
    const direction = Math.sign(target - index) || 1;
    index = target;
    renderStep(direction);
    setError(invalid, errorFor(invalid));
    return;
  }

  setSending(true);
  try {
    await sendToFormspree(buildAnswers());
  } catch (error) {
    console.error("Questionnaire non envoyé :", error);
    // fetch lève une TypeError quand le réseau ne répond pas ; les autres erreurs viennent de Formspree
    formError.textContent = error instanceof TypeError
      ? "Oups, tes réponses ne sont pas parties. Vérifie ta connexion et réessaie."
      : "Oups, tes réponses ne sont pas parties. Réessaie dans un instant.";
    formError.hidden = false;
    setSending(false);
    return;
  }

  form.hidden = true;
  progress.hidden = true;
  thanks.hidden = false;
  thanks.focus({ preventScroll: true });
  thanks.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
});

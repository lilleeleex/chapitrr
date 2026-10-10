// Questionnaire de préparation de la 1re édition, envoyé par email aux inscrits.
// Lien personnel : ?id=<identifiant de l'inscrit>&prenom=<prénom> (prénom facultatif).
// Sans id, la page demande l'email d'inscription pour relier les réponses.
// Envoi à Formspree (adresse : attribut action du formulaire), avec des champs à plat.

const form = document.getElementById("qnForm");
const thanks = document.getElementById("qnThanks");
const identify = document.getElementById("qnIdentify");
const emailInput = document.getElementById("qnEmail");
const formError = document.getElementById("qnFormError");
const submitBtn = form.querySelector('[type="submit"]');
const submitLabel = submitBtn.querySelector(".btn-label");
const submitText = submitLabel.textContent;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const params = new URLSearchParams(window.location.search);
const participant = (params.get("id") || "").trim().slice(0, 100);
const prenom = (params.get("prenom") || "").trim().slice(0, 40);

// La validation est gérée ici, question par question (sans JavaScript, celle du navigateur s'applique)
form.noValidate = true;

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
// « Je préfère ne pas répondre » (question 4) et « plutôt de ma génération » (question 5) s'excluent dès la sélection
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
emailInput.addEventListener("input", () => setError(identify, ""));

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
  ["genres", "conversation"].forEach(name => data.append(name, raw.getAll(name).join(", ")));
  ["ambiance", "age", "generation"].forEach(name => data.append(name, raw.get(name)));
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

  const invalid = validate();
  if (invalid) {
    invalid.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    invalid.querySelector("input, textarea").focus({ preventScroll: true });
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
  thanks.hidden = false;
  thanks.focus({ preventScroll: true });
  thanks.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
});

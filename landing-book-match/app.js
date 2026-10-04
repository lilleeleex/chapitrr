const questions = [
  {
    kicker: "01 · LA RENCONTRE",
    title: "Quel genre de rencontre vous donne vraiment envie ?",
    hint: "Choisissez la réponse qui vous ressemble le plus.",
    options: [
      "Une conversation qui dure jusqu'à 2h du matin",
      "Un fou rire avec quelqu'un que je viens de rencontrer",
      "Une discussion qui me fait voir les choses autrement",
      "Je ne sais pas encore"
    ]
  },
  {
    kicker: "02 · LE DÉFI",
    title: "Vous avez 10 jours et un livre de 100 pages à lire. Ça vous semble…",
    hint: "Votre première réaction est probablement la bonne.",
    options: [
      "Parfait",
      "Tout à fait accessible",
      "Un peu ambitieux",
      "Je ne lis jamais"
    ]
  },
  {
    kicker: "03 · L'ALCHIMIE",
    title: "Vous préférez rencontrer quelqu'un…",
    hint: "Il n'y a pas de mauvais choix.",
    options: [
      "Qui me ressemble",
      "Qui me surprend",
      "Un peu des deux",
      "Je préfère ne pas savoir"
    ]
  },
  {
    kicker: "04 · LA CONVERSATION",
    title: "De quoi aimeriez-vous parler avec quelqu'un que vous venez de rencontrer ?",
    hint: "Choisissez ce qui vous attire spontanément.",
    options: [
      "De ce qu'il ou elle aime",
      "De ses projets",
      "De ses voyages",
      "D'une histoire qui nous a marqué"
    ]
  }
];

let current = 0;
let selected = null;
const answers = [];

const stage = document.getElementById("questionStage");
const progressLabel = document.getElementById("progressLabel");
const progressFill = document.getElementById("progressFill");
const nextBtn = document.getElementById("nextBtn");
const hint = document.getElementById("questionHint");

function renderQuestion() {
  selected = null;
  nextBtn.disabled = true;
  const q = questions[current];
  progressLabel.textContent = `${String(current + 1).padStart(2, "0")} / ${String(questions.length).padStart(2, "0")}`;
  progressFill.style.width = `${((current + 1) / questions.length) * 100}%`;
  hint.textContent = q.hint;
  nextBtn.querySelector("span:first-child").textContent =
    current === questions.length - 1 ? "Découvrir la suite" : "Continuer";

  stage.innerHTML = `
    <div class="question-content">
      <div class="question-kicker">${q.kicker}</div>
      <h3 class="question-title">${q.title}</h3>
      <div class="options">
        ${q.options.map((option, i) => `
          <button class="option" data-index="${i}" type="button">${option}</button>
        `).join("")}
      </div>
    </div>
  `;

  stage.querySelectorAll(".option").forEach(btn => {
    btn.addEventListener("click", () => {
      stage.querySelectorAll(".option").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selected = Number(btn.dataset.index);
      nextBtn.disabled = false;
    });
  });
}

nextBtn.addEventListener("click", () => {
  if (selected === null) return;
  answers[current] = {
    question: questions[current].title,
    answer: questions[current].options[selected]
  };

  if (current < questions.length - 1) {
    current++;
    renderQuestion();
    return;
  }

  document.getElementById("concept").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelectorAll("[data-scroll-to]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.getElementById(btn.dataset.scrollTo).scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
});

document.getElementById("signupForm").addEventListener("submit", e => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  document.getElementById("successName").textContent = form.get("firstName");
  e.currentTarget.style.display = "none";
  document.getElementById("success").classList.add("visible");

  // Replace this with your API call / analytics event.
  console.log("Landing page signup:", Object.fromEntries(form.entries()), { answers });
});

renderQuestion();

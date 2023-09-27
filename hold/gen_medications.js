const fs = require("fs");
const YAML = require("yaml");

const symptomLocations = [
  {
    value: "prescription_pain_medication",
    text: "Prescription pain medication (e.g., tramadol; percocet)",
  },
  {
    value: "otc_pain_medication",
    text: "Non-prescription/OTC pain medication (NSAIDs; acetaminophen, aspirin)",
  },
  { value: "antidepressant", text: "Antidepressant" },
  { value: "anxiolytic", text: "Anxiolytic (anti-anxiety)" },
  { value: "antimuscarinic", text: "Antimuscarinic/anti-spasmodic" },
  { value: "antiemetic", text: "Antiemetic (nausea)" },
  { value: "h2_blockers", text: "H2 Blockers (e.g., famotidine, Ranitidine)" },
  {
    value: "ppis",
    text: "Proton Pump Inhibitors (PPIs) (e.g., Omeprazole, Esomeprazole)",
  },
  { value: "laxatives", text: "Laxatives" },
  { value: "antidiarrheal", text: "Antidiarrheal" },
  { value: "ibs", text: "Irritable bowel syndrome medication" },
  {
    value: "ibd",
    text: "Inflammatory bowel disease medication (including ulcerative colitis, crohn's disease)",
  },
  {
    value: "gnrh_analogs",
    text: "GnRH analogs (e.g., Elagolix, Leuprolide, Nafarelin)",
  },
  { value: "aromatase_inhibitors", text: "Aromatase Inhibitors" },
  { value: "progestins", text: "Progestins (e.g., Danazol)" },
  { value: "other_hormones", text: "Other hormone medication" },
  { value: "oral_contraceptive", text: "Oral contraceptive pill" },
  { value: "other", text: "Other" },
];

const alphabet = [
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "aa",
  "ab",
  "ac",
];

const questions = symptomLocations.flatMap((loc, i) => [
  {
    key: `14_sub_1_${loc.value}`,
    question: `14${
      alphabet[i]
    }. What was the effect of ${loc.text.toLowerCase()} on your health or symptoms?`,
    type: "SINGLE_CHOICE",
    triggers: [
      {
        action: { type: "SHOW" },
        condition: [
          {
            section: "health_symptom_management",
            question: "14",
            operator: "INCLUDES",
            value: loc.value,
          },
        ],
      },
    ],
    options: [
      { value: "helped", text: "Helped" },
      { value: "no_effect", text: "No effect/didn't help" },
      { value: "worsened_symptoms", text: "Worsened symptoms" },
      { value: "unsure", text: "Unsure" },
    ],
  },
]);

fs.writeFileSync("./medications.yaml", YAML.stringify(questions));

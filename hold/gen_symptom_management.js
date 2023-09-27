const fs = require("fs");
const YAML = require("yaml");

const symptomLocations = [
  { value: "heat_therapy", text: "Heat therapy (e.g., heat pack)" },
  { value: "cold_therapy", text: "Cold therapy (e.g., ice pack)" },
  { value: "tens", text: "TENS (transcutaneous electrical nerve stimulation)" },
  { value: "psychotherapy", text: "Psychotherapy (e.g., talk therapy)" },
  { value: "acupuncture_massage", text: "Acupuncture or massage" },
  { value: "alcohol", text: "Alcohol" },
  { value: "resting", text: "Resting" },
  { value: "sleeping", text: "Sleeping" },
  { value: "meditation_breathing", text: "Meditation or breathing exercises" },
  { value: "stretching", text: "Stretching" },
  { value: "pelvic_floor_therapy", text: "Pelvic floor therapy" },
  { value: "physical_therapy", text: "Physical therapy" },
  { value: "cannabinoids", text: "Medical marijuana, CBD oil" },
  { value: "herbal_supplements", text: "Herbal supplements" },
  { value: "other", text: "Other" },
];

const alphabet = "abcdefghijklmnopqrstuvwxyz"; // Omit a because that's the location Q

const questions = symptomLocations.flatMap((loc, i) => [
  {
    key: `13_sub_1_${loc.value}`,
    question: `13${
      alphabet[i]
    }. What was the effect of ${loc.text.toLowerCase()} on your health or symptoms?`,
    type: "SINGLE_CHOICE",
    triggers: [
      {
        action: { type: "SHOW" },
        condition: [
          {
            section: "health_symptom_management",
            question: "13",
            operator: "INCLUDES",
            value: loc.value,
          },
        ],
      },
    ],
    options: [
      {
        value: "helped",
        text: "Helped",
      },
      {
        value: "no_effect",
        text: "No effect",
      },
      {
        value: "made_worse",
        text: "Made symptoms worse",
      },
      {
        value: "unsure",
        text: "Unsure",
      },
    ],
  },
]);

fs.writeFileSync("./management_techniques.yaml", YAML.stringify(questions));

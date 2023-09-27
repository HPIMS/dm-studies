const fs = require("fs");
const YAML = require("yaml");

const symptomLocations = [
  { value: "fatigue", text: "Fatigue" },
  { value: "headache", text: "Headache" },
  { value: "hot_flashes", text: "Hot flashes" },
  { value: "fever", text: "Fever" },
  {
    value: "touch_sensitivity",
    text: "Touch sensitivity (e.g., intolerance to clothing)",
  },
  { value: "itching", text: "Itching" },
  { value: "sweating", text: "Sweating" },
  { value: "physical_numbness", text: "Physical numbness" },
  { value: "jitters", text: "Jitters" },
];

const alphabet = "bcdefghijklmnopqrstuvwxyz"; // Omit a because that's the location Q

const questions = symptomLocations.flatMap((loc, i) => [
  {
    key: `3_sub_2_${loc.value}`,
    question: `3${
      alphabet[i]
    }. Rate the severity of the ${loc.text.toLowerCase()} symptoms.`,
    type: "SINGLE_CHOICE",
    triggers: [
      {
        action: { type: "SHOW" },
        condition: [
          {
            section: "health_symptoms",
            question: "3_sub_1",
            operator: "INCLUDES",
            value: loc.value,
          },
        ],
      },
    ],
    options: [
      { value: "mild", text: "Mild" },
      { value: "moderate", text: "Moderate" },
      { value: "severe", text: "Severe" },
    ],
  },
]);

fs.writeFileSync("./other.yaml", YAML.stringify(questions));

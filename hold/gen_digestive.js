const fs = require("fs");
const YAML = require("yaml");

const symptomLocations = [
  { value: "heartburn", text: "Heartburn" },
  { value: "reflux", text: "Reflux" },
  { value: "nausea", text: "Nausea" },
  { value: "vomiting", text: "Vomiting" },
  { value: "indigestion", text: "Indigestion" },
  { value: "difficulty_swallowing", text: "Difficulty swallowing" },
  { value: "upset_stomach", text: "Upset stomach" },
  { value: "belly_pain", text: "Belly pain" },
  { value: "bloating", text: "Bloating" },
  { value: "gas", text: "Gas" },
  { value: "endo_belly", text: "Endo belly" },
  { value: "diarrhea", text: "Loose stools/diarrhea" },
  { value: "painful_bowel_movement", text: "Painful bowel movement" },
  { value: "blood_in_stool", text: "Blood in stool" },
  { value: "unable_to_urinate", text: "Unable to urinate" },
  { value: "painful_urination", text: "Painful urination" },
  { value: "frequent_urination", text: "Frequent urination" },
];

const alphabet = "bcdefghijklmnopqrstuvwxyz"; // Omit a because that's the location Q

const questions = symptomLocations.flatMap((loc, i) => [
  {
    key: `2_sub_2_${loc.value}`,
    question: `2${
      alphabet[i]
    }. Rate the severity of the ${loc.text.toLowerCase()} symptoms.`,
    type: "SINGLE_CHOICE",
    triggers: [
      {
        action: { type: "SHOW" },
        condition: [
          {
            section: "health_symptoms",
            question: "2_sub_1",
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

fs.writeFileSync("./digestive.yaml", YAML.stringify(questions));

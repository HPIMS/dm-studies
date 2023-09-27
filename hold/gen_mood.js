const fs = require("fs");
const YAML = require("yaml");

const symptomLocations = [
  { value: "fearful", text: "Fearful" },
  { value: "nervous", text: "Nervous" },
  { value: "worried", text: "Worried" },
  { value: "overwhelmed", text: "Overwhelmed" },
  { value: "uneasy", text: "Uneasy" },
  { value: "helpless", text: "Helpless" },
  { value: "depressed", text: "Depressed" },
  { value: "hopeless", text: "Hopeless" },
  { value: "sad", text: "Sad" },
  { value: "lonely", text: "Lonely" },
  { value: "isolated", text: "Isolated" },
  { value: "restless", text: "Restless" },
  { value: "angry", text: "Angry" },
  { value: "frustrated", text: "Frustrated" },
  { value: "stressed", text: "Stressed" },
  { value: "happy", text: "Happy" },
  { value: "calm_relaxed", text: "Calm/relaxed" },
  { value: "excited", text: "Excited" },
  { value: "hopeful", text: "Hopeful" },
  { value: "determined", text: "Determined" },
  { value: "confident", text: "Confident" },
  { value: "strong", text: "Strong" },
  { value: "productive", text: "Productive" },
  { value: "social", text: "Social" },
  { value: "active", text: "Active" },
  { value: "attentive", text: "Attentive" },
  { value: "interested", text: "Interested" },
];

const alphabet = "abcdefghijklmnopqrstuvwxyz";

const questions = symptomLocations.flatMap((loc, i) => [
  {
    key: `5_sub_1_${loc.value}`,
    question: `2${
      alphabet[i]
    }. How intense is the ${loc.text.toLowerCase()} feeling?`,
    type: "SINGLE_CHOICE",
    triggers: [
      {
        action: { type: "SHOW" },
        condition: [
          {
            section: "mood",
            question: "5",
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

fs.writeFileSync("./mood.yaml", YAML.stringify(questions));

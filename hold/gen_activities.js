const fs = require("fs");
const YAML = require("yaml");

const symptomLocations = [
  {
    value: "self_care",
    text: "Self-care (e.g., washing, dressing, use toilet)",
  },
  { value: "working_studying", text: "Working or studying" },
  { value: "chores", text: "Chores (e.g., cleaning, preparing food)" },
  { value: "errands", text: "Running errands (e.g., shopping)" },
  { value: "walking_about", text: "Walking about" },
  { value: "stairs", text: "Going up/down stairs" },
  {
    value: "other_physical_mobility",
    text: "Other physical mobility (e.g., kneeling, jumping, stretching, sitting down)",
  },
  { value: "sleep", text: "Sleep" },
  { value: "intercourse", text: "Intercourse" },
  {
    value: "cognition",
    text: "Cognition (e.g., focusing, thinking, planning)",
  },
  { value: "physical_exercise", text: "Physical exercise" },
  {
    value: "commuting",
    text: "Commuting (e.g., taking public transportation, driving)",
  },
  {
    value: "social_activities",
    text: "social roles and activities (e.g., family, friends, leisure activities)",
  },
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
    key: `8_sub_2_${loc.value}`,
    question: `8${
      alphabet[i]
    }. How severe was the effect on ${loc.text.toLowerCase()}.`,
    type: "SINGLE_CHOICE",
    triggers: [
      {
        action: { type: "SHOW" },
        condition: [
          {
            section: "daily_activities",
            question: "8_sub_1",
            operator: "INCLUDES",
            value: loc.value,
          },
        ],
      },
    ],
    options: [
      {
        value: "little_difficulty",
        text: "Little difficulty",
      },
      {
        value: "some_difficulty",
        text: "Some difficulty",
      },
      {
        value: "severe_difficulty",
        text: "Severe difficulty",
      },
      {
        value: "unable_to_do",
        text: "Unable to do",
      },
    ],
  },
]);

fs.writeFileSync("./activities.yaml", YAML.stringify(questions));

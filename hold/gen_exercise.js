const fs = require("fs");
const YAML = require("yaml");

const symptomLocations = [
  {
    value: "cardiovascular",
    text: "Cardiovascular (e.g., walking, jogging, swimming, etc)",
  },
  {
    value: "body_weight_strength_training",
    text: "Body weight strength training (including calisthenics)",
  },
  {
    value: "weights_strength_training",
    text: "Strength training with weights (e.g., lifting)",
  },
  { value: "stretching", text: "Stretching" },
  { value: "yoga", text: "Yoga" },
  { value: "pilates_barre", text: "Pilates or barre fitness" },
  { value: "dance", text: "Dance (e.g., ballet, modern, ballroom)" },
  { value: "gym_fitness", text: "Gym fitness (e.g., steps, aerobics; TRX)" },
  { value: "team_sports", text: "Team sports (e.g., basketball; soccer)" },
  { value: "other", text: "Other" },
];

const alphabet = "bcdefghijklmnopqrstuvwxyz"; // Omit a because that's the location Q

const questions = symptomLocations.flatMap((loc, i) => [
  {
    key: `12_sub_2_${loc.value}`,
    question: `12${
      alphabet[i]
    } (part 1). How long was your ${loc.text.toLowerCase()} exercise session?`,
    type: "DURATION",
    triggers: [
      {
        action: { type: "SHOW" },
        condition: [
          {
            section: "physical_activity_exercise",
            question: "12_sub_1",
            operator: "INCLUDES",
            value: loc.value,
          },
        ],
      },
    ],
    hours: true,
    minutes: true,
    hoursPlaceholder: "Hours",
    minutesPlaceholder: "Or minutes",
  },
  {
    key: `12_sub_3_${loc.value}`,
    question: `12${
      alphabet[i]
    } (part 2). How intense was your ${loc.text.toLowerCase()} exercise session overall (i.e., perceived
      exertion)?`,
    description:
      "A rating of 6 indicates no or minimal exertion, and 20 indicates maximum possible effort. For example, a rating of 11 would correspond to light intensity activities, and 15 would correspond to hard intensity activities.",
    type: "SLIDER",
    triggers: [
      {
        action: { type: "SHOW" },
        condition: [
          {
            section: "physical_activity_exercise",
            question: "12_sub_1",
            operator: "INCLUDES",
            value: loc.value,
          },
        ],
      },
    ],
    min: 6,
    max: 20,
    step: 1,
  },
  //
  {
    key: `12_sub_4_${loc.value}`,
    question: `12${
      alphabet[i]
    } (part 3). Did ${loc.text.toLowerCase()} exercise have any effect on your symptoms today?`,
    type: "SINGLE_CHOICE",
    triggers: [
      {
        action: { type: "SHOW" },
        condition: [
          {
            section: "physical_activity_exercise",
            question: "12_sub_1",
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

fs.writeFileSync("./exercise.yaml", YAML.stringify(questions));

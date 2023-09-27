const fs = require("fs");
const YAML = require("yaml");

const painLocations = [
  { value: "face", text: "Face" },
  { value: "head", text: "Head" },
  { value: "jaw", text: "Jaw" },
  { value: "neck", text: "Neck" },
  { value: "shoulder", text: "Shoulder" },
  { value: "upper_back", text: "Upper back" },
  { value: "middle_back", text: "Middle back" },
  { value: "lower_back", text: "Lower back" },
  { value: "chest_breast", text: "Chest/breast" },
  { value: "upper_arm", text: "Upper arm(s)" },
  { value: "elbow", text: "Elbow(s)" },
  { value: "lower_arm", text: "Lower arm(s)" },
  { value: "wrist_hand", text: "Wrist/hand(s)" },
  { value: "upper_abdomen", text: "Upper abdomen" },
  { value: "lower_abdomen", text: "Lower abdomen" },
  { value: "vagina", text: "Vagina" },
  { value: "pelvis", text: "Pelvis" },
  { value: "rectum", text: "Rectum" },
  { value: "hip", text: "Hip(s)" },
  { value: "groin", text: "Groin(s)" },
  { value: "thighs_upper_leg", text: "Thighs/upper leg(s)" },
  { value: "buttock", text: "Buttock(s)" },
  { value: "knee", text: "Knee(s)" },
  { value: "lower_leg", text: "Lower leg(s)" },
  { value: "ankle", text: "Ankle(s)" },
  { value: "feet", text: "Feet" },
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

// Omit a because that's the location Q

const questions = painLocations.flatMap((loc, i) => [
  {
    key: `1_sub_2_${loc.value}`,
    question: `1${
      alphabet[i]
    } (part 1). Rate the severity of the ${loc.text.toLowerCase()} pain.`,
    type: "SINGLE_CHOICE",
    triggers: [
      {
        action: { type: "SHOW" },
        condition: [
          {
            section: "health_symptoms",
            question: "1_sub_1",
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
  {
    key: `1_sub_3_${loc.value}`,
    question: `1${
      alphabet[i]
    } (part 2). What type of ${loc.text.toLowerCase()} pain are you experiencing?`,
    type: "MULTIPLE_CHOICE",
    description: "Select all that apply.",
    triggers: [
      {
        action: { type: "SHOW" },
        condition: [
          {
            section: "health_symptoms",
            question: "1_sub_1",
            operator: "INCLUDES",
            value: loc.value,
          },
        ],
      },
    ],
    options: [
      {
        value: "throbbing",
        text: "Throbbing",
      },
      {
        value: "shootingue",
        text: "Shooting",
      },
      {
        value: "stabbing",
        text: "Stabbing",
      },
      {
        value: "sharp",
        text: "Sharp",
      },
      {
        value: "cramping",
        text: "Cramping",
      },
      {
        value: "gnawing",
        text: "Gnawing",
      },
      {
        value: "hot-burning",
        text: "Hot-burning",
      },
      {
        value: "aching",
        text: "Aching",
      },
      {
        value: "heavy",
        text: "Heavy",
      },
      {
        value: "tender",
        text: "Tender",
      },
      {
        value: "splitting",
        text: "Splitting",
      },
      {
        value: "tiring_exhausting",
        text: "Tiring-exhausting",
      },
      {
        value: "sickening",
        text: "Sickening",
      },
      {
        value: "fearful",
        text: "Fearful",
      },
      {
        value: "punishing_cruel",
        text: "Punishing-cruel",
      },
      {
        value: "pinching",
        text: "Pinching",
      },
      {
        value: "tugging",
        text: "Tugging",
      },
      {
        value: "dull",
        text: "Dull",
      },
      {
        value: "radiating",
        text: "Radiating",
      },
      {
        value: "piercing",
        text: "Piercing",
      },
    ],
  },
]);

fs.writeFileSync("./pain.yaml", YAML.stringify(questions));

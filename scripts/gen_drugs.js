const fs = require("fs");
const YAML = require("yaml");

const drugs = [
  {
    value: "corticosteroid",
    text: "Corticosteroids (prednisone, prednisolone, methylpredninsolone)",
  },
  {
    value: "nsaids",
    text: "NSAIDs (ie. ibuprofen, advil, motrin, naproxen, alleve,  meloxicam, mobic, etodolac, lodine, nabumetone, relafen, sulindac, clinoril, tolementin, tolectin,  diclofenac, voltaren, indomethacin, indocin, ketoprofen, orudis, oruvail, meloxicam, mobic, celecoxib, celebrex)",
  },
  { value: "hydroxychloroquine", text: "Hydroxychloroquine (plaquenil)" },
  { value: "leflunomide", text: "Leflunomide (arava)" },
  { value: "azulfidine", text: "Azulfidine (Sulfasalazine)" },
  { value: "cyclosporine", text: "Cyclosporine (neoral, sandimmune)" },
  { value: "cyclophosphamide", text: "Cyclophosphamide" },
  { value: "purethinol", text: "Purethinol (6-MP) / Imuran (Azathioprine)" },
  { value: "methotrexate", text: "Methotrexate (trexall, rheumatrex)" },
  {
    value: "remicade",
    text: "Remicade (infliximab), Renflexis, Ixifi, Avsola, Inflectra",
  },
  { value: "humira", text: "Humira (adalimumab)" },
  { value: "etanercept", text: "etanercept (enbrel)" },
  { value: "abatacept", text: "abatacept (orencia)" },
  { value: "rituximab", text: "rituximab (rituxan)" },
  { value: "anakinra", text: "anakinra (kineret)" },
  { value: "other", text: "Other Medication" },
  /*{ value: "other1", text: "Other Medication #1" },
  { value: "other2", text: "Other Medication #2" },
  { value: "other3", text: "Other Medication #3" },
  { value: "other4", text: "Other Medication #4" },
  { value: "other5", text: "Other Medication #5" },
  { value: "other6", text: "Other Medication #6" },
  { value: "other7", text: "Other Medication #7" },
  { value: "other8", text: "Other Medication #8" },
  */
];

const createCurrentQuestions = (drug) => {
  const { value, text } = drug;
  return [
    // Dose question
    {
      key: `current_med_dose_${value}`,
      question: `What is the current dose of ${text}?`,
      type: "SINGLE_CHOICE",
      options: [
        {
          value: "mg",
          text: "milligrams (mg)",
          inlineQuestion: {
            key: `current_med_dose_${value}_mg_description`,
            question: "Please provide the quantity",
            type: "TEXTAREA",
          },
        },
        {
          value: "g",
          text: "grams (g)",
          inlineQuestion: {
            key: `current_med_dose_${value}_g_description`,
            question: "Please provide the quantity",
            type: "TEXTAREA",
          },
        },
        {
          value: "ml",
          text: "milliliter (mL)",
          inlineQuestion: {
            key: `current_med_dose_${value}_ml_description`,
            question: "Please provide the quantity",
            type: "TEXTAREA",
          },
        },
        {
          value: "other",
          text: "Other amount",
          inlineQuestion: {
            key: `current_med_dose_${value}_other_description`,
            question: "Please provide the metric and quantity",
            type: "TEXTAREA",
          },
        },
      ],
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "current_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Frequency units question
    {
      key: `current_med_freq_units_${value}`,
      question: `How often do you take ${text}?`,
      type: "SINGLE_CHOICE",
      options: [
        { value: "day", text: "Every day" },
        { value: "week", text: "Each week" },
        { value: "2_weeks", text: "Every two weeks" },
        { value: "4_weeks", text: "Every four weeks" },
        { value: "6_weeks", text: "Every six weeks" },
        { value: "8_weeks", text: "Every eight weeks" },
        {
          value: "other",
          text: "Other (please describe)",
          inlineQuestion: {
            key: `current_med_freq_units_${value}_other_description`,
            question: "How often do you take the medication?",
            type: "TEXTAREA",
          },
        },
      ],
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "current_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Frequency count question
    {
      key: `current_med_freq_value_${value}`,
      question: `How many times at the above frequency do you take ${text}?`,
      type: "NUMERIC",
      minValue: 0,
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "current_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Route question
    {
      key: `current_med_route_${value}`,
      question: `What is the way ${text} is given to you?`,
      type: "SINGLE_CHOICE",
      options: [
        { value: "mouth", text: "By mouth" },
        { value: "iv", text: "In an IV (intravenous/in a vein)" },
        { value: "under_skin", text: "Injected under the skin" },
        { value: "in_rectum", text: "In the rectum" },
      ],
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "current_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Last dose question
    {
      key: `current_med_last_dose_date_${value}`,
      question: `When was your last dose of ${text}?`,
      type: "DATE",
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "current_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
  ];
};

const createNewQuestions = (drug) => {
  const { value, text } = drug;
  return [
    // Dose question
    {
      key: `new_med_dose_${value}`,
      question: `What is the dose of ${text}?`,
      type: "SINGLE_CHOICE",
      options: [
        {
          value: "mg",
          text: "milligrams (mg)",
          inlineQuestion: {
            key: `new_med_dose_${value}_mg_description`,
            question: "Please provide the quantity",
            type: "TEXTAREA",
          },
        },
        {
          value: "g",
          text: "grams (g)",
          inlineQuestion: {
            key: `new_med_dose_${value}_g_description`,
            question: "Please provide the quantity",
            type: "TEXTAREA",
          },
        },
        {
          value: "ml",
          text: "milliliter (mL)",
          inlineQuestion: {
            key: `new_med_dose_${value}_ml_description`,
            question: "Please provide the quantity",
            type: "TEXTAREA",
          },
        },
        {
          value: "other",
          text: "Other amount",
          inlineQuestion: {
            key: `new_med_dose_${value}_other_description`,
            question: "Please provide the metric and quantity",
            type: "TEXTAREA",
          },
        },
      ],
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "new_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Frequency units question
    {
      key: `new_med_freq_units_${value}`,
      question: `How often do you take ${text}?`,
      type: "SINGLE_CHOICE",
      options: [
        { value: "day", text: "Every day" },
        { value: "week", text: "Each week" },
        { value: "2_weeks", text: "Every two weeks" },
        { value: "4_weeks", text: "Every four weeks" },
        { value: "6_weeks", text: "Every six weeks" },
        { value: "8_weeks", text: "Every eight weeks" },
        {
          value: "other",
          text: "Other (please describe)",
          inlineQuestion: {
            key: `new_med_freq_units_${value}_other_description`,
            question: "How often do you take the medication?",
            type: "TEXTAREA",
          },
        },
      ],
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "new_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Frequency count question
    {
      key: `new_med_freq_value_${value}`,
      question: `How many times at the above frequency do you take ${text}?`,
      type: "NUMERIC",
      minValue: 0,
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "new_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Route question
    {
      key: `new_med_route_${value}`,
      question: `What is the way ${text} is given to you?`,
      type: "SINGLE_CHOICE",
      options: [
        { value: "mouth", text: "By mouth" },
        { value: "iv", text: "In an IV (intravenous/in a vein)" },
        { value: "under_skin", text: "Injected under the skin" },
        { value: "in_rectum", text: "In the rectum" },
      ],
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "new_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Last dose question
    {
      key: `new_med_start_date_${value}`,
      question: `When did you start ${text}?`,
      type: "DATE",
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "new_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
  ];
};

const createStoppedQuestions = (drug) => {
  const { value, text } = drug;
  return [
    // Dose question
    {
      key: `stopped_med_dose_${value}`,
      question: `What was the dose of ${text} at stopping?`,
      type: "SINGLE_CHOICE",
      options: [
        {
          value: "mg",
          text: "milligrams (mg)",
          inlineQuestion: {
            key: `stopped_med_dose_${value}_mg_description`,
            question: "Please provide the quantity",
            type: "TEXTAREA",
          },
        },
        {
          value: "g",
          text: "grams (g)",
          inlineQuestion: {
            key: `stopped_med_dose_${value}_g_description`,
            question: "Please provide the quantity",
            type: "TEXTAREA",
          },
        },
        {
          value: "ml",
          text: "milliliter (mL)",
          inlineQuestion: {
            key: `stopped_med_dose_${value}_ml_description`,
            question: "Please provide the quantity",
            type: "TEXTAREA",
          },
        },
        {
          value: "other",
          text: "Other amount",
          inlineQuestion: {
            key: `stopped_med_dose_${value}_other_description`,
            question: "Please provide the metric and quantity",
            type: "TEXTAREA",
          },
        },
      ],
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "stopped_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Frequency units question
    {
      key: `stopped_med_freq_units_${value}`,
      question: `How often did you take ${text}?`,
      type: "SINGLE_CHOICE",
      options: [
        { value: "day", text: "Every day" },
        { value: "week", text: "Each week" },
        { value: "2_weeks", text: "Every two weeks" },
        { value: "4_weeks", text: "Every four weeks" },
        { value: "6_weeks", text: "Every six weeks" },
        { value: "8_weeks", text: "Every eight weeks" },
        {
          value: "other",
          text: "Other (please describe)",
          inlineQuestion: {
            key: `stopped_med_freq_units_${value}_other_description`,
            question: "How often do you take the medication?",
            type: "TEXTAREA",
          },
        },
      ],
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "stopped_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Frequency count question
    {
      key: `stopped_med_freq_value_${value}`,
      question: `How many times at the above frequency did you take ${text}?`,
      type: "NUMERIC",
      minValue: 0,
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "stopped_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Route question
    {
      key: `stopped_med_route_${value}`,
      question: `What is the way ${text} was given to you?`,
      type: "SINGLE_CHOICE",
      options: [
        { value: "mouth", text: "By mouth" },
        { value: "iv", text: "In an IV (intravenous/in a vein)" },
        { value: "under_skin", text: "Injected under the skin" },
        { value: "in_rectum", text: "In the rectum" },
      ],
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "stopped_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Last dose question
    {
      key: `stopped_med_stop_date_${value}`,
      question: `When did you stop ${text}?`,
      type: "DATE",
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "stopped_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
  ];
};

const createAlteredQuestions = (drug) => {
  const { value, text } = drug;
  return [
    // Dose question
    {
      key: `altered_med_dose_${value}`,
      question: `What is the new dose of ${text}?`,
      type: "SINGLE_CHOICE",
      options: [
        {
          value: "mg",
          text: "milligrams (mg)",
          inlineQuestion: {
            key: `altered_med_dose_${value}_mg_description`,
            question: "Please provide the quantity",
            type: "TEXTAREA",
          },
        },
        {
          value: "g",
          text: "grams (g)",
          inlineQuestion: {
            key: `altered_med_dose_${value}_g_description`,
            question: "Please provide the quantity",
            type: "TEXTAREA",
          },
        },
        {
          value: "ml",
          text: "milliliter (mL)",
          inlineQuestion: {
            key: `altered_med_dose_${value}_ml_description`,
            question: "Please provide the quantity",
            type: "TEXTAREA",
          },
        },
        {
          value: "other",
          text: "Other amount",
          inlineQuestion: {
            key: `altered_med_dose_${value}_other_description`,
            question: "Please provide the metric and quantity",
            type: "TEXTAREA",
          },
        },
      ],
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "altered_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Frequency units question
    {
      key: `altered_med_freq_units_${value}`,
      question: `How often do you take ${text}?`,
      type: "SINGLE_CHOICE",
      options: [
        { value: "day", text: "Every day" },
        { value: "week", text: "Each week" },
        { value: "2_weeks", text: "Every two weeks" },
        { value: "4_weeks", text: "Every four weeks" },
        { value: "6_weeks", text: "Every six weeks" },
        { value: "8_weeks", text: "Every eight weeks" },
        {
          value: "other",
          text: "Other (please describe)",
          inlineQuestion: {
            key: `altered_med_freq_units_${value}_other_description`,
            question: "How often do you take the medication?",
            type: "TEXTAREA",
          },
        },
      ],
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "altered_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Frequency count question
    {
      key: `altered_med_freq_value_${value}`,
      question: `How many times at the above frequency do you take ${text}?`,
      type: "NUMERIC",
      minValue: 0,
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "altered_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Route question
    {
      key: `altered_med_route_${value}`,
      question: `What is the way ${text} is given to you?`,
      type: "SINGLE_CHOICE",
      options: [
        { value: "mouth", text: "By mouth" },
        { value: "iv", text: "In an IV (intravenous/in a vein)" },
        { value: "under_skin", text: "Injected under the skin" },
        { value: "in_rectum", text: "In the rectum" },
      ],
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "altered_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
    // Last dose question
    {
      key: `altered_med_change_date_${value}`,
      question: `When did you start the new dose of ${text}?`,
      type: "DATE",
      triggers: [
        {
          action: {
            type: "SHOW",
          },
          condition: [
            {
              section: "baseline",
              question: "altered_meds",
              operator: "INCLUDES",
              value,
            },
          ],
        },
      ],
    },
  ];
};

const questions = {
  current: [],
  new: [],
  stopped: [],
  altered: [],
};
drugs.forEach((drug) => {
  questions.current.push(...createCurrentQuestions(drug));
  questions.new.push(...createNewQuestions(drug));
  questions.stopped.push(...createStoppedQuestions(drug));
  questions.altered.push(...createAlteredQuestions(drug));
});

fs.writeFileSync("./drugs.yaml", YAML.stringify(questions));

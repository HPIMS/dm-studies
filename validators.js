const Validator = require("jsonschema").Validator;
// https://github.com/tdegrunt/jsonschema
// https://github.com/tdegrunt/jsonschema/blob/026dbbbac52268dd971c6dc7fe65e0f85590277b/examples/all.js

// --------------------------------------------------------------------
// Surveys
// --------------------------------------------------------------------
const SurveySchema = {
  id: "/Survey",
  type: "object",
  properties: {
    key: {
      type: "string",
      required: true,
    },
    period: {
      type: "string",
      enum: ["ONCE", "DAILY", "WEEKLY", "BI_WEEKLY", "MONTHLY", "FINAL"],
      required: true,
    },
    repeat: {
      type: "integer", // TODO: remove legacy
      required: true,
    },
    timeEstimate: {
      type: "integer",
    },
    name: {
      type: "string",
      required: true,
    },
    short: {
      type: "string",
      required: true,
    },
    title: {
      type: "string",
      required: true,
    },
    description: {
      type: "string",
      required: true,
    },
    completed: {
      type: "object",
      properties: {
        title: {
          type: "string",
          required: true,
        },
        description: {
          type: "string",
          required: true,
        },
      },
    },
    sections: {
      type: "array",
      items: {
        $ref: "/SurveySection",
      },
      minItems: 1,
    },
  },
};

const SurveySectionSchema = {
  id: "/SurveySection",
  type: "object",
  properties: {
    key: {
      type: "string",
      required: true,
    },
    title: {
      type: "string",
    },
    description: {
      type: "string",
    },
    questions: {
      type: "array",
      items: {
        oneOf: [
          {
            $ref: "/ChoiceQuestion",
          },
          {
            $ref: "/HeightQuestion",
          },
          {
            $ref: "/NumericQuestion",
          },
          {
            $ref: "/PredefinedQuestion",
          },
          {
            $ref: "/SliderQuestion",
          },
          {
            $ref: "/TextAreaQuestion",
          },
          {
            $ref: "/WeightQuestion",
          },
        ],
      },
    },
  },
};

// --------------------------------------------------------------------
// Questions
// --------------------------------------------------------------------
const ChoiceQuestionSchema = {
  id: "/ChoiceQuestion",
  type: "object",
  properties: {
    key: {
      type: "string",
      required: true,
    },
    type: {
      type: "string",
      enum: ["SINGLE_CHOICE", "MULTIPLE_CHOICE"],
      required: true,
    },
    triggers: {
      type: "array",
      items: {
        $ref: "/Trigger",
      },
    },
    question: {
      type: "string",
      required: true,
    },
    description: {
      type: "string",
    },
    options: {
      type: "array",
      items: {
        type: "object",
        properties: {
          value: {
            type: "string",
            required: true,
          },
          text: {
            type: "string",
            required: true,
          },
          inlineQuestion: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["TEXTAREA"],
              },
              key: {
                type: "string",
                required: true,
              },
              question: {
                type: "string",
                required: true,
              },
            },
          },
        },
      },
      minItems: 2,
      required: true,
    },
  },
};

const HeightQuestionSchema = {
  id: "/HeightQuestion",
  type: "object",
  properties: {
    key: {
      type: "string",
      required: true,
    },
    type: {
      type: "string",
      enum: ["HEIGHT"],
      required: true,
    },
    triggers: {
      type: "array",
      items: {
        $ref: "/Trigger",
      },
    },
    question: {
      type: "string",
      required: true,
    },
    description: {
      type: "string",
    },
    unit: {
      type: "string",
      enum: ["in", "cm"],
    },
  },
};

const NumericQuestionSchema = {
  id: "/NumericQuestion",
  type: "object",
  properties: {
    key: {
      type: "string",
      required: true,
    },
    type: {
      type: "string",
      enum: ["NUMERIC"],
      required: true,
    },
    triggers: {
      type: "array",
      items: {
        $ref: "/Trigger",
      },
    },
    question: {
      type: "string",
      required: true,
    },
    description: {
      type: "string",
    },
    placeholder: {
      type: "string",
    },
    minValue: {
      type: "number",
    },
    maxValue: {
      type: "number",
    },
  },
};

const PredefinedQuestionSchema = {
  id: "/PredefinedQuestion",
  type: "object",
  properties: {
    key: {
      type: "string",
      required: true,
    },
    type: {
      type: "string",
      enum: ["YESNO_CHOICE", "YEAR", "BIRTH_YEAR"],
      required: true,
    },
    triggers: {
      type: "array",
      items: {
        $ref: "/Trigger",
      },
    },
    question: {
      type: "string",
      required: true,
    },
    description: {
      type: "string",
    },
  },
};

const SliderQuestionSchema = {
  id: "/SliderQuestion",
  type: "object",
  properties: {
    key: {
      type: "string",
      required: true,
    },
    type: {
      type: "string",
      enum: ["SLIDER"],
      required: true,
    },
    triggers: {
      type: "array",
      items: {
        $ref: "/Trigger",
      },
    },
    question: {
      type: "string",
      required: true,
    },
    description: {
      type: "string",
    },
    min: {
      type: "integer",
      required: true,
    },
    max: {
      type: "integer",
      required: true,
    },
    step: {
      type: "number",
      required: true,
    },
    minDescription: {
      type: "string",
    },
    maxDescription: {
      type: "string",
    },
  },
};

const TextAreaQuestionSchema = {
  id: "/TextAreaQuestion",
  type: "object",
  properties: {
    key: {
      type: "string",
      required: true,
    },
    type: {
      type: "string",
      enum: ["TEXTAREA"],
      required: true,
    },
    triggers: {
      type: "array",
      items: {
        $ref: "/Trigger",
      },
    },
    question: {
      type: "string",
      required: true,
    },
    description: {
      type: "string",
    },
    placeholder: {
      type: "string",
    },
  },
};

const WeightQuestionSchema = {
  id: "/WeightQuestion",
  type: "object",
  properties: {
    key: {
      type: "string",
      required: true,
    },
    type: {
      type: "string",
      enum: ["WEIGHT"],
      required: true,
    },
    triggers: {
      type: "array",
      items: {
        $ref: "/Trigger",
      },
    },
    question: {
      type: "string",
      required: true,
    },
    description: {
      type: "string",
    },
    unit: {
      type: "string",
      enum: ["lb", "kg"],
    },
  },
};

// --------------------------------------------------------------------
// Triggers
// --------------------------------------------------------------------
const TriggerSchema = {
  id: "/Trigger",
  type: "object",
  properties: {
    action: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["SHOW", "HIDE"],
          required: true,
        },
      },
      required: true,
    },
    condition: {
      type: "array",
      items: {
        $ref: "/TriggerCondition",
      },
      minItems: 1,
      required: true,
    },
  },
};

const TriggerConditionSchema = {
  id: "/TriggerCondition",
  type: "object",
  properties: {
    section: {
      type: "string",
      required: true,
    },
    question: {
      type: "string",
      required: true,
    },
    value: {
      type: "any",
      required: false, // TODO: FIX THIS!!
    },
    operator: {
      type: "string",
      enum: [
        "=",
        "<>",
        "<",
        "<=",
        ">",
        ">=",
        "INCLUDES",
        "NOT_INCLUDES",
        "IS_SET",
      ],
      required: true,
    },
    AND: {
      type: "array",
      items: {
        $ref: "/TriggerCondition",
      },
    },
  },
};

// --------------------------------------------------------------------
// Create the validators
// --------------------------------------------------------------------
const surveyValidator = new Validator();
surveyValidator.addSchema(TriggerConditionSchema, "/TriggerCondition");
surveyValidator.addSchema(TriggerSchema, "/Trigger");
surveyValidator.addSchema(ChoiceQuestionSchema, "/ChoiceQuestion");
surveyValidator.addSchema(HeightQuestionSchema, "/HeightQuestion");
surveyValidator.addSchema(NumericQuestionSchema, "/NumericQuestion");
surveyValidator.addSchema(PredefinedQuestionSchema, "/PredefinedQuestion");
surveyValidator.addSchema(SliderQuestionSchema, "/SliderQuestion");
surveyValidator.addSchema(TextAreaQuestionSchema, "/TextAreaQuestion");
surveyValidator.addSchema(WeightQuestionSchema, "/WeightQuestion");
surveyValidator.addSchema(SurveySectionSchema, "/SurveySection");

module.exports = {
  validateSurvey: (survey) => {
    surveyValidator.validate(survey, SurveySchema, { throwAll: true });
  },
};

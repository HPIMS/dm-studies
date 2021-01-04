// const Validator = require("jsonschema").Validator;

// TODO: refactor into separate files?
// TODO: property titles
// TODO: disallow additional properties

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

// --------------------------------------------------------------------
// Create the validators
// --------------------------------------------------------------------
/*
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
*/

const Ajv = require("ajv").default;

const surveySchema = require("./schemas/survey.json");
const surveySectionSchema = require("./schemas/survey_section.json");
const surveyQuestionSchema = require("./schemas/survey_question.json");

const ajv = new Ajv();
ajv.addSchema([surveySchema, surveySectionSchema, surveyQuestionSchema]);
const validate = ajv.compile(surveySchema);

module.exports = {
  validateSurveySchema: (survey) => {
    const valid = validate(survey);
    if (!valid) console.log(validate.errors);
  },
  validateStudySchema: (study) => {
    // TODO: complete this
  },
};

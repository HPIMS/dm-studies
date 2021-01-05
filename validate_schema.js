const Ajv = require("ajv").default;

const StudySchema = require("./schemas/Study.json");
const SurveySchema = require("./schemas/survey.json");
const SurveySectionSchema = require("./schemas/survey_section.json");
const SurveyQuestionSchema = require("./schemas/survey_question.json");

const ajv = new Ajv();
ajv.addSchema([
  StudySchema,
  SurveySchema,
  SurveySectionSchema,
  SurveyQuestionSchema,
]);

const validators = {
  survey: ajv.compile(SurveySchema),
  study: ajv.compile(StudySchema),
};

module.exports = (type, data) => {
  const validate = validators[type];
  let errors = [];

  if (validate) {
    const valid = validate(data);
    if (!valid) {
      errors = validate.errors;
    }
  }
  return errors;
};

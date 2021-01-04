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

module.exports = {
  validateSurveySchema: (() => {
    const validate = ajv.compile(SurveySchema);
    return (survey) => {
      const valid = validate(survey);
      if (!valid) {
        return validate.errors;
      }
      return [];
    };
  })(),
  validateStudySchema: (() => {
    const validate = ajv.compile(StudySchema);
    return (survey) => {
      const valid = validate(survey);
      if (!valid) {
        return validate.errors;
      }
      return [];
    };
  })(),
};

const fetch = require("node-fetch");

async function calculateScore(event, context) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let fhirData;
  try {
    fhirData = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: "Invalid request body format" };
  }
  const { questionnaire, item } = fhirData;

  if (!questionnaire) {
    return { statusCode: 400, body: "Missing Questionnaire" };
  }

  if (!item || !Array.isArray(item)) {
    return { statusCode: 400, body: "Missing Item array" };
  }

  // Get the survey spec from the studies service
  let surveySpec;

  console.log("URL", questionnaire.replace(/\|\d*/, ""));
  try {
    const response = await fetch(questionnaire.replace(/\|\d*/, ""), {
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      surveySpec = await response.json();
    } else {
      if (response.statusCode === 404) {
        return {
          statusCode: 400,
          body: "Invalid Questionnaire",
        };
      }
      throw new Error("Error fetching survey spec");
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: "An error occurred fetching the survey spec",
    };
  }

  // We're only able to score the latest version of the survey because
  // we don't keep older versions accessible via the studies service.
  const [, questionnaireVersion] = questionnaire.match(/\|(\d*)$/) || [];
  if (`${surveySpec.version}` !== questionnaireVersion) {
    return {
      statusCode: 400,
      body: "The requested questionnaire version does not match the survey version in the studies service, unable to score.",
    };
  }

  const scoringFn = scoringFns[surveySpec.key];
  // If we get here, we have the survey spec and the QuestionnaireResponse
  // so we are ready to go ahead and score.
  if (!scoringFn) {
    return {
      statusCode: 400,
      body: "The requested questionnaire is not scorable",
    };
  }

  // Extract the fhir data and map as { [section]: { [question]: answer } }
  const surveyData = fromFHIRQuestionnaire(fhirData, surveySpec);
  const optionScoreMap = mapOptionToScore(surveySpec);

  // calculate the score
  const score = scoringFn(surveyData, optionScoreMap);
  return {
    statusCode: 200,
    body: { score },
  };
}

const scoringFns = {
  pss4: sumScore,
  sleep: sumScore,
};

function sumScore(surveyData, optionScoreMap) {
  const sections = Object.keys(surveyData);
  return sections.reduce((score, section) => {
    const sectionData = surveyData[section];
    const questions = Object.keys(surveyData[section]);
    return (
      score +
      questions.reduce((sectionScore, question) => {
        const option = sectionData[question];
        const questionScore =
          (optionScoreMap[section] &&
            optionScoreMap[section][question] &&
            optionScoreMap[section][question][option]) ||
          0;
        return sectionScore + questionScore;
      }, 0)
    );
  }, 0);
}

/**
 * Builds map in the form { [section]: { [question]: { [option]: score } } }
 * to allow us to efficiently calculate the score of a survey from its data
 * Assumes all scorable surveys are composed of n sections with m SINGLE_CHOICE questions
 * @param surveySpec - The survey spec json document from the studies service.
 * @returns The option map ({ [section]: { [question]: { [option]: score } } }).
 */
function mapOptionToScore(surveySpec) {
  // Define a function to extract the questions from the section
  function extractQuestions(sectionSpec) {
    return sectionSpec.questions.reduce(
      (questionMap, question) => ({
        ...questionMap,
        [question.key]: extractOptions(question),
      }),
      {}
    );
  }

  // Define a function to extract the options & score from the question
  function extractOptions(questionSpec) {
    return questionSpec.type === "SINGLE_CHOICE"
      ? questionSpec.options.reduce(
          (optionMap, option) => ({
            ...optionMap,
            [option.value]: option.score,
          }),
          {}
        )
      : {};
  }

  // For each section, map the question/options to score
  return surveySpec.sections.reduce(
    (sectionMap, section) => ({
      ...sectionMap,
      [section.key]: extractQuestions(section),
    }),
    {}
  );
}

// TODO: RENAME THESE FUNCTIONS

function fromFHIRQuestionnaire(fhirData, surveySpec) {
  const { item: sections = [] } = fhirData;

  return sections.reduce((surveyData, section) => {
    const { linkId, item: items = [] } = section;
    const sectionSpec = surveySpec.sections.find((s) => s.key === linkId);
    const sectionData = sectionSpec && processSection(items, sectionSpec);
    if (sectionData) {
      return {
        ...surveyData,
        [linkId]: sectionData,
      };
    }
    return surveyData;
  }, {});
}

function processSection(sectionData, sectionSpec) {
  return sectionData.reduce((surveySectionData, question) => {
    const { linkId, answer: answers = [] } = question;
    let questionSpec = sectionSpec.questions.find((q) => q.key === linkId);
    // If we couldn't find the question spec then it is possible that the value is actually an inline
    // question. Inline question keys are in the format <question key>_<choice key>_description.
    if (!questionSpec) {
      questionSpec = sectionSpec.questions.find((q) => {
        // It's possible that more than one questions will have the same root if the keys
        // were not carefully chosen during survey creation. So we will try for each match
        // until we get the exact inline question key we're looking for. Also note, that
        // due to the nature of how inloine questions work, they will only ever appear on
        // a choice question.
        if (
          linkId.startsWith(q.key) &&
          ["SINGLE_CHOICE" || "MULTIPLE_CHOICE"].includes(q.type)
        ) {
          const { options } = q;
          // Now we look through each of the options to try to find one that matches the key pattern
          // we're looking for.
          const opt = options.find(
            (o) => linkId === `${q.key}_${o.value}_description`
          );
          return opt && opt.inlineQuestion;
        }
      });
    }
    const questionData = questionSpec && processQuestion(answers, questionSpec);
    if (questionData) {
      return {
        ...surveySectionData,
        [linkId]: questionData,
      };
    }
    return surveySectionData;
  }, {});
}

function processQuestion(answers, questionSpec) {
  const { type: questionType } = questionSpec;
  let ret;
  // If we're dealing with a multiple choice question, we leave the answers in an array.
  if (questionType === "MULTIPLE_CHOICE") {
    ret = answers.map((a) => processAnswer(a)).filter((o) => o !== undefined);
  } else {
    const [answer] = answers;
    // otherwise we just need the first value
    ret = answer && processAnswer(answer);
  }
  return ret;
}

function processAnswer(answer) {
  let ret;
  if ("valueString" in answer) {
    ret = answer.valueString;
  } else if ("valueInteger" in answer) {
    ret = answer.valueInteger;
  } else if ("valueDecimal" in answer) {
    ret = answer.valueDecimal;
  } else if ("valueQuantity" in answer) {
    ret = answer.valueQuantity;
  }
  return ret;
}

exports.handler = calculateScore;

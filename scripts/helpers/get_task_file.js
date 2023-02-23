const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

const log = require("./log");

const defaultGraceDays = {
  ALWAYS: 0,
  ONCE: 0,
  DAILY: 0,
  WEEKLY: 1,
  BI_WEEKLY: 2,
  MONTHLY: 4,
};

async function getInheritedTaskFiles(fileDefinitions) {
  const promises = fileDefinitions.map(async (definition) => {
    const { dir, group, file } = definition;
    let rawData = {};

    // Try the current group first. If that fails, try the library.
    try {
      rawData = await fs.promises.readFile(path.join(dir, group, file), {
        encoding: "utf-8",
      });
    } catch (err) {
      try {
        rawData = await fs.promises.readFile(path.join(dir, "library", file), {
          encoding: "utf-8",
        });
      } catch (err) {
        log.error(`Could not find ${file}. Skipping.`);
      }
    }
    return YAML.parse(rawData) || {};
  });

  return Promise.all(promises);
}

async function getTaskFile(group, file) {
  const dir = path.join(__dirname, "../../cfg/tasks");
  let taskDefinition = {};

  const rawData = await fs.promises.readFile(path.join(dir, group, file), {
    encoding: "utf-8",
  });
  const data = YAML.parse(rawData) || {};
  const { _extends } = data;

  if (_extends) {
    const inheritanceChain = Array.isArray(_extends) ? _extends : [_extends];
    const fileDefinitions = inheritanceChain.map((f) => ({
      dir,
      group,
      file: `${f}.yaml`,
    }));
    const inheritanceFiles = await getInheritedTaskFiles(fileDefinitions);

    // A -> B -> C where C is extended by B, and B is extended by A.
    // Therefore, we reverse the list and apply each change on top of
    // the next in the list. Sections from task A will appear BEFORE
    // the sections of task B when completing the task.
    inheritanceFiles.reverse().forEach((inheritableTask, index) => {
      const { key: inheritableTaskKey, sections } = inheritableTask;
      let mergedSections = sections;
      // Some tasks may have sections with the same key (quite common). Also,
      // it's possible to extend a task multiple times, for example we
      // may want to show one questionnaire, have the participant do
      // another task, then show the same  questionnaire to see if their
      // responses chance. Therefore, we need to assign unique keys to each
      // section. We also need to adjust any triggers that are used so that
      // skip patterns continue to work. We only do this if the task inherits
      // from multiple tasks. If it just inherits from one, then we know
      // that there can't be a collision, unless the task it's inheriting
      // from is improperly defined.
      if (inheritanceFiles.length > 1) {
        const createModifiedSectionKey = (taskIdx, taskKey, sectionKey) => {
          return (
            `task_key=${taskKey};` +
            `task_idx=${taskIdx};` +
            `section=${sectionKey};`
          );
        };

        const modifyCondition = (taskIdx, taskKey, condition) => {
          return condition.map((cond) => {
            const { section, AND } = cond;

            const modified = {
              ...cond,
              section: createModifiedSectionKey(taskIdx, taskKey, section),
            };

            if (AND) {
              modified.AND = modifyCondition(cond.AND);
            }

            return modified;
          });
        };

        mergedSections = mergedSections.map((section) => {
          const {
            type: sectionType,
            key: originalSectionKey,
            questions,
          } = section;
          const taskIndex = inheritanceFiles.length - index - 1;

          const out = { ...section };

          // Create a new section key to uniquely identify this task section
          const sectionKey = createModifiedSectionKey(
            taskIndex,
            inheritableTaskKey,
            originalSectionKey
          );

          if (sectionType === "survey") {
            // We also need to adjust any triggers that are used so that skip patterns function.
            out.questions = (questions || []).map((question) => {
              const { triggers } = question;
              const updatedQuestion = { ...question };

              if (triggers) {
                updatedQuestion.triggers = triggers.map((trigger) => {
                  const { condition } = trigger;
                  // Conditions are recursive, we need to get the section from each, and update
                  // it to the new section key.
                  return {
                    ...trigger,
                    condition: modifyCondition(
                      taskIndex,
                      inheritableTaskKey,
                      condition
                    ),
                  };
                });
              }
              return updatedQuestion;
            });
          }

          return {
            ...out,
            key: sectionKey,
          };
        });
      }

      // Apply the inherited configs.
      const { sections: _, ...contentToApply } = inheritableTask;
      taskDefinition = { ...taskDefinition, ...contentToApply };

      if (mergedSections || taskDefinition.sections) {
        taskDefinition = {
          ...taskDefinition,
          sections: [
            ...(mergedSections || []),
            ...(taskDefinition.sections || []),
          ],
        };
      }
    });
  }

  // Apply all of the _exends to the top level task.
  const { sections: _, ...contentToApply } = data;
  taskDefinition = { ...taskDefinition, ...contentToApply };

  if (data.sections || taskDefinition.sections) {
    taskDefinition = {
      ...taskDefinition,
      sections: [...(data.sections || []), ...(taskDefinition.sections || [])],
    };
  }

  // add default grace days to the schedule for "PERIOD" schedules
  if (
    taskDefinition.schedule.type === "PERIOD" &&
    !taskDefinition.schedule.graceDays
  ) {
    taskDefinition.schedule.graceDays =
      defaultGraceDays[taskDefinition.schedule.period];
  }

  return taskDefinition;
}

module.exports = getTaskFile;

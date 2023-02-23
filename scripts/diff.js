const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const YAML = require("yaml");
const chalk = require("chalk");

const waterfall = require("./waterfall");

const log = {
  error: (t) => console.log(chalk.red(t)),
  warning: (t) => console.log(chalk.yellow(t)),
  info: (t) => console.log(chalk.cyan(t)),
  important: (t) => console.log(chalk.green(t)),
  plain: (t) => console.log(t),
};

const versions = YAML.parse(
  fs.readFileSync("./version.lock", { encoding: "utf-8" })
);

const nextVersions = {
  active: {
    studies: {},
    tasks: {},
  },
  inactive: {
    studies: {},
    tasks: {},
  },
};

const taskLibrary = new Set();
const activeTasks = new Set();

const diffs = new Map([
  ["studies", new Set()],
  ["tasks", new Set()],
]);

function hashFileContents(content) {
  return crypto.createHash("md5").update(JSON.stringify(content)).digest("hex");
}

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
  const dir = path.join(__dirname, "../cfg/tasks");
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

  const { sections: _, ...contentToApply } = data;
  taskDefinition = { ...taskDefinition, ...contentToApply };

  if (data.sections || taskDefinition.sections) {
    taskDefinition = {
      ...taskDefinition,
      sections: [...(data.sections || []), ...(taskDefinition.sections || [])],
    };
  }

  return taskDefinition;
}

async function processTasks() {
  const dir = path.join(__dirname, "../cfg/tasks");
  const groups = await fs.promises.readdir(dir);

  const groupExecutors = groups.map((taskGroup) => async () => {
    const groupDir = `${dir}/${taskGroup}`;
    const tasks = await fs.promises.readdir(groupDir);

    const taskExecutors = tasks.map(async (file) => {
      const rootName = file.replace(/\.yaml$|\.yml$/, "");
      const name = `${taskGroup}::${rootName}`;

      // If we are using .yml, automatically move to .yaml.
      const extension = file.split(".").pop();
      if (extension === "yml") {
        try {
          // see if the .yaml file that we want to move it to already exists
          await fs.promises.stat(`${groupDir}/${rootName}.yaml`);
          log.error(
            `[${name}] Uses a .yml extension and another file with a .yaml extension already exists. Could not automatically rename.`
          );
          return;
        } catch (err) {
          log.warning(`[${name}] Renaming to ${rootName}.yaml.`);
          // if we get here it means we can rename
          await fs.promises.rename(
            `${groupDir}/${rootName}.yml`,
            `${groupDir}/${rootName}.yaml`
          );
        }
      }

      const fileContents = await getTaskFile(taskGroup, `${rootName}.yaml`);

      const active = versions.active.tasks;
      const inactive = versions.inactive.tasks;

      const [lastHash, lastVersion] = active[name] || inactive[name] || [];

      const nextHash = hashFileContents(fileContents);
      let nextVersion = lastVersion;

      if (rootName !== fileContents.key) {
        log.error(`[${name}] Task key and Filename mismatch.`);
        return;
      }

      // add this survey to the survey library
      taskLibrary.add(name);

      if (!lastHash || !lastVersion) {
        nextVersion = 1;
        // If this is the first time seeing this file set the version to the
        // existing version in the yaml, or 1.
        diffs.get("tasks").add(name);
      } else if (lastHash !== nextHash) {
        nextVersion = lastVersion + 1;
        // If we've seen this file, but it has changed, increment the version
        diffs.get("tasks").add(name);
      }

      // Write to the versions file. Put all tasks in the active group
      // for now. When we process the studies, we'll move any tasks that
      // are not included in any active study into the inactive group.
      nextVersions.active.tasks[name] = [nextHash, nextVersion];
    });
    await waterfall(taskExecutors);
  });

  await waterfall(groupExecutors);
}

async function getStudyFile(file) {
  const dir = path.join(__dirname, "../cfg/studies");
  const rawData = await fs.promises.readFile(path.join(dir, file), {
    encoding: "utf-8",
  });
  return YAML.parse(rawData) || {};
}

async function processStudies() {
  const dir = path.join(__dirname, "../cfg/studies");
  const files = await fs.promises.readdir(dir);

  const executors = files.map((fileName) => async () => {
    const name = fileName.replace(/\.yaml$|\.yml$/, "");
    const extension = fileName.split(".").pop();

    if (name === "library") {
      log.error(`[${name}] Reserved study name.`);
      return;
    }

    // If we are using .yml, automatically move to .yaml.
    if (extension === "yml") {
      try {
        // see if the .yaml file that we want to move it to already exists
        await fs.promises.stat(`${dir}/${name}.yaml`);
        log.error(
          `[${name}] Uses a .yml extension and another file with a .yaml extension already exists. Could not automatically rename.`
        );
        return;
      } catch (err) {
        log.warning(`[${name}] Renaming to ${name}.yaml.`);
        // if we get here it means we can rename
        await fs.promises.rename(`${dir}/${name}.yml`, `${dir}/${name}.yaml`);
      }
    }

    const fileContents = await getStudyFile(`${name}.yaml`);

    const active = versions.active.studies;
    const inactive = versions.inactive.studies;

    const [lastHash, lastVersion] = active[name] || inactive[name] || [];

    const nextHash = hashFileContents(fileContents);
    let nextVersion = lastVersion;

    if (name !== fileContents.key) {
      log.error(`[${name}] Study key and Filename mismatch.`);
      return;
    }

    if (!fileContents.active) {
      log.error(
        `[${name}] Is not active. The study and any associated tasks will be ignored.`
      );
      if (!lastHash || !lastVersion) {
        nextVersion = 1;
      } else if (lastHash !== nextHash) {
        nextVersion = lastVersion + 1;
      }
      nextVersions.inactive.studies[name] = [nextHash, nextVersion];
      return;
    }

    // Warn if requested survey is not available. Also create a list
    // of the tasks that are active
    (fileContents.tasks || []).forEach((task) => {
      const reqTaskKey = typeof task === "string" ? task : task.key;

      if (taskLibrary.has(`${name}::${reqTaskKey}`)) {
        activeTasks.add(`${name}::${reqTaskKey}`);
        return;
      }

      if (taskLibrary.has(`library::${reqTaskKey}`)) {
        activeTasks.add(`library::${reqTaskKey}`);
        return;
      }

      log.error(
        `[${name}] Includes task "${reqTaskKey}" which does not exist in the task library.`
      );
    });

    if (!lastHash || !lastVersion) {
      nextVersion = 1;
    } else if (lastHash !== nextHash) {
      nextVersion = lastVersion + 1;
    } else {
      let taskModified = false;
      // If the study itself didn't change but one of the tasks it implements
      // did, then we also need to increment the version.
      (fileContents.tasks || []).forEach((task) => {
        const tKey = task.key || task;
        if (
          // study specific
          (taskLibrary.has(`${name}::${tKey}`) &&
            diffs.get("tasks").has(`${name}::${tKey}`)) ||
          (!taskLibrary.has(`${name}::${tKey}`) &&
            // library
            taskLibrary.has(`library::${tKey}`) &&
            diffs.get("tasks").has(`library::${tKey}`))
        ) {
          taskModified = true;
        }
      });

      if (taskModified) {
        nextVersion = lastVersion + 1;
      }
    }

    // write to the versions file
    nextVersions.active.studies[name] = [nextHash, nextVersion];
  });

  await waterfall(executors);
}

function processActiveTasks() {
  // Move unused tasks to inactive
  Object.keys(nextVersions.active.tasks).forEach((key) => {
    if (!activeTasks.has(key)) {
      nextVersions.inactive.tasks[key] = nextVersions.active.tasks[key];
      delete nextVersions.active.tasks[key];
    }
  });
}

// Run the diff process
(async () => {
  await processTasks();
  await processStudies();
  processActiveTasks();

  await fs.promises.writeFile(
    "./version.lock",
    `${YAML.stringify(nextVersions, { sortMapEntries: true })}\n`
  );
  log.important("Diff Complete!");
})();

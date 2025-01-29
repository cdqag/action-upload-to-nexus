import * as core from '@actions/core';

import { processFilesInput, requireNonEmptyStringInput, resolveDelegations } from './lib/utils';
import { LocalFileDoesNotExistReaction, getLocalFileDoesNotExistReactionByValue } from './lib/LocalFileDoesNotExistReaction';
import { NexusRepositoryClient } from './lib/NexusRepositoryClient';
import { FileDoesNotExistException } from './lib/errors/FileDoesNotExistException';


if (core.isDebug()) {
  core.debug("Enabling debug logs for http, https and http2");
  process.env.NODE_DEBUG = 'http,https,http2';
}


//#region Inputs

// --- Instance URL
const instanceUrl = requireNonEmptyStringInput('instance-url');

// --- Repository
const repository = requireNonEmptyStringInput('repository');
{
  const VALIDATION_REGEX = /^[a-z0-9~._+-]+$/;
  if (!VALIDATION_REGEX.test(repository)) {
    core.setFailed(`Invalid repository name: ${repository}`);
  }
}

// --- Files
const filesInput = requireNonEmptyStringInput('files');
const delegations = processFilesInput(filesInput);
const resolvedDelegations = resolveDelegations(delegations);

// --- Default destination
const defaultDestination = core.getInput('default-destination').trim();

// --- Credentials
const username = core.getInput('username').trim();
const password = core.getInput('password');

// --- Local file does not exist reaction
let localFileDoesNotExistReaction: LocalFileDoesNotExistReaction;
try {
  localFileDoesNotExistReaction = getLocalFileDoesNotExistReactionByValue(core.getInput('if-local-file-does-not-exist'));
} catch (error) {
  const allowedValues = Object.values(LocalFileDoesNotExistReaction);
  core.setFailed(`Invalid value for if-local-file-does-not-exist. Allowed values are: ${allowedValues.join(', ')}`);
}

//#endregion

const main = async () => {
  core.debug("Initializing Nexus Repository Client");
  const client = new NexusRepositoryClient(
    instanceUrl, repository, defaultDestination,
    username, password
  );

  for (const delegation of resolvedDelegations) {
    core.debug(`Processing delegation: ${delegation}`);

    try {
      await client.uploadFile(delegation.src, delegation.dest);
      core.info(`✅ Success`);

    } catch (error) {
      if (error instanceof FileDoesNotExistException) {
        if (localFileDoesNotExistReaction === LocalFileDoesNotExistReaction.fail) {
          core.setFailed(`❌ ${error.message}`);
          return;
        } else if (localFileDoesNotExistReaction === LocalFileDoesNotExistReaction.warnIgnore) {
          core.warning(`⚠️ ${error.message}`);
        }

      } else {
        core.setFailed(`❌ ${error.message}`);
        return;
      }
    }

  }
};

main();

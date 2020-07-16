import { out } from '@a2r/telemetry';

import { log, framework, terminalCommand } from './colors';
import exec from '../tools/exec';
import checkDependencies from './checkDependencies';
import ensureNpmInit from './ensureNpmInit';
import copyFilesFromTemplate from './copyFilesFromTemplate';
import getLatestVersion from './getLatestVersion';
import setup from './setup';

import { mainTemplateFolder } from '../settings';

const init = async (): Promise<void> => {
  log(`>>> Initializing project with ${framework}`);
  const check = await checkDependencies();
  if (check) {
    const workingDirectory = process.cwd();
    await ensureNpmInit(workingDirectory);
    await copyFilesFromTemplate(mainTemplateFolder, workingDirectory);
    const latestVersion = await getLatestVersion();
    log(`Running ${terminalCommand(`npm install`)}...`);
    await exec('npm', ['install', `a2r@${latestVersion}`, '--save-dev']);
    await setup(workingDirectory, latestVersion);
    log(`<<< 👌 Project initialized successfully`);
  } else {
    out.error(`Some dependencies are missing`);
    log(`<<< 👎 Project can't be initialized`);
  }
};

export default init;

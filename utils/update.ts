import execa from 'execa';

import getLatestVersion from './getLatestVersion';
import { log, version, framework } from './colors';
import {
  getSettings,
  defaultDevServer,
  defaultServer,
  saveSettings,
} from './settings';
import getDockerImageVersion from './getDockerImageVersion';
import packageJSON from '../package.json';

import { defaultDockerImage, defaultDockerWorkDir } from '../settings';
import getCleanProjectName from './getCleanProjectName';

const update = async (): Promise<void> => {
  const latestVersion = await getLatestVersion();
  const { version: currentVersion } = packageJSON;

  if (latestVersion === currentVersion) {
    log(
      `Your project is already using the latest version (${version(
        currentVersion,
      )}) of ${framework} 👌`,
    );
  } else {
    log(
      `>>> Updating project from ${version(currentVersion)} to ${version(
        latestVersion,
      )}.`,
    );
    await execa('npm', ['install', `a2r@${latestVersion}`, '--save'], {
      stdout: process.stdout,
      stderr: process.stderr,
    });
    log('>>> Updating server');
    await execa(
      'npm',
      ['install', `a2r@${latestVersion}`, '--save-dev', '--prefix', './server'],
      {
        stdout: process.stdout,
        stderr: process.stderr,
      },
    );
    const settings = await getSettings();
    await Promise.all(
      settings.projects.map(
        async (p): Promise<void> => {
          log(`>>> Updating ${p.path}`);
          await execa(
            'npm',
            [
              'install',
              `a2r@${latestVersion}`,
              '--save-dev',
              '--prefix',
              `./${p.path}`,
            ],
            {
              stdout: process.stdout,
              stderr: process.stderr,
            },
          );
        },
      ),
    );
    log('>>> Checking for new docker images');
    const serverVersion = await getDockerImageVersion('server');
    if (serverVersion !== settings.server.version) {
      settings.server.version = serverVersion;
      log(
        `>>> Updated server docker from ${settings.server.version} to ${serverVersion}`,
      );
    }
    const devServerVersion = await getDockerImageVersion('server-dev');
    if (devServerVersion !== settings.devServer.version) {
      settings.devServer.version = devServerVersion;
      log(
        `>>> Updated dev server docker from ${settings.devServer.version} to ${devServerVersion}`,
      );
    }
    settings.server = {
      ...defaultServer,
      ...settings.server,
      env: {
        ...defaultServer.env,
        ...(settings.server.env || {}),
      },
    };
    settings.devServer = {
      ...defaultDevServer,
      ...settings.devServer,
      env: {
        ...defaultDevServer.env,
        ...(settings.devServer.env || {}),
      },
    };
    const cleanProjectName = await getCleanProjectName();
    settings.projects = settings.projects.map((p) => {
      if (p.type === 'next') {
        return {
          dockerBase: defaultDockerImage,
          dockerWorkingDir: defaultDockerWorkDir,
          dockerName: `${cleanProjectName}-${p.path}`,
          ...p,
        };
      }
      return p;
    });
    settings.version = latestVersion;
    await saveSettings(settings);
    log(`>>> Project updated to ${version(latestVersion)}.`);
  }
};

export default update;

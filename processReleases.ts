import { exec } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import fs from 'fs-extra';
import { type SimpleGit, simpleGit } from 'simple-git';

const promisifiedExec = promisify(exec);
const pwd = import.meta.dirname;

const github = 'https://github.com/software-mansion/TypeGPU.git';
const scriptToRun =
  'pnpm install && ATTEST_skipTypes=1 pnpm vitest run apps/typegpu-docs/tests/benchmark.test.ts 2> /dev/null';
const scriptToInstallDOM = 'pnpm add --dir apps/typegpu-docs -d jsdom';
const benchmarksDir = 'benchmarks';
const tmpDir = path.join(pwd, 'tmp');
const firstTagWithPERF = 'v0.6.0';
const includeNotStable = true;
const regexNotStable = /[a-z]/i;
const lastReleaseWithoutMocks = 'v0.7.1';

// relative to the root of cloned repo
const pathToInjectVitest = 'apps/typegpu-docs/vitest.config.mts';
const pathToInjectBenchmark = 'apps/typegpu-docs/tests/benchmark.test.ts';
const pathToInjectExtendedIt = 'packages/typegpu/tests/utils/extendedIt.ts';
const pathToInjectTestUtils =
  'packages/typegpu/tests/examples/utils/testUtils.ts';
const pathToInjectExamplesUtils = 'packages/typegpu/tests/examples/';

async function processRelease() {
  let git: SimpleGit;

  try {
    await fs.ensureDir(tmpDir);

    git = simpleGit();

    const tagsResult = await git.listRemote(['--tags', github]);
    if (!tagsResult) {
      console.warn('Could not fetch tags from the repository.');
    }

    const tagsFiltered = tagsResult
      .split('\n')
      .map((line) => line.split('refs/tags/').pop()?.trim())
      .filter((tag): tag is string =>
        !!tag && !tag.includes('{}') &&
        (!regexNotStable.test(tag.slice(1)) || includeNotStable) &&
        tag.localeCompare(firstTagWithPERF) >= 0
      )
      .sort();

    for (const tag of tagsFiltered) {
      const repoPath = path.join(tmpDir, tag);

      try {
        await git.clone(github, repoPath, ['--depth=1', `--branch=${tag}`]);
      } catch (_) {
        console.warn(`Cloning tag ${tag} failed.`);
      }

      if (tag.localeCompare(lastReleaseWithoutMocks) > 0) {
        await Promise.all([
          fs.copyFile(
            'templates/vitest.config.mts.template',
            path.join(repoPath, pathToInjectVitest),
          ),
          fs.copyFile(
            'templates/benchmark.test.ts.template.new',
            path.join(repoPath, pathToInjectBenchmark),
          ),
          // disables caching
          fs.copyFile(
            'templates/testUtils.ts.template.new',
            path.join(repoPath, pathToInjectTestUtils),
          ),
        ]);
      } else {
        await Promise.all([
          fs.copyFile(
            'templates/vitest.config.mts.template',
            path.join(repoPath, pathToInjectVitest),
          ),
          fs.copy(
            'templates/examples',
            path.join(repoPath, pathToInjectExamplesUtils),
          ),
          fs.copyFile(
            'templates/extendedIt.ts.template.old',
            path.join(repoPath, pathToInjectExtendedIt),
          ),
          fs.copyFile(
            'templates/benchmark.test.ts.template.old',
            path.join(repoPath, pathToInjectBenchmark),
          ),
        ]);
      }

      try {
        // sometimes there is a problem with missing jsdom
        await promisifiedExec(scriptToInstallDOM, {
          cwd: repoPath,
        });

        await promisifiedExec(scriptToRun, {
          cwd: repoPath,
        });
      } catch (error) {
        console.warn('pnpm failed.');
        console.log(error);
      }

      await fs.copyFile(
        path.join(repoPath, 'example-benchmark.json'),
        `${benchmarksDir}/${tag}.json`,
      );
    }
  } catch (error) {
    console.warn('Something went wrong in outer try-catch.');
    console.log(error);
  } finally {
    await fs.remove(tmpDir);
  }
}

await processRelease();

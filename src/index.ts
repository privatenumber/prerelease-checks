import cac from 'cac';
import Listr from 'listr';
import npmChecks from './tasks/npm-checks';
import gitChecks, { isGitRepo } from './tasks/git-checks';

const packageJson = require('../package.json'); // eslint-disable-line @typescript-eslint/no-var-requires

const cli = cac('prerelease-checks')
	.usage(' ')
	.option('--release-branch', 'Branch releases must happen from', {
		default: 'master',
	})
	.option('--required-npm', 'Required semver range for npm', {
		default: '>=6.8.0',
	})
	.option('--required-git', 'Required semver range for Git', {
		default: '>=2.11.0',
	})
	.help()
	.version(packageJson.version);

interface CliOptions {
	releaseBranch: string;
	requiredNpm: string;
	requiredGit: string;
	help: boolean;
	version: boolean;
}

const cliOptions = cli.parse().options as CliOptions;
if (!cliOptions.help && !cliOptions.version) {
	(new Listr([
		{
			title: 'npm',
			task: () => npmChecks,
		},
		{
			title: 'Git',
			skip: async () => !(await isGitRepo()) && 'Not a git repo. Skipping git checks.',
			task: () => gitChecks,
		},
	])).run(cliOptions).catch(() => {
		process.exit(1); // eslint-disable-line unicorn/no-process-exit
	});
}

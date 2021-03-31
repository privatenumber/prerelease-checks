import assert from 'assert';
import Listr from 'listr';
import semver from 'semver';
import execa from 'execa';

const isGitRepo = async (): Promise<boolean> => {
	try {
		await execa('git', ['rev-parse', '--is-inside-work-tree']);
		return true;
	} catch {
		return false;
	}
};

const getGitBranchName = async () => {
	const { stdout } = await execa('git', ['symbolic-ref', '--short', '-q', 'HEAD']);
	return stdout;
};

const getGitVersion = async () => {
	const { stdout } = await execa('git', ['version']);
	const match = /git version (\d+\.\d+\.\d+).*/.exec(stdout);
	return match?.[1];
};

const verifyRemoteIsValid = async () => {
	try {
		await execa('git', ['ls-remote', 'origin', 'HEAD']);
	} catch (error) {
		const fistErrorMessage = error.stderr.match(/fatal: .+/);
		throw new Error(fistErrorMessage);
	}
};

const gitStatus = async () => {
	const { stdout } = await execa('git', ['status', '--porcelain']);
	const files = stdout.split('\n').filter(Boolean);
	return files;
};

const gitOutOfSyncWithUpstream = async (branchName: string) => {
	try {
		await execa('git', ['fetch', 'origin', branchName]);
	} catch {
		throw new Error(`Failed to fetch origin/${branchName}`);
	}
	const { stdout } = await execa('git', ['status']);
	const outOfSync = stdout.match(/Your branch is (ahead|behind) .*/);

	// Examples:
	// Your branch is up to date with 'origin/master'.
	// Your branch is ahead of 'origin/master' by 1 commit.
	// Your branch is behind 'origin/master' by 38 commits, and can be fast-forwarded.
	return outOfSync ? outOfSync[0] : false;
};

const gitChecks = new Listr([
	{
		title: 'Verify Git version',
		async task(context, task) {
			task.title = 'Verifying Git version...';
			const gitVersion = await getGitVersion();
			const isValidGitVersion = semver.satisfies(gitVersion, context.requiredGit, {
				includePrerelease: true,
			});
			assert(isValidGitVersion, `Git version expected to satisfiy ${context.requiredGit}. Found ${gitVersion}`);

			task.title = `Git version is ${gitVersion}`;
		},
	},
	{
		title: 'Verify working directory is clean',
		async task(context, task) {
			task.title = 'Verifying working directory is clean...';
			const files = await gitStatus();
			assert(
				files.length === 0,
				`Expected working directory to be clean but found ${files.length} file${files.length > 1 ? 's' : ''}`,
			);
			task.title = 'Working directory is clean';
		},
	},
	{
		title: 'Verify current branch is release branch',
		async task(context, task) {
			task.title = 'Verifying current branch is release branch...';
			const currentBranchName = await getGitBranchName();
			assert(
				context.releaseBranch === currentBranchName,
				`Must be on release branch "${context.releaseBranch}". Found "${currentBranchName}".`,
			);
			task.title = `Current branch is "${context.releaseBranch}"`;
			context.gitCurrentBranchname = currentBranchName;
		},
	},
	{
		title: 'Verify remote head exists',
		async task(context, task) {
			task.title = 'Verifying remote head exists...';
			await verifyRemoteIsValid();
			task.title = 'Remote head exists';
		},
	},
	{
		title: 'Verify current branch is identical to upstream',
		async task(context, task) {
			task.title = 'Verifying current branch is identical to upstream...';
			const isOutOfSync = await gitOutOfSyncWithUpstream(context.gitCurrentBranchname);
			if (isOutOfSync) {
				throw new Error(isOutOfSync);
			}
			task.title = 'Current branch is identical to upstream';
		},
	},

	// TODO: Check Github protected branch push permissions
]);

export default gitChecks;
export { isGitRepo };

import assert from 'assert';
import Listr from 'listr';
import semver from 'semver';
import readPkgUp from 'read-pkg-up';
import isReachable from 'is-reachable';
import detectNpmRegistryUrl from 'registry-url';
import isScoped from 'is-scoped';
import validateNpmPackageName from 'validate-npm-package-name';
import execa from 'execa';

// Can't use npm ping because Artifactory doesn't support it
// https://www.jfrog.com/jira/browse/RTFACT-22341
/*
const npmPing = async (customRegistryUrl?: string) => {
	const registryUrlPattern = /npm notice PING (.+)/;
	try {
		const { stderr } = await execa('npm', [
			'ping',
			...(customRegistryUrl ? ['--registry', customRegistryUrl] : [])
		]);
		const registryUrl = stderr.match(registryUrlPattern);
		return registryUrl?.[1];
	} catch (error) {
		const registryUrl = error.stderr.match(registryUrlPattern);
		throw new Error(`Failed to connect to ${registryUrl?.[1]}`);
	}
};
*/

const getNpmVersion = async () => {
	const { stdout } = await execa('npm', ['--version']);
	return stdout;
};

const npmWhoAmI = async (registryUrl: string) => {
	try {
		const { stdout } = await execa('npm', [
			'whoami',
			'--registry',
			registryUrl,
		]);
		return stdout;
	} catch {
		throw new Error(`Not authenticated with ${registryUrl}`);
	}
};

interface NpmCollaborators {
	[key: string]: string;
}

const npmLsCollaborators = async (
	packageName: string,
	registyUrl: string,
): Promise<NpmCollaborators | boolean> => {
	try {
		const { stdout } = await execa('npm', [
			'access',
			'ls-collaborators',
			packageName,
			'--registry',
			registyUrl,
		]);
		return JSON.parse(stdout);
	} catch (error) {
		// Ignore non-existing package error
		if (error.stderr.includes('code E404')) {
			return false;
		}

		throw error;
	}
};

const npmChecks = new Listr([
	{
		title: 'Detect package.json',
		async task(context, task) {
			task.title = 'Detecting package.json...';
			const detectedPackageJson = await readPkgUp();
			assert(detectedPackageJson, 'package.json not found');
			const { packageJson, path } = detectedPackageJson;
			context.packageJson = packageJson;
			task.title = `Found package.json at ${path}`;
		},
	},
	{
		title: 'Validate package.json',
		async task(context, task) {
			task.title = 'Validating package.json...';
			const { packageJson } = context;
			const isValidPackageName = validateNpmPackageName(packageJson.name);
			if (!isValidPackageName.validForNewPackages) {
				throw new Error(isValidPackageName.errors[0]);
			}

			assert(semver.valid(packageJson.version), `Package version must be a valid semver. Found "${packageJson.version}"`);

			assert(
				!packageJson.private || isScoped(packageJson.name),
				'package must either be public or scoped',
			);

			// TODO: verify pack list and package.json#main,bin,etc

			task.title = 'Valid package.json';
		},
	},
	{
		title: 'Verify npm version',
		async task(context, task) {
			task.title = 'Verifying npm version...';
			const npmVersion = await getNpmVersion();
			const isValidNpmVersion = semver.satisfies(npmVersion, context.requiredNpm, {
				includePrerelease: true,
			});
			assert(isValidNpmVersion, `npm version expected to satisfiy ${context.requiredNpm}. Found ${npmVersion}`);

			task.title = `npm version is ${npmVersion}`;
		},
	},
	{
		title: 'Check npmrc registry',
		async task(context, task) {
			task.title = 'Checking npmrc registry...';
			const registryUrl = detectNpmRegistryUrl();
			// TODO: Check scoped registry too
			assert(
				await isReachable(registryUrl),
				`Failed to connect to ${registryUrl}`,
			);
			task.title = `Connected to npmrc registry ${registryUrl}`;
			context.publishRegistryUrl = registryUrl;
		},
	},
	{
		title: 'Check custom publish registry',
		skip(context) {
			if (!context.packageJson.publishConfig || !('registry' in context.packageJson.publishConfig)) {
				return 'No custom publish registry';
			}
		},
		async task(context, task) {
			task.title = 'Checking custom publish registry...';
			const customPublishRegistryUrl = context.packageJson.publishConfig?.registry;
			assert(
				typeof customPublishRegistryUrl === 'string'
				&& customPublishRegistryUrl.length > 0,
				'Invalid registry found in package.json at publishConfig.registry',
			);
			assert(
				await isReachable(customPublishRegistryUrl),
				`Failed to connect to ${customPublishRegistryUrl}`,
			);
			task.title = `Connected to custom publish registry ${customPublishRegistryUrl}`;
			context.publishRegistryUrl = customPublishRegistryUrl;
		},
	},
	{
		title: 'Verify user authentication with publish registry',
		async task(context, task) {
			task.title = 'Verifying user authentication with publish registry...';
			const {
				publishRegistryUrl,
				packageJson,
			} = context;
			const authenticatedAs = await npmWhoAmI(publishRegistryUrl);
			task.title = `User authenticated as "${authenticatedAs}"`;

			const collaborators = await npmLsCollaborators(packageJson.name, publishRegistryUrl);
			if (collaborators) {
				const permissions = collaborators[authenticatedAs];
				assert(
					permissions && permissions.includes('write'),
					`User "${authenticatedAs}" does not have write access to this package`,
				);
			}
		},
	},
]);

export default npmChecks;

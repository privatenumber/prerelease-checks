# prerelease-checks <a href="https://npm.im/prerelease-checks"><img src="https://badgen.net/npm/v/prerelease-checks"></a> <a href="https://npm.im/prerelease-checks"><img src="https://badgen.net/npm/dm/prerelease-checks"></a> <a href="https://packagephobia.now.sh/result?p=prerelease-checks"><img src="https://packagephobia.now.sh/badge?p=prerelease-checks"></a> <a href="https://bundlephobia.com/result?p=prerelease-checks"><img src="https://badgen.net/bundlephobia/minzip/prerelease-checks"></a>


<!-- <screenshot> -->
Run essential pre-release checks before releasing an npm package.

💞 Works well with [standard-version](https://github.com/conventional-changelog/standard-version)!


<sub>If you like this project, please star it & [follow me](https://github.com/privatenumber) to see what other cool projects I'm working on! ❤️</sub>

## 🙋‍♂️ Why?
Because there are many points of failure when making a release.

This CLI runs a thorough check to guarantee a successful package release:

#### npm
- ✅ Assert npm version
- ✅ Validate `package.json`
  - ✅ Check valid npm name
  - ✅ Check valid semver version
  - ✅ Verify public package
- ✅ Verify npm registry is reachable (in case custom)
- ✅ Verify npm publish registry is reachable
- ✅ Verify user is authenticated to publish registry and has permissions

#### Git
- ✅ Assert Git version
- ✅ Verify working directory is clean
- ✅ Verify current branch is release branch
- ✅ Verify remote head exists
- ✅ Verify current branch is identical to upstream

## 🚀 Install
```sh
npm i -D prerelease-checks
```

### npx
You can also install-and-run as you need it via npx:
```sh
npx prerelease-checks
```

## 🚦 Quick Setup


### As a prepublish hook
Add `prerelease-checks` as a [`prepublishOnly` hook](https://docs.npmjs.com/cli/v7/using-npm/scripts#life-cycle-scripts) in your `package.json`:
```diff
 {
   "scripts": {
+    "prepublishOnly": "prerelease-checks"
   }
 }
```


### With standard-version
If you're using [standard-version](https://github.com/conventional-changelog/standard-version), add it to their `prerelease` hook.

```diff
 {
   "scripts": {
+    "prerelease": "prerelease-checks",
     "release": "standard-version"
   }
 }
```

### Other
You can prepend your release script with `prerelease-checks`.

```diff
 {
   "scripts": {
+    "release": "prerelease-checks && my-custom-release-command",
   }
 }
```


## 🙏 Credits
Many inspirations taken from the prerequisite checks from [np](https://github.com/sindresorhus/np/).

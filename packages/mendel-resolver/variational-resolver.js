const ModuleResolver = require('./index');
const path = require('path');
const variationMatches = require('mendel-development/variation-matches');

class VariationalModuleResolver extends ModuleResolver {
    constructor(config) {
        super(config);

        // Must be a path relative to the basedir
        this.projectRoot = config.projectRoot;
        this.baseDir = config.baseDir;
        this.baseVarDir = config.baseVarDir;
        this.key = config.key;
        this.variation = config.variation;
        this.variations = config.variations;
        this.variationConfig = config.variationConfig;
    }

    resolveFile(modulePath) {
        if (!this.variation) return super.resolveFile(modulePath);

        let promise = Promise.reject();
        this.variations.forEach(variation => {
            const file = path.resolve(this.projectRoot, variation, this.key);
            promise = promise.catch(() => super.resolveFile(file));
        });
        return promise;
    }

    _processPackageJson(moduleName, pkg) {
        // Easy case: package.json was present in the variational directory
        // we won't merge base's and variation's package.json so this package.json
        // MUST contain complete information that resolves perfectly.
        const resolveFiles = this.envNames
            .filter(name => pkg[name])
            .map(name => {
                return this.resolveFile(path.join(moduleName, pkg[name]))
                    // `resolveFile` returns Object with all values the same and that is useless for us.
                    .then(fileResolved => ({name, path: fileResolved[name]}))
                    // Even if file does not resolve, let's not make the promise all fail fast.
                    .catch(() => {});
            });

        return Promise.all(resolveFiles).then(resolves => {
            const resolved = {};
            // for failed case, we returned undefined in the catch above so lets filter that out.
            resolves.filter(Boolean).forEach(({name, path}) => {
                resolved[name] = path;
            });
            this.envNames.filter(name => !resolved[name]).forEach(name => resolved[name] = resolved.main);
            return resolved;
        });
    }

    resolveDir(moduleName) {
        const configVariations = this.variationConfig.variations;
        const match = variationMatches(configVariations, moduleName);

        if (!match) return super.resolveDir(moduleName);

        let promise = Promise.reject();
        this.variations.forEach(variation => {
            const packagePath = path.join(
                variation,
                match.file,
                '/package.json'
            );
            promise = promise.catch(() => {
                return this.readPackageJson(packagePath)
                .then(varPackageJson => {
                    return this._processPackageJson(moduleName, varPackageJson);
                });
            });
        });

        return promise.catch(() => {
            return this.resolveFile(path.join(moduleName, 'index'));
        });
    }
}

module.exports = VariationalModuleResolver;

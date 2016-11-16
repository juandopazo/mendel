const path = require('path');
const Entry = require('./entry.js');
const variationMatches = require('mendel-development/variation-matches');

class MendelCache {
    constructor(config) {
        this._store = new Map();
        this._baseConfig = config.baseConfig;
        this._variations = config.variationConfig.variations;
    }

    getNormalizedId(id) {
        if (isNodeModule(id)) return id;

        const match = variationMatches(this._variations, id);
        if (match) {
            return match.file.replace(/(package\.json|\/index\.jsx?)$/, '');
        }

        return id;
    }

    getType(id) {
        if (isNodeModule(id)) return 'node_modules';

        const extname = path.extname(id);
        if (['.js', '.jsx', '.json'].indexOf(extname) >= 0) return 'source';
        return 'binary';
    }

    getVariation(path) {
        const match = variationMatches(this._variations, path);
        if (match) return match.variation;
    }

    addEntry(id) {
        this._store.set(id, new Entry(id));
        const entry = this._store.get(id);
        entry.variation = this.getVariation(id);
        entry.key = this.getNormalizedId(id);
        entry.type = this.getType(id);
    }

    hasEntry(id) {
        return this._store.has(id);
    }

    deleteEntry(id) {
        this._store.delete(id);
    }

    getEntry(id) {
        return this._store.get(id);
    }

    setDependencies(id, dependencyMap) {
        const entry = this.getEntry(id);

        Object.keys(dependencyMap).forEach(dependencyKey => {
            const dep = dependencyMap[dependencyKey];
            dep.browser = this.getNormalizedId(dep.browser);
            dep.main = this.getNormalizedId(dep.main);
        });

        entry.setDependencies(dependencyMap);
    }
}

function isNodeModule(id) {
    return id.indexOf('node_modules') >= 0;
}

module.exports = MendelCache;

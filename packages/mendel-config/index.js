var path = require('path');
var yaml = require('js-yaml');
var fs = require('fs');
var xtend = require('xtend');

function findConfig(where) {
    var parts = where.split(path.sep);

    do {
        var loc = parts.join(path.sep);
        if (!loc) break;

        var config;
        var mendelrc = process.env.MENDELRC || '.mendelrc';
        var rc = path.join(loc, mendelrc);
        if (fs.existsSync(rc)) {
            config = loadFromYaml(rc);
            config.projectRoot = path.dirname(rc);
            return config;
        }

        var packagejson = path.join(loc, 'package.json');
        if (fs.existsSync(packagejson)) {
            var pkg = require(path.resolve(packagejson));
            if (pkg.mendel) {
                config = pkg.mendel;
                config.projectRoot = path.dirname(packagejson);
                return config;
            }
        }

        parts.pop();
    } while (parts.length);

    return {};
}

function loadFromYaml(path) {
    return yaml.safeLoad(fs.readFileSync(path, 'utf8'));
}

module.exports = function(config) {
    if (typeof config === 'string') config = {cwd: config};
    if (typeof config !== 'object') config = {};

    var cwd = config.cwd || config.basedir || process.cwd();

    // support --no-config or {config: false} to skip looking for file configs
    if (config.config !== false) {
        var fileConfig = findConfig(cwd);
        // in case we found a file config, assign by priority
        if (fileConfig.projectRoot) {
            config = xtend(fileConfig, config);
            // but force projectRoot to always be consistent
            config.projectRoot = fileConfig.projectRoot;
        }
    }


    // require only inside conditional
    // This way Mendel v2 can use ES6 and v1 is still compatible with node 0.10
    if (config['base-config']) {
        return require('./src')(config);
    } else {
        config.basedir = config.projectRoot;
        return require('./legacy')(config);
    }
};

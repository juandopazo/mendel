var path = require('path');
var createValidator = require('./validator');

function BaseConfig(config) {
    var baseConfig = config['base-config'];
    delete config['base-config'];

    this.id = baseConfig.id;
    this.dir = path.relative(config.projectRoot, baseConfig.dir || '');
    this.absDir = path.resolve(config.projectRoot, this.dir);

    BaseConfig.validate(this);
}

BaseConfig.validate = createValidator({
    id: {required: true},
    dir: {required: true},
});

module.exports = BaseConfig;

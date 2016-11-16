var parseVariations = require('../variations');

function VariationConfig(config) {
    const variations = parseVariations(config);

    // include base variation
    variations.push({
        id: config.baseConfig.id,
        chain: [config.baseConfig.dir],
    });

    // allDirs is needed in many plaices
    const allDirs = variations.reduce(
        (allDirs, variation) => {
            variation.chain.forEach(dir => {
                if (!allDirs.includes(dir)) allDirs.push(dir);
            });
            return allDirs;
        },
        // start with base.dir consistently
        [config.baseConfig.dir]
    );

    return {allDirs, variations};
}

module.exports = VariationConfig;

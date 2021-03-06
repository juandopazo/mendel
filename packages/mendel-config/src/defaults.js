/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

module.exports = function() {
    return {
        cwd: process.cwd(),
        'base-config': {
            id: 'base',
            dir: process.cwd(),
        },
        'build-dir': 'mendel-build',
        'variation-config': {
            'variation-dirs': [],
            variations: {},
        },
        'route-config': {
            variation: '/mendel/:variations/:bundle',
            hash: '/mendel/:hash/:bundle',
        },
        transforms: {},
        types: {},
        generators: {},
        env: {},
        bundles: {},
    };
};

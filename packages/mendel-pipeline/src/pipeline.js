const debug = require('debug')('mendel:pipeline');
const analyticsCollector = require('./helpers/analytics/analytics-collector');
const analyzeSteps = require('./helpers/analytics/analytics')('steps');
const AnalyticsCliPrinter = require('./helpers/analytics/cli-printer');
const Transformer = require('./transformer');
const MendelRegistry = require('./registry');
const DepResolver = require('./deps');
const Initialize = require('./step/initialize');
const Watcher = require('./step/fs-watcher');
const Reader = require('./step/fs-reader');
const IST = require('./step/ist');

module.exports = MendelPipeline;

function MendelPipeline(options) {
    analyticsCollector.setOptions({
        printer: new AnalyticsCliPrinter({enableColor: true}),
    });

    const registry = new MendelRegistry(options);
    const transformer = new Transformer(options.transforms, options);
    const depsResolver = new DepResolver(options);

    const toolset = {registry, transformer, depsResolver};

    // Pipeline steps
    const initializer = new Initialize(toolset, options);
    const watcher = new Watcher(toolset, options);
    const reader = new Reader(toolset, options);
    const ist = new IST(toolset, options);
    const steps = [watcher, reader, ist];

    steps.forEach((curStep, i) => {
        const nextStep = i < steps.length - 1 ? steps[i + 1] : null;
        curStep.on('done', function({entryId}) {
            analyzeSteps.toc(`${curStep.constructor.name}:${entryId}`);
            const entry = registry.getEntry(entryId);
            entry.incrementStep();

            if (!nextStep) return;

            analyzeSteps.tic(`${nextStep.constructor.name}:${entryId}`);
            nextStep.perform.apply(nextStep, [entry].concat(Array.prototype.slice.call(arguments, 1)));
        });
    });

    if (options.watch !== true) {
        let totalEntries = 0;
        let doneDeps = 0;

        watcher.on('done', () => totalEntries++);
        ist.on('done', () => {
            doneDeps++;
            if (totalEntries === doneDeps) {
                debug(`${totalEntries} entries were processed.`);
                debug(
                    Array.from(registry._mendelCache._store.values())
                    .map(({id}) => id)
                    .join('\n')
                );
                process.exit(0);
            }
        });
    }

    // COMMENCE!
    initializer.start();
}

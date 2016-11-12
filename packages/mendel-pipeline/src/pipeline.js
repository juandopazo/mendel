const _debug = require('debug');
const analyzeSteps = require('./helpers/analytics/analytics')('steps');

const IST = require('./step/ist');
const DepResolver = require('./step/deps');
const EventEmitter = require('events').EventEmitter;

module.exports = class MendelPipeline extends EventEmitter {
    constructor({defaultSteps, state, options}) {
        super();
        this._debug = _debug(`mendel:pipeline:${options.environment}`);

        // Steps init
        const ist = new IST(state, options);
        const depsResolver = new DepResolver(state, options);

        // Steps order
        const steps = [
            defaultSteps.watcher,
            defaultSteps.reader,
            ist,
            depsResolver,
        ];

        // Async step chain
        steps.forEach((curStep, i) => {
            const nextStep = i < steps.length - 1 ? steps[i + 1] : null;
            curStep.on('done', function({entryId}) {
                analyzeSteps.toc(`${curStep.constructor.name}:${entryId}`);
                const entry = state.registry.getEntry(entryId);
                entry.incrementStep();

                if (!nextStep) return;

                analyzeSteps.tic(`${nextStep.constructor.name}:${entryId}`);
                nextStep.perform.apply(nextStep,
                    [entry].concat(Array.prototype.slice.call(arguments, 1)));
            });
        });

        this.state = state;
        this.steps = steps;
        this.options = options;
    }

    watch() {
        this._debug('working');

        let startedEntries = 0;
        let doneEntries = 0;

        this.steps[0]
            .on('done', () => startedEntries++);

        this.steps[this.steps.length-1]
            .on('done', () => { doneEntries++;

                if (startedEntries === doneEntries) {

                    const total = this.state.registry.size();
                    this._debug(`${doneEntries} entries were processed.`);
                    this._debug(`${total} entries in registry.`);

                    startedEntries = 0;
                    doneEntries = 0;

                    this.emit('idle', doneEntries);
                }
            });

        // TODO: initializer to init based on options, not hardcoded
        // Listen to everything in cwd
        this.state.registry.addToPipeline('.');
    }

    run() {
        /*

        TODO:

        This detection is very crude and contains racing conditions.

        Sometimes a "entryRequested" by deps and before FSWatcher can
        emit('done') the idle state is achieved.

        This will not be a problem in the future when we have outlets, since
        outlets will need to wait for the whole graph with async patterns. This
        will force the process to wait.

        */
        this.on('idle', () => {
            const breakLine = '\n    ';
            const entries = this.state.registry.entries();
            this._debug(
                breakLine + entries.map(({id}) => id).join(breakLine)
            );
            process.exit(0);
        });
        this.watch();
    }
};

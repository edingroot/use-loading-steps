import {useRef} from 'react'
import {createMachine} from "xstate";
import {useMachine} from "@xstate/react";
import {delayExec, isProdEnv} from "./utils";

interface Options {
    renderDelay?: number;
    resetDelay?: number;
    doneDelay?: number;
    name?: string;
}

export enum LState {
    PRE_LOADING = 'PRE_LOADING',
    LOADING = 'LOADING',
    PRE_DONE = 'PRE_DONE',
    DONE = 'DONE',
}

const newLoadingFSM = (initialState: string, resetState: string) => createMachine({
    id: 'loading_fsm',
    initial: initialState,
    states: {
        [LState.PRE_LOADING]: {
            on: {
                LOADING: LState.LOADING,
                FINISH: LState.PRE_DONE,
                DONE: LState.DONE,
                RESET: resetState,
            },
        },
        [LState.LOADING]: {
            on: {
                FINISH: LState.PRE_DONE,
                DONE: LState.DONE,
                RESET: resetState,
            },
        },
        [LState.PRE_DONE]: {
            on: {
                DONE: LState.DONE,
                RESET: resetState,
            },
        },
        [LState.DONE]: {
            on: {
                RESET: resetState,
            },
        },
    }
});

export const isLoading = (state) => LState.LOADING === state;
export const isDone = (state) => LState.DONE === state;
export const isReloading = (state) => [LState.PRE_LOADING, LState.LOADING].includes(state);

export const useLoadingSteps = (totalSteps: number, initialLoaded: boolean = false, options: Options = {}) => {
    const {renderDelay = 0, resetDelay = 0, doneDelay = 0, name = 'Loading'} = options;
    const resetState: LState = resetDelay ? LState.PRE_LOADING : LState.LOADING;
    let initialState: LState = LState.DONE;
    if (!initialLoaded) {
        initialState = renderDelay ? LState.PRE_LOADING : LState.LOADING;
    }

    const fsm = useRef(newLoadingFSM(initialState, resetState));
    const [loadingState, transition, fsmService] = useMachine(fsm.current);
    const preLoadingDelay = useRef(renderDelay);
    const lastState = useRef("");
    const doneSteps = useRef(new Map());
    const timers = useRef([]);

    const startTime = useRef(new Date());
    const elapsed = (): number => (new Date().getTime()) - startTime.current.getTime();
    const debug = msg => !isProdEnv() && console.debug(`[${name}]${msg} @${elapsed()}ms`);
    const isFinished = () => doneSteps.current.size >= totalSteps;

    // FSM state change listener
    fsmService.onTransition(state => {
        if (lastState.current === state.value) {
            return;
        }
        lastState.current = state.value.toString();
        debug(`[transition] ${state.value}`);

        if (state.value === LState.PRE_LOADING) {
            timers.current.push(delayExec(() => transition('LOADING'), preLoadingDelay.current));
        }
        if (state.value === LState.PRE_DONE) {
            timers.current.push(delayExec(() => transition('DONE'), doneDelay));
        }
    });

    const addStep = (stepName, msg) => {
        if (isFinished()) {
            return;
        }

        doneSteps.current.set(stepName, true);
        debug(`[${doneSteps.current.size}/${totalSteps}] ${msg}: ${stepName}`);

        // When the PRE_LOADING onTransition callback not called yet (due to delay caused by js single thread)
        if (elapsed() > preLoadingDelay.current) {
            transition('LOADING');
        }

        if (isFinished()) {
            transition(doneDelay ? 'FINISH' : 'DONE');
        }
    };
    const setStepDone = stepName => addStep(stepName, 'done');
    const skipStep = stepName => addStep(stepName, 'skipped');

    const resetLoading = () => {
        doneSteps.current.clear();
        startTime.current = new Date();
        preLoadingDelay.current = Math.max(resetDelay, renderDelay);

        debug(`[reset] delay ${preLoadingDelay.current}ms resetting to ${resetState}`);
        timers.current.forEach(timer => timer && clearTimeout(timer));
        timers.current.length = 0;
        transition('RESET');
    };
    return [loadingState.value, setStepDone, resetLoading, skipStep];
};

export default useLoadingSteps;

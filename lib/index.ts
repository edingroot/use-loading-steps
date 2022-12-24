import {useRef} from 'react'
import {createMachine} from "xstate";
import {useMachine} from "@xstate/react";

export enum LState {
    SILENT_LOADING = 'SILENT_LOADING',  // for: do loading but not to show loading animation
    LOADING = 'LOADING',                // for: show loading animation
    DELAY_DONE = 'DELAY_DONE',          // for: loading finished but keep showing loading animation
    DONE = 'DONE',                      // for: all ready
}

enum FSMEvent {
    START_LOADING = 'START_LOADING',
    LOADING_FINISHED = 'LOADING_FINISHED',
    SET_DONE = 'SET_DONE',
    RESET = 'RESET',
}

const createFSM = (initialState: LState, resetState: LState) => createMachine({
    id: 'loading_fsm',
    initial: initialState,
    states: {
        [LState.SILENT_LOADING]: {
            on: {
                [FSMEvent.START_LOADING]: LState.LOADING,
                [FSMEvent.LOADING_FINISHED]: LState.DELAY_DONE,
                [FSMEvent.SET_DONE]: LState.DONE,
                [FSMEvent.RESET]: resetState,
            },
        },
        [LState.LOADING]: {
            on: {
                [FSMEvent.LOADING_FINISHED]: LState.DELAY_DONE,
                [FSMEvent.SET_DONE]: LState.DONE,
                [FSMEvent.RESET]: resetState,
            },
        },
        [LState.DELAY_DONE]: {
            on: {
                [FSMEvent.SET_DONE]: LState.DONE,
                [FSMEvent.RESET]: resetState,
            },
        },
        [LState.DONE]: {
            on: {
                [FSMEvent.RESET]: resetState,
            },
        },
    }
});

// Utility functions
export const isLoading = (state: LState) => LState.LOADING === state;
export const isReloading = (state: LState) => [LState.SILENT_LOADING, LState.LOADING].includes(state);
export const isDone = (state: LState) => LState.DONE === state;

interface Options {
    renderDelay?: number; // timeout of SILENT_LOADING state after started
    resetDelay?: number;  // timeout of SILENT_LOADING state after reset
    doneDelay?: number;   // timeout of DELAY_DONE state
    name?: string;        // for debug log (useful if there are multiple pages / components use this hook)
}

export const useLoadingSteps = (totalSteps: number, initialLoaded: boolean = false, options: Options = {}): [
    loadingState: LState,
    setStepDone: (stepName: string) => void,
    resetLoading: () => void,
    skipStep: (stepName: string) => void
] => {
    const {renderDelay = 0, resetDelay = 0, doneDelay = 0, name = 'Loading'} = options;
    let initialState: LState = LState.DONE;
    if (!initialLoaded) {
        initialState = renderDelay ? LState.SILENT_LOADING : LState.LOADING;
    }
    const resetState: LState = resetDelay ? LState.SILENT_LOADING : LState.LOADING;

    const fsm = useRef(createFSM(initialState, resetState));
    const [loadingState, transition, fsmService] = useMachine(fsm.current);
    const silentLoadingTimeout = useRef(renderDelay);
    const lastState = useRef("<init>");
    const doneSteps = useRef(new Map());
    const timers = useRef([] as number[]);

    const startTime = useRef(new Date());
    const elapsed = (): number => (new Date().getTime()) - startTime.current.getTime();
    const debug = (msg: string) => !isProdEnv() && console.debug(`[${name}]${msg} @${elapsed()}ms`);
    const isFinished = () => doneSteps.current.size >= totalSteps;

    fsmService.onTransition(state => {
        if (lastState.current === state.value) {
            return;
        }
        debug(`[transition] ${lastState.current} -> ${state.value}`);
        lastState.current = state.value.toString();

        if (state.value === LState.SILENT_LOADING) {
            timers.current.push(delayExec(() => transition(FSMEvent.START_LOADING), silentLoadingTimeout.current)!);
        }
        if (state.value === LState.DELAY_DONE) {
            timers.current.push(delayExec(() => transition(FSMEvent.SET_DONE), doneDelay)!);
        }
    });

    const addStep = (stepName: string, msg: string): void => {
        if (isFinished()) {
            return;
        }
        doneSteps.current.set(stepName, true);
        debug(`[${doneSteps.current.size}/${totalSteps}] ${msg}: ${stepName}`);

        // When the SILENT_LOADING onTransition callback not called yet (due to delay caused by js single thread)
        if (elapsed() > silentLoadingTimeout.current) {
            transition(FSMEvent.START_LOADING);
        }

        if (isFinished()) {
            transition(doneDelay ? FSMEvent.LOADING_FINISHED : FSMEvent.SET_DONE);
        }
    };
    const setStepDone = (stepName: string) => addStep(stepName, 'done');
    const skipStep = (stepName: string) => addStep(stepName, 'skipped');

    const resetLoading = () => {
        doneSteps.current.clear();
        startTime.current = new Date();
        silentLoadingTimeout.current = Math.max(resetDelay, renderDelay);

        debug(`[reset] delay ${silentLoadingTimeout.current}ms resetting to ${resetState}`);
        timers.current.forEach(timer => Number.isInteger(timer) && clearTimeout(timer));
        timers.current.length = 0;
        transition(FSMEvent.RESET);
    };
    return [<LState>loadingState.value.toString(), setStepDone, resetLoading, skipStep];
};

const isProdEnv = () => process.env.NODE_ENV === "production";

const delayExec = (fn: Function, delay: number): number | null => {
    if (delay > 0) return setTimeout(fn, delay);
    fn();
    return null;
};

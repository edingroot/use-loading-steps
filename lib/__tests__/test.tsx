import 'regenerator-runtime/runtime';
import {isDone, isLoading, isReloading, LState, useLoadingSteps} from "../index";
import React, {useMemo} from "react";
import {createTestComponent, neverCalled, wait} from "../test_util";

describe('no delay', () => {
    it('initial loaded = true', async () =>  {
        await createTestComponent(() => {
            const [loadingState] = useLoadingSteps(0, true);
            expect(loadingState).toEqual(LState.DONE);
        });
    });

    it('initial loaded = true, setSetDone', async () =>  {
        let expectedState: LState = LState.DONE;

        await createTestComponent(() => {
            const [loadingState, setStepDone] = useLoadingSteps(1, true);

            useMemo(() => expect(loadingState).toEqual(expectedState), [loadingState]);
            setStepDone('step1');
        });
    });

    it('initial loaded = true, redundant setSetDone', async () =>  {
        let expectedState: LState = LState.DONE;

        await createTestComponent(() => {
            const [loadingState, setStepDone] = useLoadingSteps(1, true);

            useMemo(() => expect(loadingState).toEqual(expectedState), [loadingState]);
            setStepDone('step1');
            setStepDone('step1');
            setStepDone('step2');
        });
    });

    it('single step', async () =>  {
        let expectedState: LState;
        let setStepDoneCb: (s: string) => void = neverCalled;

        // Do before creating test component
        const doSteps = async () => {
            expectedState = LState.LOADING;
            await wait(10); // pause shortly for event loop to run component logics
            expectedState = LState.DONE;
            setStepDoneCb('step1');
        }
        doSteps().then();

        await createTestComponent(() => {
            const [loadingState, setStepDone] = useLoadingSteps(1);
            setStepDoneCb = setStepDone;
            useMemo(() => expect(loadingState).toEqual(expectedState), [loadingState]);
        });
    });

    it('multiple steps', async () =>  {
        const stepCnt = 3;
        let expectedState: LState;
        let setStepDoneCb: (s: string) => void = neverCalled;

        // Do before creating test component
        const doSteps = async () => {
            expectedState = LState.LOADING;

            await wait(10);
            for (let i = 0; i < stepCnt; i++) {
                if (i == stepCnt - 1) {
                    expectedState = LState.DONE;
                }
                setStepDoneCb(`step${i + 1}`);
                await wait(10); // pause shortly for event loop to run component logics
            }
        }
        doSteps().then();

        await createTestComponent(() => {
            const [loadingState, setStepDone] = useLoadingSteps(stepCnt, false);
            setStepDoneCb = setStepDone;
            useMemo(() => expect(loadingState).toEqual(expectedState), [loadingState]);
        });
    });

    it('multiple steps: skip step', async () =>  {
        const stepCnt = 3;
        let expectedState: LState;
        let setStepDoneCb: (s: string) => void = neverCalled;
        let skipStepCb: (s: string) => void = neverCalled;

        // Do before creating test component
        const doSteps = async () => {
            expectedState = LState.LOADING;

            await wait(10);
            for (let i = 0; i < stepCnt; i++) {
                if (i == stepCnt - 1) {
                    expectedState = LState.DONE;
                }
                if (i % 2 === 0) {
                    setStepDoneCb(`step${i + 1}`);
                } else {
                    skipStepCb(`step${i + 1}`);
                }
                await wait(10); // pause shortly for event loop to run component logics
            }
        }
        doSteps().then();

        await createTestComponent(() => {
            const [loadingState, setStepDone, _, skipStep] = useLoadingSteps(stepCnt, false);
            setStepDoneCb = setStepDone;
            skipStepCb = skipStep;
            useMemo(() => expect(loadingState).toEqual(expectedState), [loadingState]);
        });
    });
});

describe('with render delay', () => {
    const renderDelay = 150;

    it('initial loaded = true', async () => {
        await createTestComponent(() => {
            const [loadingState] = useLoadingSteps(0, true, {
                renderDelay: renderDelay,
            });
            useMemo(() => expect(loadingState).toEqual(LState.DONE), [loadingState]);
        });
    });

    it('single step', async () => {
        let expectedState: LState;
        let setStepDoneCb: (s: string) => void = neverCalled;

        // Do before creating test component
        const doSteps = async () => {
            expectedState = LState.SILENT_LOADING;

            await wait(renderDelay - 10);
            expectedState = LState.LOADING;

            await wait(100);
            expectedState = LState.DONE;
            setStepDoneCb('step1');
        }
        doSteps().then();

        await createTestComponent(() => {
            const [loadingState, setStepDone] = useLoadingSteps(1, false, {
                renderDelay: renderDelay,
            });
            setStepDoneCb = setStepDone;
            useMemo(() => expect(loadingState).toEqual(loadingState), [loadingState]);
        }, 300);
    });

    it('multiple steps', async () => {
        let expectedState: LState;
        let setStepDoneCb: (s: string) => void = neverCalled;

        // Do before creating test component
        const doSteps = async () => {
            expectedState = LState.SILENT_LOADING;

            await wait(renderDelay - 10);
            expectedState = LState.LOADING;

            await wait(100);
            setStepDoneCb('step1');

            await wait(100);
            expectedState = LState.DONE;
            setStepDoneCb('step2');
        }
        doSteps().then();

        await createTestComponent(() => {
            const [loadingState, setStepDone] = useLoadingSteps(2, false, {
                renderDelay: renderDelay,
            });
            setStepDoneCb = setStepDone;
            useMemo(() => expect(loadingState).toEqual(expectedState), [loadingState]);
        }, 400);
    });

    it('multiple steps: done before render delay timeout', async () => {
        let expectedState: LState;
        let setStepDoneCb: (s: string) => void = neverCalled;

        // Do before creating test component
        const doSteps = async () => {
            expectedState = LState.SILENT_LOADING;

            await wait(10);
            setStepDoneCb('step1');

            await wait(10);
            expectedState = LState.DONE;
            setStepDoneCb('step2');

            await wait(renderDelay - 10);
        }
        doSteps().then();

        await createTestComponent(() => {
            const [loadingState, setStepDone] = useLoadingSteps(2, false, {
                renderDelay: renderDelay,
            });
            setStepDoneCb = setStepDone;
            useMemo(() => expect(loadingState).toEqual(expectedState), [loadingState]);
        });
    });
});

describe('with reset delay', () => {
    const resetDelay = 150;

    it('multiple steps', async () => {
        let expectedState: LState;
        let setStepDoneCb: (s: string) => void = neverCalled;
        let resetLoadingCb: () => void = neverCalled;

        // Do before creating test component
        const doSteps = async () => {
            expectedState = LState.LOADING;

            await wait(100);
            setStepDoneCb('step1');

            await wait(100);
            expectedState = LState.DONE;
            setStepDoneCb('step2');

            await wait(100);
            expectedState = LState.SILENT_LOADING;
            resetLoadingCb();

            await wait(resetDelay - 10);
            expectedState = LState.LOADING;

            await wait(100);
            expectedState = LState.DONE;
            setStepDoneCb('step1');
            setStepDoneCb('step2');
        }
        doSteps().then();

        await createTestComponent(() => {
            const [loadingState, setStepDone, resetLoading] = useLoadingSteps(2, false, {
                resetDelay: resetDelay,
            });
            setStepDoneCb = setStepDone;
            resetLoadingCb = resetLoading;
            useMemo(() => expect(loadingState).toEqual(expectedState), [loadingState]);
        }, 500);
    });
});

describe('with render delay + reset delay', () => {
    const renderDelay = 100;
    const resetDelay = 150;

    it('multiple steps', async () => {
        let expectedState: LState;
        let setStepDoneCb: (s: string) => void = neverCalled;
        let resetLoadingCb: () => void = neverCalled;

        // Do before creating test component
        const doSteps = async () => {
            expectedState = LState.SILENT_LOADING;

            await wait(renderDelay - 10);
            expectedState = LState.LOADING;

            await wait(50);
            setStepDoneCb('step1');

            await wait(50);
            expectedState = LState.DONE;
            setStepDoneCb('step2');

            await wait(50);
            expectedState = LState.SILENT_LOADING;
            resetLoadingCb();

            await wait(resetDelay - 10);
            expectedState = LState.LOADING;

            await wait(50);
            expectedState = LState.DONE;
            setStepDoneCb('step1');
            setStepDoneCb('step2');
        }
        doSteps().then();

        await createTestComponent(() => {
            const [loadingState, setStepDone, resetLoading] = useLoadingSteps(2, false, {
                renderDelay: renderDelay,
                resetDelay: resetDelay,
            });
            setStepDoneCb = setStepDone;
            resetLoadingCb = resetLoading;
            useMemo(() => expect(loadingState).toEqual(expectedState), [loadingState]);
        }, 500);
    });
});

describe('with done delay', () => {
    const doneDelay = 150;

    it('multiple steps', async () => {
        let expectedState: LState;
        let setStepDoneCb: (s: string) => void = neverCalled;

        // Do before creating test component
        const doSteps = async () => {
            expectedState = LState.LOADING;

            await wait(10); // pause shortly for event loop to run component logics
            expectedState = LState.DELAY_DONE;
            setStepDoneCb('step1');
            setStepDoneCb('step2');

            await wait(doneDelay - 10);
            expectedState = LState.DONE;
        }
        doSteps().then();

        await createTestComponent(() => {
            const [loadingState, setStepDone] = useLoadingSteps(2, false, {
                doneDelay: doneDelay,
            });
            setStepDoneCb = setStepDone;
            useMemo(() => expect(loadingState).toEqual(expectedState), [loadingState]);
        }, 300);
    });
});

describe('util functions', () => {
    it('isLoading', async () => {
        const positiveTargets = [LState.LOADING];
        const negativeTargets = [LState.SILENT_LOADING, LState.DELAY_DONE, LState.DONE];
        positiveTargets.forEach(v => expect(isLoading(v)).toEqual(true));
        negativeTargets.forEach(v => expect(isLoading(v)).toEqual(false));
    });

    it('isReloading', async () => {
        const positiveTargets = [LState.SILENT_LOADING, LState.LOADING];
        const negativeTargets = [LState.DELAY_DONE, LState.DONE];
        positiveTargets.forEach(v => expect(isReloading(v)).toEqual(true));
        negativeTargets.forEach(v => expect(isReloading(v)).toEqual(false));
    });

    it('isDone', async () => {
        const positiveTargets = [LState.DONE];
        const negativeTargets = [LState.SILENT_LOADING, LState.LOADING, LState.DELAY_DONE];
        positiveTargets.forEach(v => expect(isDone(v)).toEqual(true));
        negativeTargets.forEach(v => expect(isDone(v)).toEqual(false));
    });
});

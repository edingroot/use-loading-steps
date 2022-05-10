import React from "react";
import renderer, {act} from "react-test-renderer";
import {LState} from "./index";

export async function wait(period: number): Promise<void> {
    return period > 0 ? new Promise(resolve => setTimeout(resolve, period)) : Promise.resolve();
}

export function neverCalled() {
    throw new Error('This function should not be called');
}

export async function createTestComponent(logic: () => void, waitToFinish = 100) {
    const Component = ({}): React.ReactElement | null => {
        logic();
        return null;
    };
    await act(async () => {
        renderer.create(<Component/>);
        await wait(waitToFinish);
    });
}

# use-loading-steps
[![npm version](https://badge.fury.io/js/use-loading-steps.svg)](https://www.npmjs.com/package/use-loading-steps)

A simple state management library for smooth react page loading experience.


## Install
```bash
yarn add use-loading-steps
# or
npm install --save use-loading-steps
```


## Usage
```javascript
const [loadingState, setStepDone, resetLoading, skipStep] = useLoadingSteps(taskCount, initLoaded, options);
```
*useLoadingSteps* hook params
- `taskCount`: the number of steps should be done before the page is loaded.
- `initLoaded`: set to true to skip all state transitions, loadingState = `DONE`.
- `options`: see below.

Hook returns
- `loadingState`: the state, type: `LState` enum (string).
- `setStepDone('step_name')`: to be called when a step is finished, step_name should be a unique string.
- `resetLoading()`: to be called when reloading resources.
- `skipStep('step_name)`: same effect as setStepDone, but prints different debug log.

Options
```typescript
interface Options {
    renderDelay?: number; // timeout of SILENT_LOADING state after started
    resetDelay?: number;  // timeout of SILENT_LOADING state after reset
    doneDelay?: number;   // timeout of DELAY_DONE state
    name?: string;        // for debug log (useful if there are multiple pages / components use this hook)
}
```
The debug log is printed by `console.debug`, and is skipped in production build. 


## Loading States
```typescript
export enum LState {
    SILENT_LOADING = 'SILENT_LOADING',  // for: do loading but not to show loading animation
    LOADING = 'LOADING',                // for: show loading animation
    DELAY_DONE = 'DELAY_DONE',          // for: loading finished but keep showing loading animation
    DONE = 'DONE',                      // for: all ready
}
```

Utility functions
```typescript
export const isLoading = (state: LState) => LState.LOADING === state;
export const isReloading = (state: LState) => [LState.SILENT_LOADING, LState.LOADING].includes(state);
export const isDone = (state: LState) => LState.DONE === state;
```


## Example

```javascript
// Number of steps: 2, loaded: false, renderDelay: 100ms
const [loadingState, setStepDone] = useLoadingSteps(2, false, {renderDelay: 100});
const [rows, setRows] = useState([]);

useEffect(async () => {
  const data = await fetchData();
  setStepDone('fetch');
  
  const rows = await transformData(data);
  setStepDone('transform');
}, []);

if (isLoading(loadingState)) {
  return <div>(Loading animation)</div>; 
}
return (
  <div>
    {data.map((item) => <div>row: {item}</div>)}
  </div>
);
```
Explanation 
- Initialize, if loaded = false, state => `SILENT_LOADING`, isLoading(loadingState) = false
- After 100ms, if not finished, state => `LOADING`, isLoading(loadingState) = true
- After the two `setStepDone('step name')` are called, state => `DONE`, isLoading(loadingState) = false

More examples
- Please refer to unit tests in `lib/__test__`.

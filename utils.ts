export const isProdEnv = () => process.env.NODE_ENV === "production";

export const delayExec = (fn: Function, delay: number): number | null => {
    if (delay > 0) {
        return setTimeout(fn, delay);
    }
    fn();
    return null;
};

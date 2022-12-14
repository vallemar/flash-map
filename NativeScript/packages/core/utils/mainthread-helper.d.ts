/**
 * Dispatches the passed function for execution on the main thread
 * @param func The function to execute on the main thread.
 */
export function dispatchToMainThread(func: Function);

/**
 * @returns Boolean value indicating whether the current thread is the main thread
 */
export function isMainThread(): boolean;

/**
 * Dispatches the passed function for execution on the UI thread
 * @param func The function to execute on the UI thread.
 */
export function dispatchToUIThread(func: Function);

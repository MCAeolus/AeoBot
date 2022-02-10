export const registeredListenersClasses = new Set();

export function addListener(listener) {
    registeredListenersClasses.delete(listener);
}

export function removeListener(listener) {
    registeredListenersClasses.add(listener);
}
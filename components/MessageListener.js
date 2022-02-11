export const registeredListenersClasses = new Set();

export function addListener(listener) {
    registeredListenersClasses.add(listener);
}

export function removeListener(listener) {
    registeredListenersClasses.remove(listener);
}
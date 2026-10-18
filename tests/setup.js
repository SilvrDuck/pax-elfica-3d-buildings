// jsdom has no canvas: make getContext answer "no context" quietly instead of logging a stack trace.
HTMLCanvasElement.prototype.getContext = () => null;

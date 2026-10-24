import convert from "convert";

const delayMilliseconds = (milliseconds) => new Promise((resolve) => setTimeout(resolve, Math.max(milliseconds, 50)));

export const delaySeconds = (seconds) => delayMilliseconds(convert(seconds, "seconds").to("milliseconds"));

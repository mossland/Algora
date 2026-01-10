/**
 * Witty Messages System
 *
 * Fun, playful messages inspired by Claude Code's loading messages.
 * These add personality and delight to loading states and status updates.
 */

// Loading/Processing messages - shown while waiting
export const loadingMessages = [
  'Germinating...',
  'Ebbing...',
  'Percolating...',
  'Synthesizing thoughts...',
  'Consulting the oracle...',
  'Brewing intelligence...',
  'Awakening neurons...',
  'Channeling wisdom...',
  'Parsing the cosmos...',
  'Untangling complexity...',
  'Simmering ideas...',
  'Aligning stars...',
  'Weaving insights...',
  'Crystallizing logic...',
  'Fermenting solutions...',
  'Calibrating intuition...',
  'Harvesting signals...',
  'Distilling meaning...',
  'Composting data...',
  'Incubating brilliance...',
];

// Agent activity messages
export const agentActivityMessages = [
  'Pondering deeply...',
  'Connecting dots...',
  'Reading between lines...',
  'Forming an opinion...',
  'Crafting a response...',
  'Mining insights...',
  'Building consensus...',
  'Analyzing patterns...',
  'Weighing perspectives...',
  'Sharpening arguments...',
];

// Session status messages
export const sessionMessages = {
  starting: [
    'Summoning participants...',
    'Setting the stage...',
    'Igniting discussion...',
    'Opening the floor...',
    'Gathering minds...',
  ],
  active: [
    'Ideas are flowing...',
    'Debate in progress...',
    'Minds at work...',
    'Collaboration brewing...',
    'Wisdom emerging...',
  ],
  concluding: [
    'Wrapping up thoughts...',
    'Reaching consensus...',
    'Crystallizing outcomes...',
    'Finalizing insights...',
    'Sealing the verdict...',
  ],
};

// Signal collection messages
export const signalMessages = [
  'Scanning the horizon...',
  'Tuning frequencies...',
  'Catching whispers...',
  'Decoding signals...',
  'Tapping the pulse...',
  'Reading the currents...',
  'Sensing vibrations...',
  'Intercepting data...',
  'Monitoring streams...',
  'Tracking echoes...',
];

// Empty state messages
export const emptyStateMessages = {
  noSessions: [
    'The agora awaits its first debate...',
    'Silence before the storm of ideas...',
    'A blank canvas for discourse...',
    'Ready for intellectual sparks...',
  ],
  noSignals: [
    'The airwaves are quiet... for now.',
    'No signals detected... yet.',
    'Waiting for the next ping...',
    'The radar is clear...',
  ],
  noAgents: [
    'The lobby stands empty...',
    'Agents are taking a break...',
    'Awaiting digital minds...',
    'The stage awaits performers...',
  ],
};

// Success messages
export const successMessages = [
  'Nailed it!',
  'Mission accomplished!',
  'Splendid!',
  'Brilliant!',
  'Well done!',
  'Executed flawlessly!',
  'Achievement unlocked!',
  'Success!',
];

// Error recovery messages
export const errorRecoveryMessages = [
  'Hmm, let me try again...',
  'Oops, recalibrating...',
  'Minor hiccup, retrying...',
  'Dusting off and trying again...',
  'Taking another approach...',
];

/**
 * Get a random message from an array
 */
export function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get a random loading message
 */
export function getLoadingMessage(): string {
  return getRandomMessage(loadingMessages);
}

/**
 * Get a random agent activity message
 */
export function getAgentActivityMessage(): string {
  return getRandomMessage(agentActivityMessages);
}

/**
 * Get a random signal message
 */
export function getSignalMessage(): string {
  return getRandomMessage(signalMessages);
}

/**
 * Get a random success message
 */
export function getSuccessMessage(): string {
  return getRandomMessage(successMessages);
}

/**
 * Cycle through messages with a given interval
 * Returns a cleanup function
 */
export function cycleMessages(
  messages: string[],
  callback: (message: string) => void,
  interval: number = 2000
): () => void {
  let index = Math.floor(Math.random() * messages.length);

  callback(messages[index]);

  const timer = setInterval(() => {
    index = (index + 1) % messages.length;
    callback(messages[index]);
  }, interval);

  return () => clearInterval(timer);
}

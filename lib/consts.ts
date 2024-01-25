export const settings = Object.freeze({
  'Show theme options': {
    isChecked: true,
    description:
      'The visibility of the theme options in the bottom right side can be controlled with this setting.'
  },
  Fullscreen: {
    isChecked: false,
    description: 'This setting toggles the fullscreen mode.'
  }
} as const)

export const wordsWhenSearching = Object.freeze([
  'searching',
  'just a moment',
  "you'll see it soon",
  "we're getting closer",
  "we'll do it",
  "we're almost too close",
  "we're super close"
] as const)

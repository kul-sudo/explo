export const settings = Object.freeze({
  'Partially disable animations': {
    isChecked: true,
    description:
      'Partially disabling the animations might improve the performance, but the improvement will most likely be very insignificant.'
  },
  'Show theme options': {
    isChecked: true,
    description:
      'The visibility of the theme options in the bottom right side can be controlled with this setting.'
  },
  Fullscreen: {
    isChecked: false,
    description: 'This setting toggles the fullscreen mode.'
  },
  'Show base directories': {
    isChecked: true,
    description:
      'The visibility of the built-in directories in the side bar on the left-hand side can be toggled with this setting.'
  }
} as const)

export const wordsWhenSearching = Object.freeze([
  'searching',
  "you'll find out soon",
  "we're getting closer",
  'just a bit left',
  "we'll do it"
] as const)

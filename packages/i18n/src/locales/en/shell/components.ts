// Shared components (src/components) and the text helpers of src/lib.
export default {
  attachments: {
    remove: 'Remove {{name}}',
    openImage: 'Open image {{name}}',
    openFile: 'Open {{name}}',
    deletedFile: 'Deleted file',
    deletedByAdmin: '{{name}} · an admin deleted it',
  },
  codeBlock: {
    diagram: 'Diagram',
    formula: 'Formula',
    code: 'Code',
    copyCode: 'Copy code',
    copy: 'Copy',
    copied: 'Copied',
    failed: 'Failed',
    codeCopied: 'Code copied',
    copyFailed: 'Could not copy the code.',
  },
  mermaid: {
    label: 'Diagram',
    drawing: 'Drawing the diagram…',
    empty: 'The diagram is empty.',
    failed: 'Could not draw the diagram.',
  },
  guestBadge: 'Guest',
  listPager: {
    // The rows shown: "11-20 of 54".
    range: '{{first}}-{{last}} of {{total}}',
    perPage: 'Items per page',
    previous: 'Previous page',
    next: 'Next page',
  },
  mathFormula: {
    empty: 'Empty formula',
    drawFailed: 'Could not draw the formula.',
  },
  pdfViewer: {
    download: 'Download PDF',
    close: 'Close PDF viewer',
    loading: 'Loading the PDF',
    failed: 'This PDF cannot be shown here. Download it to open it.',
    pageCount_one: '{{count}} page',
    pageCount_other: '{{count}} pages',
    truncated: 'The first {{limit}} of {{count}} pages are shown. Download the PDF to see all of them.',
    page: 'Page {{number}}',
  },
  // The card shown while the pointer rests on a mention of a person or a task.
  referencePreview: {
    unknownUser: 'Unknown user',
    notMember: 'No longer a member',
    loadFailed: 'Could not load {{ref}}.',
    noTask: 'No task {{ref}}',
    missing: 'It does not exist, is in the trash, or you cannot see it.',
    loading: 'Loading {{ref}}…',
    inProject: 'in {{project}}',
    noStatus: 'No status',
    due: 'Due {{date}}',
  },
  colorSwatch: {
    custom: 'Custom color',
  },
  datePicker: {
    thisWeek: 'This week',
    nextWeek: 'Next week',
    time: 'Time',
  },
  emojiPicker: {
    search: 'Search emoji',
    custom: 'Custom',
    empty: 'No emoji found',
    pick: 'Pick an emoji',
    changeSkinTone: 'Change skin tone',
    skinTone: 'Skin tone: {{tone}}. Change skin tone',
    // Frimousse's skin tone names, for the label above
    skinTones: {
      none: 'none',
      light: 'light',
      'medium-light': 'medium-light',
      medium: 'medium',
      'medium-dark': 'medium-dark',
      dark: 'dark',
    },
  },
  errorBoundary: {
    title: 'Something went wrong',
    description: 'This part of Orbit stopped working. Reload the page to try again.',
    reload: 'Reload',
  },
  imageViewer: {
    copy: 'Copy image',
    copied: 'Image copied',
    copyFailed: 'Could not copy the image. Try downloading it instead.',
    download: 'Download image',
    zoomOut: 'Zoom out',
    resetZoom: 'Reset zoom',
    zoomIn: 'Zoom in',
    close: 'Close image viewer',
  },
  mentionPopover: {
    people: 'People',
    channels: 'Channels',
    tasks: 'Tasks',
    searchingTasks: 'Searching tasks…',
  },
  orbitUnavailable: {
    title: 'Orbit is unavailable',
    reconnecting: 'Reconnecting…',
  },
  profileTrigger: {
    open: 'Open profile of {{name}}',
  },
  scopeAccess: {
    access: 'Access',
    none: 'No access',
    read: 'Read',
    write: 'Write',
    projects: 'Projects',
    allProjects: 'All projects, including future ones',
    selectAll: 'Select all',
  },
  spoiler: 'Spoiler',
  unsavedBar: {
    message: 'You have unsaved changes.',
    save: 'Save Changes',
  },
  // What a member shows as.
  presence: {
    online: 'Online',
    idle: 'Idle',
    dnd: 'Do not disturb',
    offline: 'Offline',
    invisible: 'Invisible',
  },
  ui: {
    breadcrumb: 'breadcrumb',
    more: 'More',
    commandDialogTitle: 'Command Palette',
    commandDialogDescription: 'Search for a command to run...',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
  // src/lib
  image: 'Image',
  customTheme: {
    // A custom theme that is not one of the presets.
    yourColors: 'Your colors',
  },
  messagePreview: {
    sticker: 'Sticker',
    file: 'Sent a file',
  },
  soundSets: {
    pop: 'Pop',
    knock: 'Knock',
    chime: 'Chime',
  },
  imageProblems: {
    type: 'Choose a PNG, JPEG, WebP or GIF image.',
    emojiTooLarge: 'The image is too large. The limit is 256 KB.',
    stickerTooLarge: 'The image is too large. The limit is 512 KB.',
    emojiName: 'A name has 2 to 32 characters: lower case letters, digits and underscores.',
    emojiTaken: ':{{name}}: exists already. Choose another name.',
    stickerName: 'A name has 2 to 30 characters.',
    stickerTaken: 'A sticker named {{name}} exists already. Choose another name.',
  },
} as const

export const theme = {
  // Global surfaces
  bg:            '#000000',
  panelBg:       '#090D14',
  panelBorder:   '#3A4354',
  panelBorderSoft: '#293140',
  title:         '#BFD4E3',

  // Brand palette — blood red / fire
  brand:   '#CC0000',   // blood red
  purple:  '#6600AA',   // deep violet
  cyan:    '#FF6600',   // fire orange (highlights / selected)
  teal:    '#FF9900',   // amber

  // Status
  success: '#39FF14',   // acid green
  warning: '#FF9900',   // amber
  error:   '#FF3333',   // hot red

  // Text / UI
  text:    '#DFE4EC',   // ash white
  dim:     '#7C8594',   // dark ash
  muted:   '#A4ACBA',   // mid ash

  // Logo gradient — dark crimson → blood → fire → gold
  // No near-black: minimum is a visible dark red so chars stay readable
  gradient: [
    '#660000',  // dark crimson   (floor — always visible)
    '#880000',  // deeper red
    '#AA0000',  // mid crimson
    '#CC0000',  // blood red
    '#FF0000',  // pure red
    '#FF3300',  // red-orange
    '#FF6600',  // fire orange
    '#FF9900',  // amber-orange
    '#FFCC00',  // gold           (ceiling)
  ],
} as const;

export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
export const BLOCK_FULL  = '█';
export const BLOCK_EMPTY = '░';

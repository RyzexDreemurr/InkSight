export interface ReadingTheme {
  name: string;
  colors: {
    background: string;
    text: string;
    accent: string;
    highlight: string;
    selection: string;
    border: string;
    overlay: string;
  };
  typography: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    fontWeight: string;
    letterSpacing: number;
    paragraphSpacing: number;
  };
  spacing: {
    margin: number;
    padding: number;
    indent: number;
  };
  animations: {
    pageTransition: string;
    duration: number;
  };
}

export const ReadingThemes: Record<string, ReadingTheme> = {
  day: {
    name: 'Day',
    colors: {
      background: '#FFFFFF',
      text: '#000000',
      accent: '#6750A4',
      highlight: '#FFFF00',
      selection: '#B3E5FC',
      border: '#E0E0E0',
      overlay: 'rgba(0, 0, 0, 0.1)',
    },
    typography: {
      fontFamily: 'System',
      fontSize: 16,
      lineHeight: 1.5,
      fontWeight: 'normal',
      letterSpacing: 0,
      paragraphSpacing: 16,
    },
    spacing: {
      margin: 20,
      padding: 16,
      indent: 24,
    },
    animations: {
      pageTransition: 'slide',
      duration: 300,
    },
  },
  night: {
    name: 'Night',
    colors: {
      background: '#121212',
      text: '#FFFFFF',
      accent: '#BB86FC',
      highlight: '#FFD700',
      selection: '#37474F',
      border: '#333333',
      overlay: 'rgba(255, 255, 255, 0.1)',
    },
    typography: {
      fontFamily: 'System',
      fontSize: 16,
      lineHeight: 1.5,
      fontWeight: 'normal',
      letterSpacing: 0,
      paragraphSpacing: 16,
    },
    spacing: {
      margin: 20,
      padding: 16,
      indent: 24,
    },
    animations: {
      pageTransition: 'slide',
      duration: 300,
    },
  },
  sepia: {
    name: 'Sepia',
    colors: {
      background: '#F4F1EA',
      text: '#5C4B37',
      accent: '#8B4513',
      highlight: '#DEB887',
      selection: '#D2B48C',
      border: '#D2B48C',
      overlay: 'rgba(92, 75, 55, 0.1)',
    },
    typography: {
      fontFamily: 'System',
      fontSize: 16,
      lineHeight: 1.5,
      fontWeight: 'normal',
      letterSpacing: 0,
      paragraphSpacing: 16,
    },
    spacing: {
      margin: 20,
      padding: 16,
      indent: 24,
    },
    animations: {
      pageTransition: 'slide',
      duration: 300,
    },
  },
  console: {
    name: 'Console',
    colors: {
      background: '#0C1021',
      text: '#00FF00',
      accent: '#00FFFF',
      highlight: '#FFFF00',
      selection: '#003300',
      border: '#00FF00',
      overlay: 'rgba(0, 255, 0, 0.1)',
    },
    typography: {
      fontFamily: 'monospace',
      fontSize: 14,
      lineHeight: 1.4,
      fontWeight: 'normal',
      letterSpacing: 0.5,
      paragraphSpacing: 14,
    },
    spacing: {
      margin: 16,
      padding: 12,
      indent: 20,
    },
    animations: {
      pageTransition: 'fade',
      duration: 200,
    },
  },
};

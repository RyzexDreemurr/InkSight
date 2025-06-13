// EPUB-specific types and interfaces

export interface EPUBMetadata {
  title: string;
  creator: string;
  description?: string;
  publisher?: string;
  date?: string;
  language?: string;
  rights?: string;
  identifier?: string;
  cover?: string;
}

export interface EPUBSpine {
  id: string;
  href: string;
  mediaType: string;
  properties?: string[];
}

export interface EPUBNavPoint {
  id: string;
  label: string;
  href: string;
  cfi?: string;
  children?: EPUBNavPoint[];
}

export interface EPUBTableOfContents {
  navPoints: EPUBNavPoint[];
  landmarks?: EPUBNavPoint[];
  pageList?: EPUBNavPoint[];
}

export interface EPUBLocation {
  cfi: string;
  href: string;
  displayed: {
    page: number;
    total: number;
  };
  start: {
    cfi: string;
    href: string;
    displayed: {
      page: number;
      total: number;
    };
  };
  end: {
    cfi: string;
    href: string;
    displayed: {
      page: number;
      total: number;
    };
  };
  percentage: number;
}

export interface EPUBHighlight {
  id: string;
  cfiRange: string;
  text: string;
  color: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EPUBBookmark {
  id: string;
  cfi: string;
  href: string;
  title: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EPUBSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  margin: number;
  theme: 'light' | 'dark' | 'sepia';
  flow: 'paginated' | 'scrolled';
  spread: 'auto' | 'none';
}

export interface EPUBRendition {
  display: (target: string) => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  goto: (target: string) => Promise<void>;
  currentLocation: () => EPUBLocation | null;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback: Function) => void;
  themes: {
    register: (name: string, styles: any) => void;
    select: (name: string) => void;
  };
  settings: {
    fontSize: (size: string) => void;
    fontFamily: (family: string) => void;
    lineHeight: (height: string) => void;
    margin: (margin: string) => void;
  };
  annotations: {
    add: (type: string, cfiRange: string, data?: any) => void;
    remove: (cfiRange: string, type?: string) => void;
    highlight: (cfiRange: string, data?: any, cb?: Function) => void;
    underline: (cfiRange: string, data?: any, cb?: Function) => void;
  };
}

export interface EPUBBook {
  metadata: EPUBMetadata;
  spine: EPUBSpine[];
  navigation: EPUBTableOfContents;
  ready: Promise<void>;
  locations: {
    generate: (chars?: number) => Promise<void>;
    length: () => number;
    cfiFromLocation: (loc: number) => string;
    locationFromCfi: (cfi: string) => number;
    percentageFromCfi: (cfi: string) => number;
    cfiFromPercentage: (percentage: number) => string;
  };
  rendition: (target: HTMLElement | string, options?: any) => EPUBRendition;
  getRange: (cfi: string) => Range | null;
  destroy: () => void;
}

export interface EPUBReaderState {
  book: EPUBBook | null;
  rendition: EPUBRendition | null;
  currentLocation: EPUBLocation | null;
  isLoaded: boolean;
  isReady: boolean;
  totalLocations: number;
  currentLocationIndex: number;
  highlights: EPUBHighlight[];
  bookmarks: EPUBBookmark[];
  settings: EPUBSettings;
}

export interface EPUBTextSelection {
  cfiRange: string;
  text: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface EPUBSearchResult {
  cfi: string;
  excerpt: string;
  href: string;
  subitems?: EPUBSearchResult[];
}

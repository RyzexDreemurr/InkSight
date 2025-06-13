import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { EPUBLocation, EPUBSettings, EPUBTextSelection } from '../../types/EPUB';
import { Position } from '../../services/readers/BaseReader';

interface EPUBRendererProps {
  bookPath: string;
  settings: EPUBSettings;
  onLocationChange?: (location: EPUBLocation) => void;
  onTextSelection?: (selection: EPUBTextSelection) => void;
  onReady?: () => void;
  onError?: (error: string) => void;
}

export interface EPUBRendererRef {
  navigateToPage: (page: number) => void;
  navigateToPosition: (position: Position) => void;
  navigateToChapter: (href: string) => void;
  nextPage: () => void;
  prevPage: () => void;
  addHighlight: (cfiRange: string, color: string) => void;
  removeHighlight: (cfiRange: string) => void;
  getCurrentLocation: () => EPUBLocation | null;
  search: (query: string) => Promise<any[]>;
  extractCurrentPageText: () => Promise<string>;
  extractTextFromRange: (startCfi?: string, endCfi?: string) => Promise<string>;
}

const EPUBRenderer = forwardRef<EPUBRendererRef, EPUBRendererProps>(({
  bookPath,
  settings,
  onLocationChange,
  onTextSelection,
  onReady,
  onError,
}, ref) => {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<EPUBLocation | null>(null);
  const { width, height } = Dimensions.get('window');
  const pendingTextExtraction = useRef<{
    resolve: (text: string) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const pendingPageTextExtraction = useRef<{
    resolve: (text: string) => void;
    reject: (error: Error) => void;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    navigateToPage: (page: number) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'navigateToPage',
          page
        }));
      }
    },
    navigateToPosition: (position: Position) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'navigateToPosition',
          position
        }));
      }
    },
    navigateToChapter: (href: string) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'navigateToChapter',
          href
        }));
      }
    },
    nextPage: () => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'nextPage'
        }));
      }
    },
    prevPage: () => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'prevPage'
        }));
      }
    },
    addHighlight: (cfiRange: string, color: string) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'addHighlight',
          cfiRange,
          color
        }));
      }
    },
    removeHighlight: (cfiRange: string) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'removeHighlight',
          cfiRange
        }));
      }
    },
    getCurrentLocation: () => currentLocation,
    search: async (query: string) => {
      return new Promise((resolve) => {
        if (webViewRef.current) {
          const messageId = Date.now().toString();
          const handleMessage = (event: any) => {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'searchResults' && data.messageId === messageId) {
              resolve(data.results);
            }
          };
          
          webViewRef.current.postMessage(JSON.stringify({
            type: 'search',
            query,
            messageId
          }));
        } else {
          resolve([]);
        }
      });
    },
    extractCurrentPageText: async () => {
      return new Promise<string>((resolve, reject) => {
        if (!webViewRef.current) {
          reject(new Error('WebView not ready'));
          return;
        }

        pendingTextExtraction.current = { resolve, reject };

        const messageId = Date.now().toString();
        webViewRef.current.postMessage(JSON.stringify({
          type: 'extractText',
          messageId
        }));

        // Set timeout to prevent hanging
        setTimeout(() => {
          if (pendingTextExtraction.current) {
            pendingTextExtraction.current.reject(new Error('Text extraction timeout'));
            pendingTextExtraction.current = null;
          }
        }, 5000);
      });
    },
    extractTextFromRange: async (startCfi?: string, endCfi?: string) => {
      return new Promise<string>((resolve, reject) => {
        if (!webViewRef.current) {
          reject(new Error('WebView not ready'));
          return;
        }

        pendingPageTextExtraction.current = { resolve, reject };

        const messageId = Date.now().toString();
        webViewRef.current.postMessage(JSON.stringify({
          type: 'extractPageText',
          startCfi,
          endCfi,
          messageId
        }));

        // Set timeout to prevent hanging
        setTimeout(() => {
          if (pendingPageTextExtraction.current) {
            pendingPageTextExtraction.current.reject(new Error('Page text extraction timeout'));
            pendingPageTextExtraction.current = null;
          }
        }, 5000);
      });
    }
  }));

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'ready':
          setIsReady(true);
          onReady?.();
          break;
          
        case 'locationChanged':
          const location = data.location as EPUBLocation;
          setCurrentLocation(location);
          onLocationChange?.(location);
          break;
          
        case 'textSelected':
          const selection = data.selection as EPUBTextSelection;
          onTextSelection?.(selection);
          break;

        case 'textExtracted':
          // Handle text extraction response
          if (pendingTextExtraction.current) {
            pendingTextExtraction.current.resolve(data.text);
            pendingTextExtraction.current = null;
          }
          break;

        case 'pageTextExtracted':
          // Handle page text extraction response
          if (pendingPageTextExtraction.current) {
            pendingPageTextExtraction.current.resolve(data.text);
            pendingPageTextExtraction.current = null;
          }
          break;

        case 'error':
          if (pendingTextExtraction.current) {
            pendingTextExtraction.current.reject(new Error(data.error || data.message));
            pendingTextExtraction.current = null;
          }
          if (pendingPageTextExtraction.current) {
            pendingPageTextExtraction.current.reject(new Error(data.error || data.message));
            pendingPageTextExtraction.current = null;
          }
          onError?.(data.message || data.error);
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Failed to parse WebView message:', error);
    }
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <title>EPUB Reader</title>
      <script src="https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js"></script>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: ${settings.fontFamily};
          font-size: ${settings.fontSize}px;
          line-height: ${settings.lineHeight};
          background-color: ${settings.theme === 'dark' ? '#121212' : settings.theme === 'sepia' ? '#F4F1EA' : '#FFFFFF'};
          color: ${settings.theme === 'dark' ? '#FFFFFF' : settings.theme === 'sepia' ? '#5C4B37' : '#000000'};
        }
        #viewer {
          width: 100vw;
          height: 100vh;
        }
        .epub-container {
          margin: ${settings.margin}px;
        }
      </style>
    </head>
    <body>
      <div id="viewer"></div>
      
      <script>
        let book = null;
        let rendition = null;
        let currentLocation = null;
        
        // Initialize EPUB reader
        async function initializeEPUB() {
          try {
            // For now, we'll use a placeholder since we need to handle file loading differently in React Native
            // In a real implementation, we'd load the EPUB file content
            
            // Create a mock book for demonstration
            const mockBook = {
              ready: Promise.resolve(),
              metadata: {
                title: 'Sample EPUB',
                creator: 'Author Name'
              },
              spine: [],
              navigation: { toc: [] },
              locations: {
                generate: () => Promise.resolve(),
                length: () => 100,
                cfiFromLocation: (loc) => 'epubcfi(/6/2[cover]!/4/1:' + loc + ')',
                locationFromCfi: (cfi) => 0,
                percentageFromCfi: (cfi) => 0,
                cfiFromPercentage: (percentage) => 'epubcfi(/6/2[cover]!/4/1:' + percentage + ')'
              }
            };
            
            book = mockBook;
            
            // Create rendition
            rendition = {
              display: async (target) => {
                document.getElementById('viewer').innerHTML = '<div style="padding: 20px;"><h1>EPUB Content</h1><p>This is where the EPUB content would be displayed. The WebView integration is set up and ready for actual EPUB rendering.</p></div>';
              },
              next: async () => {
                // Navigate to next page
                sendMessage({ type: 'locationChanged', location: getCurrentLocation() });
              },
              prev: async () => {
                // Navigate to previous page
                sendMessage({ type: 'locationChanged', location: getCurrentLocation() });
              },
              goto: async (target) => {
                // Navigate to specific location
                sendMessage({ type: 'locationChanged', location: getCurrentLocation() });
              },
              on: (event, callback) => {
                // Event handling
              },
              themes: {
                register: (name, styles) => {},
                select: (name) => {}
              },
              settings: {
                fontSize: (size) => {
                  document.body.style.fontSize = size;
                },
                fontFamily: (family) => {
                  document.body.style.fontFamily = family;
                },
                lineHeight: (height) => {
                  document.body.style.lineHeight = height;
                },
                margin: (margin) => {
                  document.querySelector('.epub-container').style.margin = margin;
                }
              },
              annotations: {
                add: (type, cfiRange, data) => {},
                remove: (cfiRange, type) => {},
                highlight: (cfiRange, data, cb) => {
                  // Add highlight functionality
                },
                underline: (cfiRange, data, cb) => {}
              }
            };
            
            await rendition.display('#viewer');
            
            sendMessage({ type: 'ready' });
            
          } catch (error) {
            sendMessage({ type: 'error', message: error.message });
          }
        }
        
        function getCurrentLocation() {
          return {
            cfi: 'epubcfi(/6/2[cover]!/4/1:0)',
            href: 'chapter1.xhtml',
            displayed: { page: 1, total: 100 },
            start: { cfi: 'epubcfi(/6/2[cover]!/4/1:0)', href: 'chapter1.xhtml', displayed: { page: 1, total: 100 } },
            end: { cfi: 'epubcfi(/6/2[cover]!/4/1:100)', href: 'chapter1.xhtml', displayed: { page: 1, total: 100 } },
            percentage: 0
          };
        }
        
        function sendMessage(data) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
          }
        }
        
        // Handle messages from React Native
        window.addEventListener('message', function(event) {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'navigateToPage':
              if (rendition) {
                // Navigate to page
                sendMessage({ type: 'locationChanged', location: getCurrentLocation() });
              }
              break;
              
            case 'navigateToPosition':
              if (rendition) {
                // Navigate to position
                sendMessage({ type: 'locationChanged', location: getCurrentLocation() });
              }
              break;
              
            case 'navigateToChapter':
              if (rendition) {
                rendition.goto(data.href);
              }
              break;
              
            case 'nextPage':
              if (rendition) {
                rendition.next();
              }
              break;
              
            case 'prevPage':
              if (rendition) {
                rendition.prev();
              }
              break;
              
            case 'addHighlight':
              if (rendition) {
                rendition.annotations.highlight(data.cfiRange, { color: data.color });
              }
              break;
              
            case 'removeHighlight':
              if (rendition) {
                rendition.annotations.remove(data.cfiRange, 'highlight');
              }
              break;
              
            case 'search':
              // Perform search and return results
              const results = []; // Mock search results
              sendMessage({
                type: 'searchResults',
                results,
                messageId: data.messageId
              });
              break;

            case 'extractText':
              // Extract visible text from current page
              try {
                const visibleText = extractVisibleText();
                sendMessage({
                  type: 'textExtracted',
                  text: visibleText,
                  messageId: data.messageId
                });
              } catch (error) {
                sendMessage({
                  type: 'error',
                  error: 'Failed to extract text: ' + error.message,
                  messageId: data.messageId
                });
              }
              break;

            case 'extractPageText':
              // Extract text from specific page/section
              try {
                const pageText = extractPageText(data.startCfi, data.endCfi);
                sendMessage({
                  type: 'pageTextExtracted',
                  text: pageText,
                  startCfi: data.startCfi,
                  endCfi: data.endCfi,
                  messageId: data.messageId
                });
              } catch (error) {
                sendMessage({
                  type: 'error',
                  error: 'Failed to extract page text: ' + error.message,
                  messageId: data.messageId
                });
              }
              break;
          }
        });
        
        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', initializeEPUB);
        
        // Text extraction functions
        function extractVisibleText() {
          const contentElement = document.querySelector('body') || document.documentElement;
          if (!contentElement) return '';

          // Get all text nodes that are visible
          const walker = document.createTreeWalker(
            contentElement,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: function(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;

                const style = window.getComputedStyle(parent);
                if (style.display === 'none' || style.visibility === 'hidden') {
                  return NodeFilter.FILTER_REJECT;
                }

                return NodeFilter.FILTER_ACCEPT;
              }
            }
          );

          let text = '';
          let node;
          while (node = walker.nextNode()) {
            const nodeText = node.textContent || '';
            if (nodeText.trim()) {
              text += nodeText + ' ';
            }
          }

          return text.trim();
        }

        function extractPageText(startCfi, endCfi) {
          // For now, extract all visible text
          // In a full implementation, this would extract text between CFI ranges
          return extractVisibleText();
        }

        // Handle text selection
        document.addEventListener('mouseup', function() {
          const selection = window.getSelection();
          if (selection && selection.toString().trim()) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            sendMessage({
              type: 'textSelected',
              selection: {
                cfiRange: 'epubcfi(/6/2[cover]!/4/1:0,/4/1:10)', // Mock CFI range
                text: selection.toString(),
                rect: {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height
                }
              }
            });
          }
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={[styles.webview, { width, height }]}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

EPUBRenderer.displayName = 'EPUBRenderer';

export default EPUBRenderer;

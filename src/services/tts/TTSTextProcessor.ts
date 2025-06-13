/**
 * TTS Text Processing Service
 * Week 9: TTS Integration
 */

import {
  TTSTextProcessor as ITTSTextProcessor,
  TTSSentence,
  TTSWord,
  COMMON_ABBREVIATIONS,
  PUNCTUATION_PAUSES,
} from '../../types/TTS';

export class TTSTextProcessor implements ITTSTextProcessor {
  private sentenceId = 0;

  processText(text: string): TTSSentence[] {
    // Clean and normalize text
    const cleanText = this.cleanText(text);
    
    // Split into sentences
    const sentenceTexts = this.detectSentences(cleanText);
    
    // Process each sentence
    const sentences: TTSSentence[] = [];
    let currentIndex = 0;

    for (const sentenceText of sentenceTexts) {
      if (sentenceText.trim().length === 0) {
        currentIndex += sentenceText.length;
        continue;
      }

      const startIndex = currentIndex;
      const endIndex = currentIndex + sentenceText.length;
      const words = this.processWords(sentenceText, startIndex);

      sentences.push({
        id: `sentence-${this.sentenceId++}`,
        text: sentenceText.trim(),
        startIndex,
        endIndex,
        words,
        duration: this.estimateDuration(sentenceText),
      });

      currentIndex = endIndex;
    }

    return sentences;
  }

  detectSentences(text: string): string[] {
    // Enhanced sentence detection that handles abbreviations
    const sentences: string[] = [];
    let currentSentence = '';
    let i = 0;

    while (i < text.length) {
      const char = text[i];
      currentSentence += char;

      // Check for sentence-ending punctuation
      if (this.isSentenceEnding(char)) {
        // Look ahead to see if this is really the end of a sentence
        const nextChars = text.substring(i + 1, i + 4);
        const precedingWord = this.getPrecedingWord(currentSentence);

        if (this.isRealSentenceEnd(char, nextChars, precedingWord)) {
          sentences.push(currentSentence);
          currentSentence = '';
        }
      }

      i++;
    }

    // Add any remaining text as the last sentence
    if (currentSentence.trim().length > 0) {
      sentences.push(currentSentence);
    }

    return sentences;
  }

  processWords(sentence: string, startIndex: number): TTSWord[] {
    const words: TTSWord[] = [];
    const wordRegex = /\b\w+(?:'\w+)?\b/g;
    let match;

    while ((match = wordRegex.exec(sentence)) !== null) {
      words.push({
        text: match[0],
        startIndex: startIndex + match.index,
        endIndex: startIndex + match.index + match[0].length,
      });
    }

    return words;
  }

  handleAbbreviations(text: string): string {
    let processedText = text;

    // Replace common abbreviations to prevent incorrect sentence breaks
    COMMON_ABBREVIATIONS.forEach(abbrev => {
      const regex = new RegExp(`\\b${abbrev.replace('.', '\\.')}`, 'gi');
      processedText = processedText.replace(regex, abbrev.replace('.', '•'));
    });

    return processedText;
  }

  addSmartPauses(text: string): string {
    let processedText = text;

    // Add pauses for different punctuation marks
    Object.entries(PUNCTUATION_PAUSES).forEach(([punct, duration]) => {
      if (punct === '\n' || punct === '\n\n') {
        // Handle line breaks
        const regex = new RegExp(punct.replace(/\n/g, '\\n'), 'g');
        const pauseText = this.createPauseText(duration);
        processedText = processedText.replace(regex, pauseText);
      } else {
        // Handle punctuation
        const regex = new RegExp(`\\${punct}`, 'g');
        const pauseText = this.createPauseText(duration);
        processedText = processedText.replace(regex, `${punct}${pauseText}`);
      }
    });

    // Add pauses after quotation marks
    processedText = processedText.replace(/["']/g, '$&' + this.createPauseText(200));

    // Add pauses for em dashes and en dashes
    processedText = processedText.replace(/[—–]/g, this.createPauseText(300) + '$&' + this.createPauseText(300));

    return processedText;
  }

  // Private helper methods

  private cleanText(text: string): string {
    // Remove excessive whitespace and normalize line breaks
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  private isSentenceEnding(char: string): boolean {
    return ['.', '!', '?'].includes(char);
  }

  private isRealSentenceEnd(char: string, nextChars: string, precedingWord: string): boolean {
    // Check if the next character suggests this is not a sentence end
    if (nextChars.match(/^[a-z]/)) {
      return false; // Next word starts with lowercase, probably not a new sentence
    }

    // Check if the preceding word is a common abbreviation
    if (precedingWord && this.isCommonAbbreviation(precedingWord + char)) {
      return false;
    }

    // Check for decimal numbers
    if (char === '.' && nextChars.match(/^\d/)) {
      return false;
    }

    // Check for ellipsis
    if (char === '.' && nextChars.startsWith('..')) {
      return false;
    }

    return true;
  }

  private getPrecedingWord(text: string): string {
    const words = text.trim().split(/\s+/);
    return words[words.length - 1] || '';
  }

  private isCommonAbbreviation(word: string): boolean {
    return COMMON_ABBREVIATIONS.some(abbrev => 
      word.toLowerCase() === abbrev.toLowerCase()
    );
  }

  private estimateDuration(text: string): number {
    // Estimate speaking duration based on word count and average speaking rate
    const words = text.split(/\s+/).length;
    const averageWPM = 150; // Average words per minute for TTS
    return (words / averageWPM) * 60 * 1000; // Convert to milliseconds
  }

  private createPauseText(durationMs: number): string {
    // Create a pause by adding spaces (simple approach)
    // In a more sophisticated implementation, you might use SSML
    const pauseLength = Math.min(Math.floor(durationMs / 100), 5);
    return ' '.repeat(pauseLength);
  }

  // Additional utility methods

  public splitIntoChunks(text: string, maxChunkSize: number = 4000): string[] {
    // Split long text into manageable chunks for TTS processing
    const sentences = this.detectSentences(text);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // If a single sentence is too long, split it further
        if (sentence.length > maxChunkSize) {
          const subChunks = this.splitLongSentence(sentence, maxChunkSize);
          chunks.push(...subChunks);
        } else {
          currentChunk = sentence;
        }
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private splitLongSentence(sentence: string, maxSize: number): string[] {
    // Split very long sentences at natural break points
    const chunks: string[] = [];
    const words = sentence.split(/\s+/);
    let currentChunk = '';

    for (const word of words) {
      if (currentChunk.length + word.length + 1 > maxSize) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
      }
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  public extractReadableText(htmlText: string): string {
    // Remove HTML tags and extract readable text
    return htmlText
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  public normalizeWhitespace(text: string): string {
    // Normalize whitespace for better TTS processing
    return text
      .replace(/\t/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/[ ]+/g, ' ')
      .replace(/\n /g, '\n')
      .replace(/ \n/g, '\n')
      .trim();
  }
}

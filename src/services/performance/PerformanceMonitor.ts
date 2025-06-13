/**
 * Performance Monitoring Service
 * Week 10: Accessibility & Performance Optimization
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
  timestamp: number;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  memoryUsage: MemoryUsage[];
  averageMetrics: Record<string, number>;
  recommendations: string[];
  timestamp: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];
  private memorySnapshots: MemoryUsage[] = [];
  private isMonitoring = false;
  private memoryCheckInterval?: NodeJS.Timeout;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.startMemoryMonitoring();
    console.log('Performance monitoring started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
    console.log('Performance monitoring stopped');
  }

  startMetric(name: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
      metadata,
    };
    
    this.metrics.set(name, metric);
  }

  endMetric(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Metric "${name}" not found`);
      return null;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;

    this.completedMetrics.push(metric);
    this.metrics.delete(name);

    return metric.duration;
  }

  measureAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.startMetric(name, metadata);
      
      try {
        const result = await fn();
        this.endMetric(name);
        resolve(result);
      } catch (error) {
        this.endMetric(name);
        reject(error);
      }
    });
  }

  measureSync<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    this.startMetric(name, metadata);
    
    try {
      const result = fn();
      this.endMetric(name);
      return result;
    } catch (error) {
      this.endMetric(name);
      throw error;
    }
  }

  private startMemoryMonitoring(): void {
    // Check memory usage every 5 seconds
    this.memoryCheckInterval = setInterval(() => {
      this.captureMemorySnapshot();
    }, 5000);
  }

  private captureMemorySnapshot(): void {
    // Note: React Native doesn't provide direct memory access
    // This is a simplified implementation for demonstration
    // In a real app, you might use native modules or performance APIs
    
    const mockMemoryUsage: MemoryUsage = {
      used: Math.random() * 150, // Mock memory usage in MB
      total: 256, // Mock total available memory
      percentage: 0,
      timestamp: Date.now(),
    };
    
    mockMemoryUsage.percentage = (mockMemoryUsage.used / mockMemoryUsage.total) * 100;
    
    this.memorySnapshots.push(mockMemoryUsage);
    
    // Keep only last 100 snapshots
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots = this.memorySnapshots.slice(-100);
    }
  }

  getPerformanceReport(): PerformanceReport {
    const averageMetrics: Record<string, number> = {};
    const metricGroups: Record<string, number[]> = {};

    // Group metrics by name
    this.completedMetrics.forEach(metric => {
      if (metric.duration) {
        if (!metricGroups[metric.name]) {
          metricGroups[metric.name] = [];
        }
        metricGroups[metric.name].push(metric.duration);
      }
    });

    // Calculate averages
    Object.keys(metricGroups).forEach(name => {
      const durations = metricGroups[name];
      averageMetrics[name] = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    });

    const recommendations = this.generateRecommendations(averageMetrics);

    return {
      metrics: [...this.completedMetrics],
      memoryUsage: [...this.memorySnapshots],
      averageMetrics,
      recommendations,
      timestamp: Date.now(),
    };
  }

  private generateRecommendations(averageMetrics: Record<string, number>): string[] {
    const recommendations: string[] = [];

    // Check for slow operations
    Object.entries(averageMetrics).forEach(([name, duration]) => {
      if (name.includes('book_load') && duration > 3000) {
        recommendations.push('Book loading is slow. Consider implementing lazy loading or caching.');
      }
      
      if (name.includes('page_navigation') && duration > 500) {
        recommendations.push('Page navigation is slow. Consider optimizing rendering or using virtualization.');
      }
      
      if (name.includes('search') && duration > 2000) {
        recommendations.push('Search operations are slow. Consider implementing indexed search or pagination.');
      }
    });

    // Check memory usage
    const recentMemory = this.memorySnapshots.slice(-10);
    if (recentMemory.length > 0) {
      const avgMemoryUsage = recentMemory.reduce((sum, snapshot) => sum + snapshot.percentage, 0) / recentMemory.length;
      
      if (avgMemoryUsage > 80) {
        recommendations.push('High memory usage detected. Consider implementing memory optimization strategies.');
      }
      
      if (avgMemoryUsage > 90) {
        recommendations.push('Critical memory usage! Immediate optimization required to prevent crashes.');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! No immediate optimizations needed.');
    }

    return recommendations;
  }

  clearMetrics(): void {
    this.completedMetrics = [];
    this.memorySnapshots = [];
    this.metrics.clear();
  }

  // Convenience methods for common operations
  measureBookLoad<T>(fn: () => Promise<T>, bookFormat: string): Promise<T> {
    return this.measureAsync(`book_load_${bookFormat}`, fn, { format: bookFormat });
  }

  measurePageNavigation<T>(fn: () => T, direction: 'next' | 'prev'): T {
    return this.measureSync(`page_navigation_${direction}`, fn, { direction });
  }

  measureSearch<T>(fn: () => Promise<T>, query: string): Promise<T> {
    return this.measureAsync('search', fn, { query, queryLength: query.length });
  }

  measureTTSOperation<T>(fn: () => Promise<T>, operation: string): Promise<T> {
    return this.measureAsync(`tts_${operation}`, fn, { operation });
  }
}

export default PerformanceMonitor;
export { PerformanceMetric, MemoryUsage, PerformanceReport };

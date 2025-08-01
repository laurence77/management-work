/**
 * Development Tools Panel Component
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Monitor, 
  Settings, 
  Download, 
  Trash2, 
  Play, 
  Square, 
  Eye,
  EyeOff,
  Activity,
  MemoryStick,
  Network,
  Timer,
  Bug,
  Zap
} from 'lucide-react';
import { debugManager } from '@/utils/debug';
import { profiler } from '@/utils/profiler';

interface DevToolsProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  defaultVisible?: boolean;
}

export function DevTools({ 
  position = 'bottom-right', 
  defaultVisible = false 
}: DevToolsProps) {
  const [isVisible, setIsVisible] = useState(defaultVisible);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isProfilerRunning, setIsProfilerRunning] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [networkRequests, setNetworkRequests] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  const [filters, setFilters] = useState({
    logLevel: 'debug',
    modules: [] as string[]
  });

  const intervalRef = useRef<number>();
  const logIntervalRef = useRef<number>();

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  useEffect(() => {
    if (isVisible) {
      // Start data collection
      intervalRef.current = window.setInterval(() => {
        updateData();
      }, 1000);

      // Collect logs
      logIntervalRef.current = window.setInterval(() => {
        collectLogs();
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (logIntervalRef.current) clearInterval(logIntervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (logIntervalRef.current) clearInterval(logIntervalRef.current);
    };
  }, [isVisible]);

  const updateData = () => {
    // Get debug data
    const debug = debugManager.generateReport();
    setDebugData(debug);

    // Get network requests
    if ((window as any).__DEBUG__) {
      const networkData = Array.from((window as any).__DEBUG__.network.values());
      setNetworkRequests(networkData);
    }

    // Get performance metrics
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      setMemoryInfo({
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      });
    }

    // Get performance entries
    const entries = performance.getEntriesByType('measure');
    const metrics = entries.reduce((acc, entry) => {
      acc[entry.name] = entry.duration;
      return acc;
    }, {} as any);
    setPerformanceMetrics(metrics);
  };

  const collectLogs = () => {
    // This would collect logs from the debug manager
    // In a real implementation, you'd hook into the console
  };

  const startProfiler = () => {
    profiler.start();
    setIsProfilerRunning(true);
  };

  const stopProfiler = () => {
    const report = profiler.stop();
    setProfileData(report);
    setIsProfilerRunning(false);
  };

  const exportDebugData = () => {
    debugManager.exportData();
  };

  const exportProfileData = () => {
    if (profileData) {
      profiler.exportReport(profileData);
    }
  };

  const clearData = () => {
    debugManager.clear();
    setLogs([]);
    setNetworkRequests([]);
    setPerformanceMetrics({});
  };

  const toggleDebugConfig = (key: string, value: any) => {
    debugManager.configure({ [key]: value });
  };

  if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!isVisible) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          variant="outline"
          className="bg-black text-white border-gray-600 hover:bg-gray-800"
        >
          <Bug className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 w-96 max-h-[80vh]`}>
      <Card className="bg-black text-white border-gray-600 shadow-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Dev Tools
            </CardTitle>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0 text-white hover:bg-gray-800"
              >
                {isMinimized ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0 text-white hover:bg-gray-800"
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-3">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-gray-800">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
                <TabsTrigger value="network" className="text-xs">Network</TabsTrigger>
                <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-3 space-y-3">
                {/* Profiler Controls */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Profiler</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={isProfilerRunning ? stopProfiler : startProfiler}
                        className={`h-6 text-xs ${
                          isProfilerRunning 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {isProfilerRunning ? (
                          <><Square className="h-3 w-3 mr-1" /> Stop</>
                        ) : (
                          <><Play className="h-3 w-3 mr-1" /> Start</>
                        )}
                      </Button>
                    </div>
                  </div>
                  {isProfilerRunning && (
                    <Badge variant="outline" className="text-xs">
                      <Activity className="h-3 w-3 mr-1" />
                      Recording...
                    </Badge>
                  )}
                </div>

                {/* Memory Info */}
                {memoryInfo && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <MemoryStick className="h-3 w-3" />
                      Memory
                    </span>
                    <div className="text-xs space-y-1">
                      <div>Used: {memoryInfo.used}MB</div>
                      <div>Total: {memoryInfo.total}MB</div>
                      <div>Limit: {memoryInfo.limit}MB</div>
                      <div className="w-full bg-gray-700 rounded-full h-1">
                        <div 
                          className="bg-blue-500 h-1 rounded-full"
                          style={{ width: `${(memoryInfo.used / memoryInfo.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="space-y-2">
                  <span className="text-xs font-medium">Actions</span>
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={exportDebugData}
                      className="h-6 text-xs border-gray-600"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export Debug
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={exportProfileData}
                      disabled={!profileData}
                      className="h-6 text-xs border-gray-600"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export Profile
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearData}
                      className="h-6 text-xs border-gray-600 col-span-2"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear Data
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="mt-3 space-y-3">
                {/* Performance Metrics */}
                <div className="space-y-2">
                  <span className="text-xs font-medium flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Performance Metrics
                  </span>
                  <ScrollArea className="h-32">
                    <div className="space-y-1 text-xs">
                      {Object.entries(performanceMetrics).map(([name, duration]) => (
                        <div key={name} className="flex justify-between">
                          <span className="truncate">{name}</span>
                          <span>{typeof duration === 'number' ? `${duration.toFixed(2)}ms` : duration}</span>
                        </div>
                      ))}
                      {Object.keys(performanceMetrics).length === 0 && (
                        <div className="text-gray-400">No metrics available</div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Profile Data */}
                {profileData && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium">Last Profile</span>
                    <div className="text-xs space-y-1">
                      <div>Duration: {profileData.duration}ms</div>
                      <div>Avg FPS: {profileData.averageFPS.toFixed(1)}</div>
                      <div>Min FPS: {profileData.minFPS}</div>
                      <div>Max FPS: {profileData.maxFPS}</div>
                      <div>Samples: {profileData.samples.length}</div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="network" className="mt-3 space-y-3">
                <div className="space-y-2">
                  <span className="text-xs font-medium flex items-center gap-1">
                    <Network className="h-3 w-3" />
                    Network Requests
                  </span>
                  <ScrollArea className="h-32">
                    <div className="space-y-1 text-xs">
                      {networkRequests.slice(-10).map((request, index) => (
                        <div key={index} className="space-y-1 p-1 border border-gray-700 rounded">
                          <div className="flex justify-between">
                            <span className="font-mono">{request.method}</span>
                            <Badge 
                              variant={request.status >= 400 ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {request.status || 'pending'}
                            </Badge>
                          </div>
                          <div className="truncate text-gray-400">{request.url}</div>
                          {request.duration && (
                            <div className="text-gray-400">{request.duration}ms</div>
                          )}
                        </div>
                      ))}
                      {networkRequests.length === 0 && (
                        <div className="text-gray-400">No requests captured</div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="logs" className="mt-3 space-y-3">
                {/* Log Controls */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Log Level</span>
                    <select 
                      value={filters.logLevel}
                      onChange={(e) => {
                        setFilters({ ...filters, logLevel: e.target.value });
                        toggleDebugConfig('logLevel', e.target.value);
                      }}
                      className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs"
                    >
                      <option value="error">Error</option>
                      <option value="warn">Warn</option>
                      <option value="info">Info</option>
                      <option value="debug">Debug</option>
                      <option value="trace">Trace</option>
                    </select>
                  </div>

                  {/* Debug Options */}
                  <div className="space-y-1">
                    {[
                      { key: 'performance', label: 'Performance' },
                      { key: 'network', label: 'Network' },
                      { key: 'state', label: 'State' },
                      { key: 'render', label: 'Render' }
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs">{label}</span>
                        <Switch
                          checked={(debugManager as any).config[key]}
                          onCheckedChange={(checked) => toggleDebugConfig(key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Log Display */}
                <ScrollArea className="h-32">
                  <div className="space-y-1 text-xs font-mono">
                    {logs.slice(-20).map((log, index) => (
                      <div key={index} className={`p-1 rounded ${
                        log.level === 'error' ? 'bg-red-900/20' :
                        log.level === 'warn' ? 'bg-yellow-900/20' :
                        'bg-gray-800/50'
                      }`}>
                        <span className="text-gray-400">[{log.timestamp}]</span>
                        <span className={`ml-1 ${
                          log.level === 'error' ? 'text-red-400' :
                          log.level === 'warn' ? 'text-yellow-400' :
                          'text-white'
                        }`}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div className="text-gray-400">No logs captured</div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// HOC for wrapping components with debug capabilities
export function withDebugger<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function DebuggedComponent(props: P) {
    const debug = debugManager.module(componentName);
    const startTime = performance.now();

    useEffect(() => {
      const renderTime = performance.now() - startTime;
      debug.log(`Rendered in ${renderTime.toFixed(2)}ms`);
    });

    useEffect(() => {
      debug.log('Component mounted');
      return () => debug.log('Component unmounted');
    }, []);

    return <Component {...props} />;
  };
}

export default DevTools;
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardContent, Badge, Input } from '../components/ui';
import {
  Network, User, Building2, Calendar, MapPin, FileText,
  Search, ZoomIn, ZoomOut, Maximize2, X
} from 'lucide-react';
import { networkService, NetworkNode, NetworkEdge, NetworkStatsResponse, EntityDetail } from '../services/network';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import type { Node, Relationship, NvlOptions } from '@neo4j-nvl/base';
import { Header } from '../components/layout/Header';
import { useTheme } from '../context/ThemeContext';

// Color mapping for entity types (darker colors to ensure white text)
const ENTITY_COLORS: Record<string, string> = {
  PERSON: '#1D4ED8',    // Darker blue
  COURT: '#6D28D9',     // Darker purple
  ORG: '#BE185D',       // Darker pink
  LOCATION: '#C2410C',  // Darker orange
  GPE: '#C2410C',       // Darker orange
  DATE: '#047857',      // Darker green
  DEFAULT: '#374151',   // Darker gray
};

const getEntityColor = (type: string): string => {
  return ENTITY_COLORS[type.toUpperCase()] || ENTITY_COLORS.DEFAULT;
};

const getEntityIcon = (type: string) => {
  switch (type.toUpperCase()) {
    case 'PERSON': return <User className="w-4 h-4" />;
    case 'COURT': return <Building2 className="w-4 h-4" />;
    case 'ORG': return <Building2 className="w-4 h-4" />;
    case 'LOCATION':
    case 'GPE': return <MapPin className="w-4 h-4" />;
    case 'DATE': return <Calendar className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

// Transform backend data to NVL format
function transformToNvlNodes(nodes: NetworkNode[]): Node[] {
  return nodes.map((node, index) => {
    const size = Math.max(30, Math.min(25 + node.case_count * 5, 70));
    // Spread nodes in a circle initially to help force-directed layout
    const angle = (index / nodes.length) * 2 * Math.PI;
    const radius = 200 + Math.random() * 100;
    return {
      id: node.id,
      caption: node.label.length > 10 ? node.label.substring(0, 10) + '...' : node.label,
      color: getEntityColor(node.type),
      size,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });
}

function transformToNvlRelationships(edges: NetworkEdge[], isDark: boolean): Relationship[] {
  return edges.map((edge) => ({
    id: edge.id,
    from: edge.source,
    to: edge.target,
    color: isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.25)',
    width: 0.5,
  }));
}

export function NetworkPage() {
  const nvlRef = useRef<any>(null);
  const { isDark } = useTheme();

  const [rawNodes, setRawNodes] = useState<NetworkNode[]>([]);
  const [_rawEdges, setRawEdges] = useState<NetworkEdge[]>([]);
  const [stats, setStats] = useState<NetworkStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [entityDetail, setEntityDetail] = useState<EntityDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // NVL data
  const [nvlNodes, setNvlNodes] = useState<Node[]>([]);
  const [nvlRelationships, setNvlRelationships] = useState<Relationship[]>([]);

  // Fetch network data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [graphData, statsData] = await Promise.all([
          networkService.getNetworkGraph(),
          networkService.getNetworkStats(),
        ]);

        setRawNodes(graphData.nodes);
        setRawEdges(graphData.edges);
        setNvlNodes(transformToNvlNodes(graphData.nodes));
        setNvlRelationships(transformToNvlRelationships(graphData.edges, isDark));
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch network data:', error);
        setError('Failed to load network data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update edge colors when theme changes
  useEffect(() => {
    if (_rawEdges.length > 0) {
      setNvlRelationships(transformToNvlRelationships(_rawEdges, isDark));
    }
  }, [isDark, _rawEdges]);

  // NVL configuration options
  const nvlOptions: NvlOptions = {
    initialZoom: 1,
    layout: 'd3Force',
    renderer: 'canvas',
    allowDynamicMinZoom: true,
    minZoom: 0.1,
    maxZoom: 2,
  };

  // Handle node click
  const handleNodeClick = useCallback(async (nodeId: string) => {
    setSelectedNodeId(nodeId);
    const originalNode = rawNodes.find(n => n.id === nodeId);
    const label = originalNode?.label || nodeId;
    try {
      const detail = await networkService.getEntityDetail(label);
      setEntityDetail(detail);
    } catch (error) {
      console.error('Failed to fetch entity detail:', error);
      setEntityDetail(null);
    }
  }, [rawNodes]);

  // Handle canvas click (deselect)
  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
    setEntityDetail(null);
  }, []);

  // Handle zoom controls
  const handleZoomIn = () => {
    if (nvlRef.current?.nvl) {
      const currentZoom = nvlRef.current.nvl.getScale();
      nvlRef.current.nvl.setZoom(currentZoom * 1.3);
    }
  };

  const handleZoomOut = () => {
    if (nvlRef.current?.nvl) {
      const currentZoom = nvlRef.current.nvl.getScale();
      nvlRef.current.nvl.setZoom(currentZoom / 1.3);
    }
  };

  const handleFit = () => {
    if (nvlRef.current?.nvl) {
      nvlRef.current.nvl.fit();
    }
  };

  // Search filter
  const filteredNodes = searchQuery
    ? rawNodes.filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Get selected node info
  const selectedNode = rawNodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Graph Area */}
          <div className="flex-1">
            <Card className="h-[600px] relative overflow-hidden">
              {/* Controls */}
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search entities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 bg-white dark:bg-gray-800"
                  />
                  {searchQuery && filteredNodes.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                      {filteredNodes.slice(0, 10).map((node) => (
                        <button
                          key={node.id}
                          onClick={async () => {
                            setSelectedNodeId(node.id);
                            setSearchQuery('');
                            try {
                              const detail = await networkService.getEntityDetail(node.label);
                              setEntityDetail(detail);
                              // Pan to the selected node
                              if (nvlRef.current?.nvl) {
                                nvlRef.current.nvl.panToNode(node.id, true);
                              }
                            } catch (error) {
                              console.error('Failed to fetch entity detail:', error);
                            }
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-gray-100"
                        >
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getEntityColor(node.type) }}
                          />
                          {node.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleFit}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Entity Types</p>
                <div className="flex flex-wrap gap-3">
                  {['PERSON', 'COURT', 'ORG', 'LOCATION'].map((type) => (
                    <div key={type} className="flex items-center gap-1">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getEntityColor(type) }}
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-300">{type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* NVL Graph */}
              <div className="w-full h-full">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-pulse text-center">
                      <Network className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">Loading network...</p>
                    </div>
                  </div>
                ) : nvlNodes.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Network className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 mb-2">No entities to display</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Upload cases to build your network</p>
                    </div>
                  </div>
                ) : (
                  <InteractiveNvlWrapper
                    ref={nvlRef}
                    nodes={nvlNodes}
                    rels={nvlRelationships}
                    nvlOptions={nvlOptions}
                    mouseEventCallbacks={{
                      onPan: true,
                      onZoom: true,
                      onDrag: true,
                      onNodeClick: (node) => handleNodeClick(node.id),
                      onCanvasClick: handleCanvasClick,
                      onNodeDoubleClick: (node) => {
                        if (nvlRef.current?.nvl) {
                          nvlRef.current.nvl.panToNode(node.id, true);
                        }
                      },
                    }}
                    style={{ width: '100%', height: '100%' }}
                  />
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            {/* Stats */}
            <Card>
              <CardContent>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Network Stats</h3>
                {isLoading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  </div>
                ) : error || !stats ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No network data available</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Upload cases to see stats</p>
                  </div>
                ) : (
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Unique Entities</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{stats.total_unique_entities}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Cases with Entities</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{stats.cases_with_entities}</dd>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <dt className="text-sm text-gray-500 dark:text-gray-400 mb-2">By Type</dt>
                      <div className="space-y-1">
                        {Object.entries(stats.entity_type_counts).map(([type, count]) => (
                          <div key={type} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getEntityColor(type) }}
                              />
                              <span className="text-xs text-gray-600 dark:text-gray-300">{type}</span>
                            </div>
                            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>

            {/* Entity Detail */}
            {selectedNode && entityDetail && (
              <Card>
                <CardContent>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="p-1.5 rounded"
                        style={{ backgroundColor: getEntityColor(selectedNode.type) + '20' }}
                      >
                        {getEntityIcon(selectedNode.type)}
                      </span>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{entityDetail.entity_name}</h3>
                        <Badge variant="primary">{entityDetail.entity_type}</Badge>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedNodeId(null);
                        setEntityDetail(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <dl className="space-y-3 mb-4">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Appears in</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{entityDetail.case_count} case(s)</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Total mentions</dt>
                      <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{entityDetail.occurrence_count}</dd>
                    </div>
                  </dl>

                  {entityDetail.top_connections.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Top Connections</h4>
                      <div className="space-y-2">
                        {entityDetail.top_connections.slice(0, 5).map((conn, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getEntityColor(conn.type) }}
                              />
                              <span className="text-gray-600 truncate max-w-[140px]">{conn.name}</span>
                            </div>
                            <span className="text-gray-400">{conn.count}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entityDetail.cases.length > 0 && (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cases</h4>
                      <div className="space-y-2">
                        {entityDetail.cases.slice(0, 3).map((c) => (
                          <Link
                            key={c.case_id}
                            to={`/cases/${c.case_id}`}
                            className="block text-sm text-primary-600 dark:text-primary-400 hover:underline truncate"
                          >
                            {c.filename}
                          </Link>
                        ))}
                        {entityDetail.cases.length > 3 && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">+{entityDetail.cases.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Top Entities */}
            {stats && stats.top_entities.length > 0 && !selectedNode && (
              <Card>
                <CardContent>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Most Connected</h3>
                  <div className="space-y-3">
                    {stats.top_entities.slice(0, 5).map((entity, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 -mx-2 px-2 py-1 rounded"
                        onClick={async () => {
                          const node = rawNodes.find(
                            (n) => n.label.toLowerCase() === entity.name.toLowerCase()
                          );
                          if (node) {
                            setSelectedNodeId(node.id);
                            try {
                              const detail = await networkService.getEntityDetail(entity.name);
                              setEntityDetail(detail);
                              if (nvlRef.current?.nvl) {
                                nvlRef.current.nvl.panToNode(node.id, true);
                              }
                            } catch (error) {
                              console.error('Failed to fetch entity detail:', error);
                            }
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getEntityColor(entity.type) }}
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[160px]">{entity.name}</span>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{entity.case_count} cases</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

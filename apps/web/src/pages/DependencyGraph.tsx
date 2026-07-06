import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import api from '../services/api';
import Spinner from '../ui/Spinner';
import './DependencyGraph.css';

export default function DependencyGraph() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [mode, setMode] = useState<'default'|'attack'|'propagation'>('default');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ nodes: 0, vulnerable: 0, attackEdges: 0 });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scanId = params.get('scanId') || window.location.pathname.split('/')[2] || '';
    if (!scanId) return;

    let mounted = true;

    Promise.all([api.getScanDependencyTree(scanId), api.getScanAttackPaths(scanId)])
      .then(([tree, attack]) => {
        if (!mounted) return;
        const nodesArray: any[] = tree.nodes ?? [...(tree.direct || []), ...(tree.transitive || [])];
        const edgesArray: any[] = (tree.edges || []);

        // Log raw API payload for debugging
        console.log('DependencyGraph: API payload', { scanId, nodeCount: nodesArray.length, edgeCount: edgesArray.length });

        // Validate edges at runtime to avoid cytoscape errors
        const nodeIds = new Set(nodesArray.map((n: any) => n.id));
        const validEdges = edgesArray.filter((e: any) => nodeIds.has(e.from) && nodeIds.has(e.to));
        const invalidEdges = edgesArray.filter((e: any) => !(nodeIds.has(e.from) && nodeIds.has(e.to)));
        if (invalidEdges.length > 0) console.warn('DependencyGraph: dropped invalid edges', { invalidEdges });

        console.log('DependencyGraph: after validation', { nodeCount: nodesArray.length, edgeCount: validEdges.length });

        const elements: any[] = [];
        const nodesMap = new Map<string, any>();

        nodesArray.forEach((n: any) => {
          const id = n.id;
          nodesMap.set(id, n);
          elements.push({ data: { id, label: `${n.name}@${n.version}`, name: n.name, version: n.version, riskLevel: n.riskLevel, vulnCount: n.vulnerabilityCount ?? 0 } });
        });

        validEdges.forEach((e: any) => {
          elements.push({ data: { id: `${e.from}-${e.to}`, source: e.from, target: e.to } });
        });

        const cy = cytoscape({
          container: containerRef.current,
          elements,
          style: [
            { selector: 'node', style: { 'label': 'data(label)', 'text-valign': 'center', 'text-halign': 'center', 'background-color': '#e6eef8', 'width': '44px', 'height': '44px', 'font-size': '11px', 'text-wrap':'wrap', 'text-max-width': '80px' } },
            { selector: 'edge', style: { 'width': 2, 'line-color': '#cbdff6', 'target-arrow-color': '#cbdff6', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
            { selector: 'node[ riskLevel = "CRITICAL" ]', style: { 'background-color': '#d64545' } },
            { selector: 'node[ riskLevel = "HIGH" ]', style: { 'background-color': '#f39c12' } },
            { selector: 'node[ riskLevel = "MEDIUM" ]', style: { 'background-color': '#f1c40f' } },
            { selector: 'node[ riskLevel = "LOW" ]', style: { 'background-color': '#2ecc71' } },
            { selector: 'node:selected', style: { 'border-color': '#000', 'border-width': 2 } },
            { selector: '.attack-path', style: { 'line-color': '#ff4d4f', 'target-arrow-color': '#ff4d4f', 'width': 4 } },
            { selector: '.propagation', style: { 'line-color': '#6a9cff', 'target-arrow-color': '#6a9cff', 'width': 3, 'line-style': 'dashed' } }
          ],
        });

        cy.on('tap', 'node', (evt: any) => {
          const n = evt.target.data();
          setSelected(n);
        });

        cyRef.current = cy;

        // add elements after cy init to ensure rendering and layout
        if (elements.length === 0) {
          // defensive: add root placeholder
          cy.add({ data: { id: 'root', label: 'No dependencies', name: 'root', version: '' } });
        } else {
          cy.add(elements);
        }

        // run layout explicitly and center
        const layout = cy.layout({ name: 'cose', idealEdgeLength: 80, nodeOverlap: 10, refresh: 20 });
        layout.run();
        cy.fit();
        cy.center();

        // Attach attack paths highlighting
        let attackEdgeCount = 0;
        if (attack && attack.length > 0) {
          (attack || []).forEach((path: string[]) => {
            for (let i = 0; i < path.length - 1; i++) {
              const edgeId = `${path[i]}-${path[i+1]}`;
              const e = cy.edges().filter((ed: any) => ed.data('id') === edgeId);
              if (e && e.length > 0) { e.addClass('attack-path'); attackEdgeCount++; }
            }
          });
        }

        // enable basic interactions
        cy.zoomingEnabled(true);
        cy.panningEnabled(true);
        cy.userZoomingEnabled(true);
        cy.userPanningEnabled(true);

        // Update stats
        setStats({
          nodes: cy.nodes().length,
          vulnerable: cy.nodes().filter((n: any) => n.data('vulnCount') > 0).length,
          attackEdges: attackEdgeCount,
        });

        setLoading(false);

        // ensure canvas resizes when container size changes
        const ro = new ResizeObserver(() => cy.resize());
        if (containerRef.current) ro.observe(containerRef.current);
        // cleanup observer on unmount
        (cy as any)._ro = ro;
      })
      .catch((e) => { console.error('Failed to load graph', e); setLoading(false); });

    return () => { mounted = false; if (cyRef.current) cyRef.current.destroy(); };
  }, []);

  function highlightAttackPaths() {
    if (!cyRef.current) return;
    cyRef.current.elements().removeClass('attack-path');
    // Recolor based on mode
    // attack paths already decorated on load; this toggles visibility
    if (mode === 'attack') cyRef.current.elements('.attack-path').style('opacity', 1);
    else cyRef.current.elements('.attack-path').style('opacity', 0.2);
  }

  useEffect(() => { highlightAttackPaths(); }, [mode]);

  return (
    <div className="graph-page">
      {/* ── Page header ── */}
      <header className="page-header">
        <div>
          <p className="eyebrow">Dependency graph</p>
          <h1 className="page-title">Interactive dependency visualization</h1>
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div className="graph-toolbar">
        <div className="graph-toolbar-group">
          <button className={`btn btn-sm ${mode==='default'?'btn-primary':'btn-secondary'}`} onClick={() => setMode('default')}>Default</button>
          <button className={`btn btn-sm ${mode==='attack'?'btn-primary':'btn-secondary'}`} onClick={() => setMode('attack')}>Attack paths</button>
          <button className={`btn btn-sm ${mode==='propagation'?'btn-primary':'btn-secondary'}`} onClick={() => setMode('propagation')}>Propagation</button>
        </div>
        <div className="graph-toolbar-group">
          <button className="btn btn-secondary btn-sm" onClick={() => cyRef.current?.reset()}>Reset view</button>
          <button className="btn btn-secondary btn-sm" onClick={() => cyRef.current?.fit()}>Fit</button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="graph-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.nodes}</div>
          <div className="stat-label">Dependencies</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.vulnerable}</div>
          <div className="stat-label">Vulnerable</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.attackEdges}</div>
          <div className="stat-label">Attack edges</div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="graph-content">
        <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div ref={containerRef} className="graph-canvas">
            {loading && (
              <div className="graph-loading">
                <Spinner size="lg" />
                <p className="page-loading-text">Loading dependency graph…</p>
              </div>
            )}
          </div>

          {/* ── Legend ── */}
          <div className="legend">
            <div className="legend-title">Legend</div>
            <div className="legend-items" style={{ flexDirection: 'row', gap: '16px', flexWrap: 'wrap' }}>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#d64545' }}></span>
                Critical
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#f39c12' }}></span>
                High
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#f1c40f' }}></span>
                Medium
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#2ecc71' }}></span>
                Low
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: '#e6eef8' }}></span>
                No risk
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="graph-sidebar">
          {selected ? (
            <div className="graph-node-detail">
              <p className="eyebrow">Selected package</p>
              <div className="graph-node-name">
                {selected.name}<span className="text-muted" style={{ fontWeight: 400 }}>@{selected.version}</span>
              </div>

              <div className="graph-node-meta">
                <div className="graph-node-meta-row">
                  <span className="graph-node-meta-label">Risk level</span>
                  <span className="graph-node-meta-value">
                    {selected.riskLevel
                      ? <span className={`pill pill-${selected.riskLevel.toLowerCase()}`}>{selected.riskLevel}</span>
                      : <span className="text-faint">UNKNOWN</span>}
                  </span>
                </div>
                <div className="graph-node-meta-row">
                  <span className="graph-node-meta-label">Vulnerabilities</span>
                  <span className="graph-node-meta-value">{selected.vulnCount ?? 0}</span>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />

              <div>
                <p className="eyebrow">Priority</p>
                <p className="text-muted text-sm">Priority score and recommended action are available in the Scan detail page.</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="eyebrow">Inspector</p>
              <p className="graph-sidebar-title" style={{ marginBottom: 8 }}>Node details</p>
              <p className="graph-sidebar-empty">Select a node in the graph to see package details, vulnerabilities and recommendations.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

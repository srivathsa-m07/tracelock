import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import api from '../services/api';
import './DependencyGraph.css';

export default function DependencyGraph() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [mode, setMode] = useState<'default'|'attack'|'propagation'>('default');

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
        if (attack && attack.length > 0) {
          (attack || []).forEach((path: string[]) => {
            for (let i = 0; i < path.length - 1; i++) {
              const edgeId = `${path[i]}-${path[i+1]}`;
              const e = cy.edges().filter((ed: any) => ed.data('id') === edgeId);
              if (e && e.length > 0) e.addClass('attack-path');
            }
          });
        }

        // enable basic interactions
        cy.zoomingEnabled(true);
        cy.panningEnabled(true);
        cy.userZoomingEnabled(true);
        cy.userPanningEnabled(true);

        // ensure canvas resizes when container size changes
        const ro = new ResizeObserver(() => cy.resize());
        if (containerRef.current) ro.observe(containerRef.current);
        // cleanup observer on unmount
        (cy as any)._ro = ro;
      })
      .catch((e) => console.error('Failed to load graph', e));

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
      <div className="graph-toolbar">
        <div>
          <button className={`button ${mode==='default'?'button-primary':''}`} onClick={() => setMode('default')}>Default</button>
          <button className={`button ${mode==='attack'?'button-primary':''}`} onClick={() => setMode('attack')}>Attack paths</button>
          <button className={`button ${mode==='propagation'?'button-primary':''}`} onClick={() => setMode('propagation')}>Propagation</button>
        </div>
        <div>
          <button className="button" onClick={() => cyRef.current?.reset()}>Reset view</button>
          <button className="button" onClick={() => cyRef.current?.fit()}>Fit</button>
        </div>
      </div>

      <div className="graph-content">
        <div style={{flex:'1 1 0', display:'flex', flexDirection:'column'}}>
          <div className="graph-stats">
            <div className="stat-card">
              <div className="stat-value">{cyRef.current?.nodes()?.length ?? 0}</div>
              <div className="stat-label">Dependencies</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{cyRef.current?.nodes().filter((n:any)=>n.data('vulnCount')>0).length ?? 0}</div>
              <div className="stat-label">Vulnerable</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{cyRef.current?.edges().filter((e:any)=>e.hasClass('attack-path')).length ?? 0}</div>
              <div className="stat-label">Attack paths</div>
            </div>
          </div>
          <div ref={containerRef} className="graph-canvas" />
          <div className="legend">
            <strong>Legend</strong>
            <div style={{display:'flex', gap:8, marginTop:8}}>
              <div style={{display:'flex',gap:6,alignItems:'center'}}><span style={{width:12,height:12,background:'#d64545',display:'inline-block',borderRadius:3}}></span> CRITICAL</div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}><span style={{width:12,height:12,background:'#f39c12',display:'inline-block',borderRadius:3}}></span> HIGH</div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}><span style={{width:12,height:12,background:'#f1c40f',display:'inline-block',borderRadius:3}}></span> MEDIUM</div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}><span style={{width:12,height:12,background:'#2ecc71',display:'inline-block',borderRadius:3}}></span> LOW</div>
            </div>
          </div>
        </div>
        <aside className="graph-sidebar">
          <div style={{maxHeight:'70vh',overflow:'auto'}}>
          {selected ? (
            <div>
              <h3>{selected.name}@{selected.version}</h3>
              <p>Risk level: <strong>{selected.riskLevel ?? 'UNKNOWN'}</strong></p>
              <p>Vulnerabilities: {selected.vulnCount ?? 0}</p>
              <hr />
              <div>
                <h4>Priority</h4>
                <p>Priority score and recommended action are available in the Scan detail page.</p>
              </div>
            </div>
          ) : (
            <div>
              <h3>Inspector</h3>
              <p>Select a node to see package details, vulnerabilities and recommendations.</p>
            </div>
          )}
          </div>
        </aside>
      </div>
    </div>
  );
}

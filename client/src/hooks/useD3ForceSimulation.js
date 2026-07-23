import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';

export function useD3ForceSimulation(nodes, links, width, height, options = {}) {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const gRef = useRef(null);

  const {
    linkDistance = 120,
    chargeStrength = -300,
    collisionRadius = 30,
    centerOnResize = true,
    onNodeClick,
    highlightedNodesRef,
  } = options;

  useEffect(() => {
    if (!nodes.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Arrow marker
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94a3b8');

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const g = svg.append('g');
    gRef.current = g;

    // Force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(linkDistance))
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(collisionRadius));

    // Links
    const linkGroup = g.append('g').attr('class', 'links');
    const linkElements = linkGroup
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) => d.color || '#94a3b8')
      .attr('stroke-width', (d) => Math.max(0.5, Math.min((d.weight || 1) * 1.5, 5)))
      .attr('stroke-opacity', 0.5)
      .attr('marker-end', 'url(#arrowhead)');

    // Nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const nodeElements = nodeGroup
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'grab')
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node circle
    nodeElements
      .append('circle')
      .attr('r', (d) => Math.max(4, Math.min(d.size || 8, 30)))
      .attr('fill', (d) => d.color || '#6b7280')
      .attr('stroke', '#fff')
      .attr('opacity', 0.9);

    // Node label
    nodeElements
      .append('text')
      .text((d) => (d.label && d.label.length > 14 ? d.label.slice(0, 12) + '…' : d.label || d.id))
      .attr('dx', 14)
      .attr('dy', 4)
      .attr('font-size', '10px')
      .attr('fill', '#e2e8f0')
      .attr('font-family', 'Inter, sans-serif');

    // Tooltip
    nodeElements.append('title').text((d) => {
      const meta = d.metadata || {};
      const parts = [d.label || d.id];
      if (meta.path) parts.push(meta.path);
      if (meta.language) parts.push(meta.language);
      if (meta.fileCount) parts.push(`${meta.fileCount} files`);
      if (meta.loc) parts.push(`${meta.loc} LOC`);
      return parts.join(' | ');
    });

    // Hover highlight
    nodeElements
      .on('mouseenter', function (event, d) {
        const connectedIds = new Set();
        connectedIds.add(d.id);
        for (const link of links) {
          const sid = typeof link.source === 'object' ? link.source.id : link.source;
          const tid = typeof link.target === 'object' ? link.target.id : link.target;
          if (sid === d.id) connectedIds.add(tid);
          if (tid === d.id) connectedIds.add(sid);
        }
        nodeElements
          .transition()
          .duration(200)
          .attr('opacity', (n) => (connectedIds.has(n.id) ? 1 : 0.2));
        linkElements
          .transition()
          .duration(200)
          .attr('stroke-opacity', (l) => {
            const sid = typeof l.source === 'object' ? l.source.id : l.source;
            const tid = typeof l.target === 'object' ? l.target.id : l.target;
            return sid === d.id || tid === d.id ? 0.8 : 0.05;
          });
      })
      .on('mouseleave', function () {
        nodeElements.transition().duration(200).attr('opacity', 1);
        linkElements.transition().duration(200).attr('stroke-opacity', 0.5);
      });

    // Click
    if (onNodeClick) {
      nodeElements.on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d);
      });
    }

    // Tick
    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);
      nodeElements.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    simulationRef.current = simulation;

    // Resize handler
    let resizeObserver;
    if (centerOnResize && svgRef.current.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        const parent = svgRef.current.parentElement;
        if (parent) {
          const w = parent.clientWidth;
          const h = parent.clientHeight;
          simulation.force('center', d3.forceCenter(w / 2, h / 2));
          simulation.alpha(0.3).restart();
        }
      });
      resizeObserver.observe(svgRef.current.parentElement);
    }

    return () => {
      simulation.stop();
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [nodes, links, width, height]);

  const centerGraph = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(0.3).restart();
    }
  }, []);

  return { svgRef, centerGraph };
}

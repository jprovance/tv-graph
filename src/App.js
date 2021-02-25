import './App.css';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup'
import ToggleButton from 'react-bootstrap/ToggleButton'

import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import AsyncSelect from 'react-select/async';

import { ForceGraph3D } from 'react-force-graph';
import SpriteText from 'three-spritetext';

function App() {
  const rootURL = 'https://api.themoviedb.org/3/';
  const apiKeyParam = '?api_key={{}}';
  const creditsEndPoint = {
    tv: 'aggregate_credits',
    movie: 'credits',
    person: 'combined_credits'
  };
  const [search, setSearch] = useState('tv');
  const [includeCast, setIncludeCast] = useState(false);
  const [includeCrew, setIncludeCrew] = useState(true);
  const [currentCount, setCurrentCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const nodeSet = new Set()
  const linkSet = new Set()

  async function searchTMDB(inputValue) {
    const response = await fetch(rootURL + 'search/' + search + apiKeyParam + '&query=' + inputValue);
    return response.json();
  };

  function labelValue(results) {
    const labelValue = results.map(x => ({ label: search === 'movie' ? x.title : x.name, value: x.id }))
    return labelValue
  }

  const promiseOptions = inputValue =>
    new Promise(resolve => {
      setTimeout(() => {
        resolve(searchTMDB(inputValue).then(data => labelValue(data.results)));
      }, 1000);
    });

  function createLink(nodeId, nodeName, nodeType, linkSourceId, linkType, graph) {
    if (!nodeSet.has(nodeId)) {
      nodeSet.add(nodeId);
      graph.nodes.push({ id: nodeId, name: nodeName, type: nodeType });
    }
    if (!linkSet.has(linkSourceId + nodeId) && !linkSet.has(nodeId + linkSourceId)) {
      linkSet.add(linkSourceId + nodeId);
      graph.links.push({ source: linkSourceId, target: nodeId, type: linkType });
    }
  }

  async function addLinksFromNode(graph, node) {
    //https://api.themoviedb.org/3/tv/4589/aggregate_credits?api_key=4e70caad542a6c94947783a4eb0950e8
    //https://api.themoviedb.org/3/movie/4589/credits?api_key=4e70caad542a6c94947783a4eb0950e8
    //https://api.themoviedb.org/3/person/1220694/combined_credits?api_key=4e70caad542a6c94947783a4eb0950e8
    const response = await fetch(rootURL + node.type + '/' + node.id.match(/\d+/) + '/' + creditsEndPoint[node.type] + apiKeyParam);

    const raw = await response.json();
    if (includeCast) {
      if (node.type === 'person') {
        raw.cast.map(media => createLink(media.media_type + media.id, media.media_type === 'movie' ? media.title : media.name, media.media_type, node.id, 'Cast', graph))
      } else {
        raw.cast.map(member => createLink('person' + member.id, member.name, 'person', node.id, 'Cast', graph))
      }
    }
    if (includeCrew) {
      if (node.type === 'person') {
        raw.crew.map(media => createLink(media.media_type + media.id, media.media_type === 'movie' ? media.title : media.name, media.media_type, node.id, media.department, graph))
      } else {
        raw.crew.map(member => createLink('person' + member.id, member.name, 'person', node.id, member.department, graph))
      }
    }

    return graph;
  };

  async function buildGraph(opt) {
    const graph = { nodes: [], links: [] };
    nodeSet.add(search + opt.value);
    graph.nodes.push({ id: search + opt.value, name: opt.label, type: search });

    await addLinksFromNode(graph, graph.nodes[0]);

    const totalCrew = graph.nodes.length;
    setTotalCount(totalCrew - 1);
    // Add one-hop connections
    for (let i = 1; i < totalCrew; i++) {
      await addLinksFromNode(graph, graph.nodes[i]);
      setCurrentCount(i)
    };
    return graph;
  };

  function renderGraph(opt) {
    buildGraph(opt).then(graph => {
      ReactDOM.render(<ForceGraph3D
        graphData={graph}
        nodeAutoColorBy="type"
        onNodeDragEnd={node => {
          node.fx = node.x;
          node.fy = node.y;
          node.fz = node.z;
        }}
        nodeThreeObject={node => {
          const sprite = new SpriteText(node.name);
          sprite.color = node.color;
          sprite.textHeight = 8;
          return sprite;
        }}
      />,
        document.getElementById('graph'));
    });
  };

  return (
    <Container fluid>
      <Row>
        <Col><h1 className="header">Television and Movie Graph</h1></Col>
        <Col><h3>Use the search menu on the left to find the connections between shows and movies</h3></Col>
        <Col lg={1}><img src='https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg'></img></Col>
        <Col lg={2}><p fontSize={2}>This product uses the TMDb API but is not endorsed or certified by TMDb.</p></Col>
      </Row>
      <Row>
        <Col><div>
          <p>After searching for a show, movie, or person, a graph will load to the right with the shows and movies that the cast/crew of your search also worked on.</p>
          <p>First, select the category you want to search. The results will include TV, movies, and people, but you can only search within one category.</p>
          <ToggleButtonGroup type='radio' name='search-select' defaultValue='tv'>
            <ToggleButton onClick={() => setSearch('tv')} value='tv'>Television</ToggleButton>
            <ToggleButton onClick={() => setSearch('movie')} value='movie'>Movies</ToggleButton>
            <ToggleButton onClick={() => setSearch('person')} value='person'>People</ToggleButton>
          </ToggleButtonGroup>
          <p>Next, select what roles to include.</p>
          <ToggleButton type="checkbox" variant="secondary" checked={includeCast} onChange={(e) => setIncludeCast(e.currentTarget.checked)}>Include Cast</ToggleButton>
          <ToggleButton type="checkbox" variant="secondary" checked={includeCrew} onChange={(e) => setIncludeCrew(e.currentTarget.checked)}>Include Crew</ToggleButton>
          <p>Finally, search for a title in the box below and then click on the item to load the graph. To load a new graph, search for a new title or person.</p>
          <AsyncSelect cacheOptions loadOptions={promiseOptions} onChange={opt => renderGraph(opt)} />
          <h2>Loaded {currentCount} of {totalCount}</h2>
          <p>Left-click to rotate, right-click to pan, scroll to zoom. View source code on <a href='https://github.com/jprovance/tv-graph'>Github</a></p>
        </div></Col>
        <Col lg={10}><div id='graph'></div></Col>
      </Row>
    </Container>
  );
};

export default App;

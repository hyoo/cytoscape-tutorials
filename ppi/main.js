"use strict";

document.addEventListener('DOMContentLoaded', function(){
	var taxonID;
	var cy = window.cy = cytoscape({
		container: document.getElementById('cy'),
		boxSelectionEnabled: true,
		style: [
			{
				selector: 'node',
				style: {
					label: 'data(name)',
					'text-opacity': 0.8,
					'text-valign': 'center',
					'text-halign': 'center',
					'font-size': 10,
					width: 40,
					height: 40,
					// border
					'border-color': '#666666',
					'border-width': 1,
					'border-opacity': 0.8,
					// background
					'background-color': '#99CCFF'
				}
			}, {
				selector: 'node:selected',
				style: {
					'border-color': '#BBBB55',
					'shadow-color': '#FFFF33',
					'shadow-blur': 12,
					'shadow-opacity': 1
				}
			}, {
				selector: 'edge',
				style: {
					width: 2,
					'background-color': '#555555',
					'curve-style': 'bezier'
				}
			}, {
				selector: 'edge:selected',
				style: {
					'line-color': '#BBBB55',
					'shadow-color': '#FFFF33',
					'shadow-blur': 12,
					'shadow-opacity': 1
				}
			}
		]
	});
	cy.panzoom();

	cy.contextMenus({
		menuItems: [{
			id: 'highlight',
			title: 'highlight',
			selector: 'node',
			onClickFunction: function(event){
				console.log(event);
			},
			hasTrailingDivider: true
		}, {
			id: 'selectNeighborhood',
			title: 'select Neighborhood',
			selector: 'node',
			onClickFunction: function(evt){
				cy.nodes().unselect();

				var rootNode = evt.cyTarget;
				rootNode.neighborhood().select();
			}
		}, {
			id: 'selectSubgraph',
			title: 'select Connected Sub-graph',
			selector: 'node',
			onClickFunction: function(evt){
				cy.nodes().unselect();

				var rootNode = evt.cyTarget;
				var visitedArr = [rootNode];
				cy.elements().bfs({
					roots: rootNode,
					visit: function(i, depth, v, e, u){
						visitedArr.push(v); // include node
						visitedArr.push(e); // include edge
					},
					directed: false
				});

				cy.collection(visitedArr).select();
			}
		}]
	});

	var raw_data;

	var submitButton = document.getElementById('submitButton');
	submitButton.addEventListener('click', function(){
		taxonID = document.getElementById('taxonID').value || 246196; // 196627, 246196, 1773

		getData(taxonID)
			.then(function(d){
				raw_data = d;
				console.log(d);
				addToGraph(d.data);

				// cy.layout({name: 'cose-bilkent'});
				cy.layout({name: 'cola'});
			})
	});

	submitButton.click();

	// layout button
	var layoutCoseButton = document.getElementById('cose-bilkent');
	layoutCoseButton.addEventListener('click', function(){
		cy.layout({name: 'cose-bilkent'});
	});
	var layoutColaButton = document.getElementById('cola');
	layoutColaButton.addEventListener('click', function(){
		cy.layout({name: 'cola'});
	});
	var layoutDagreButton = document.getElementById('dagre');
	layoutDagreButton.addEventListener('click', function(){
		cy.layout({name: 'dagre'});
	});

	// action buttons
	var actionSaveButton = document.getElementById('download_image');
	actionSaveButton.addEventListener('click', function(){
		console.log(cy.png());
	});
	var actionDownloadButton = document.getElementById('download_data');
	actionDownloadButton.addEventListener('click', function(){
		console.log(raw_data.data);
	});

	var actionSelectSubGraph = document.getElementById('selectSubGraph');
	actionSelectSubGraph.addEventListener('click', function(){
		var nodeCriteria = 5;

		cy.nodes().unselect();

		var rootNodes = getUniqueRootNodes();

		console.time("selectSubGraph");
		for(var i = 0; i < rootNodes.length; i++){

			var visitedArr = [];
			var nodeCount = 0;
			cy.elements().bfs({
				roots: rootNodes[i],
				visit: function(i, depth, v, e, u){
					visitedArr.push(v);
					// visitedArr.push(e);
					v.connectedEdges().forEach(function(e){
						visitedArr.push(e);
					});
					nodeCount++;
				},
				directed: false
			});

			// console.log(i, rootNodes[i].data('name'), visitedArr.length, nodeCount);
			if(nodeCount > nodeCriteria){
				cy.collection(visitedArr).select();
			}
		}
		console.timeEnd("selectSubGraph");
	});
	var actionSelectLargestSubGraph = document.getElementById('selectLargestSubGraph');
	actionSelectLargestSubGraph.addEventListener('click', function(){

	});
	var actionSelectHubProtein = document.getElementById('selectHubProtein');
	actionSelectHubProtein.addEventListener('click', function(){
		cy.nodes().unselect();

		var selectedHubs = getHubs(3);

		cy.collection(selectedHubs).select();
	});
	var actionSelectLargestHubProtein = document.getElementById('selectLargestHubProtein');
	actionSelectLargestHubProtein.addEventListener('click', function(){
		cy.nodes().unselect();

		var selectedHub = getHubs('max');
		cy.collection(selectedHub).select();
	});
});

function getData(txID){
	var p = $.ajax({
		url: 'https://www.patricbrc.org/api/ppi/?descendants(' + txID + ')&keyword()&facet((pivot,(method_id,method_name)),(mincount,1))&facet((pivot,(type_id,type_name)),(mincount,1))&facet((pivot,(taxon_a,taxon_b)),(mincount,1))&facet((pivot,(taxon_a,taxid_a)),(mincount,1))&facet((pivot,(taxon_b,taxid_b)),(mincount,1))&facet((pivot,(taxon_a,group_a)),(mincount,1))&facet((pivot,(taxon_b,group_b)),(mincount,1))&limit(500,0)',
		type: 'GET',
		headers: {
			Accept: 'application/solr+json',
			'Content-Type': 'application/rqlquery+x-www-form-urlencoded'
		},
		dataType: 'json'
	});

	return Promise.all([p])
		.then(function(then){
			return {
				facets: then[0].facet_counts.facet_pivot || {},
				data: then[0].response.docs
			};
		})
}

function addToGraph(data){

	if(data.length == 0) return;

	cy.batch(function(){
		data.forEach(function(d){
			var i_a = d.interactor_a;
			var i_b = d.interactor_b;

			if(cy.getElementById(i_a).empty()){
				cy.add(createInteractorCyEle(d, 'a'));
			}
			if(cy.getElementById(i_b).empty()){
				cy.add(createInteractorCyEle(d, 'b'));
			}

			cy.add({
				data: {
					id: d['interaction_id'],
					source: i_a,
					target: i_b,
					type_name: d['type_name'],
					method_name: d['method_name']
				}
			})
		});
	})
}

function createInteractorCyEle(d, ab){

	return {
		data: {
			id: d['interactor_' + ab],
			name: d['annotation_' + ab],
			taxon: d['taxon_' + ab]
		},
		selectable: true
	}
}

function getUniqueRootNodes(){
	var candidateNodes = cy.nodes().leaves();
	var rootNodes = [];

	console.time("getUniqueRootNodes");
	for(var ti = 0; ti < candidateNodes.length; ti++){
		var candidate = candidateNodes[ti];
		// console.log("Candidate: ", candidate.data('name'));

		var graph = cy.elements().dijkstra({
			root: candidate,
			directed: false
		});

		var check = cy.collection(rootNodes).every(function(ele, i){
			// console.log(i, "distance to ", ele.data('name'), ": ", graph.distanceTo(ele));
			return graph.distanceTo(ele) == Infinity;
		});

		if(check){
			rootNodes.push(candidate);
			// console.log("added to rootNodes: ", rootNodes.length);
		}
	}
	console.timeEnd("getUniqueRootNodes");

	return rootNodes;
}

function getUniqueRootNodes2(){
	var candidateNodes = cy.nodes().roots();
	var rootNodes = cy.nodes().roots();

	console.time("getUniqueRootNodes");
	var allElements = cy.elements();
	for(var i = 0; i < candidateNodes.length; i++){
		for(var j = i + 1; j < candidateNodes.length; j++){
			var found = allElements.aStar({root: candidateNodes[i], goal: candidateNodes[j]}).found;
			console.log(i, j, found);
			if(found){
				rootNodes = rootNodes.difference(candidateNodes[i]);
				break;
			}
		}
	}
	console.timeEnd("getUniqueRootNodes");

	return rootNodes;
}

function getHubs(minSize){
	var boolGetLargestMode = false;
	var largestNodes = {}; // key: node id, value: count
	var selectedHubs = []; // nodes

	if(typeof(minSize) == 'undefined' || minSize == 'max'){
		boolGetLargestMode = true;
		minSize = 0;
	}

	cy.nodes().forEach(function(node){

		// console.log(node.data('name'), node.connectedEdges().length);
		if(node.connectedEdges().length >= minSize){
			var connectedNodes = {};
			node.connectedEdges().forEach(function(edge){
				if(node.same(edge.source())){
					if(!connectedNodes.hasOwnProperty(edge.target().data('id'))){
						connectedNodes[edge.target().data('id')] = true;
					}
				}else if(node.same(edge.target())){
					if(!connectedNodes.hasOwnProperty(edge.source().data('id'))){
						connectedNodes[edge.source().data('id')] = true;
					}
				}
			});
			// console.log(connectedNodes);
			var nodeCount = Object.keys(connectedNodes).length;

			if(nodeCount >= minSize){
				selectedHubs.push(node);

				if(boolGetLargestMode){
					largestNodes[node.data('id')] = nodeCount;
					minSize = nodeCount; // to reduce the size of largestNodes collection
				}
			}
		}
	});

	if(boolGetLargestMode){
		// console.log(largestNodes);
		selectedHubs = Object.keys(largestNodes).filter(function(key){
			return (largestNodes[key] >= minSize);
		}).map(function(key){
			return cy.getElementById(key);
		});
		// console.log(selectedHubs);
	}

	return selectedHubs;
}
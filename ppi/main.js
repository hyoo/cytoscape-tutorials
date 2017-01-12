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
			id: 'selectN',
			title: 'select Neighborhood',
			selector: 'node'
		}, {
			id: 'selectS',
			title: 'select Connected Sub-graph',
			selector: 'node'
		}]
	});

	var raw_data;

	var submitButton = document.getElementById('submitButton');
	submitButton.addEventListener('click', function(){
		taxonID = document.getElementById('taxonID').value || 196627;

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
					name: d['type_name'] + ' (' + d['method_name'] + ')'
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
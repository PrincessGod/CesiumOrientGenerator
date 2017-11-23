/*global Cesium $ Promise document console*/
'use strict';
var viewer = new Cesium.Viewer('cesiumContainer');
var scene = viewer.scene;

//
// Load
//
var qufuTilesets = [
//   './qufu/BatchedQFJZW/',
//   './qufu/BatchedQFDM/',
//   './qufu/BatchedQFJF/',
//   './qufu/BatchedQFJFNBSB/',
//   './qufu/BatchedQFJG/'
    './qufu/'
];
var tiles = [];
var models = [];
var tileRegex = /([^\/]+).b3dm/g;

loadTilesets(qufuTilesets, tiles);

function loadTilesets(tilesets, tiles) {
    var isFirst = true;
    var promises = [];

    tilesets.forEach(function(tileset, index, array) {
        var result = new Cesium.Cesium3DTileset({
            url: tileset
        });
        scene.primitives.add(result);
        array[index] = result;
        result.tileLoad.addEventListener(function(tile) {
            tiles.push(tile);
        });
    });

    // models loaded Promise
    tilesets.forEach(function(tileset) {
        tileset.readyPromise.then(function(tileset) {
            if (!isFirst) {return;}
            isFirst = false;
            var boundingSphere = tileset.boundingSphere;
            var range = Math.max(100.0 - boundingSphere.radius, 0.0); // Set a minimum offset of 100 meters
            viewer.camera.viewBoundingSphere(boundingSphere, new Cesium.HeadingPitchRange(0, -2.0, range));
            viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

            var button = document.getElementById('home-btn');
            button.onclick = function (){
                viewer.camera.viewBoundingSphere(boundingSphere, new Cesium.HeadingPitchRange(0, -2.0, range));
                viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
            };
        }).otherwise(function(error) {
            throw(error);
        });
    });

    tilesets.forEach(function(tileset) {
    promises.push(new Promise(function(resolve) {
        tileset.loadProgress.addEventListener(function(numberOfPendingRequests, numberOfTilesProcessing) {
            if ((numberOfPendingRequests === 0) && (numberOfTilesProcessing === 0)) {
                console.log('Stopped loading');
                resolve();
            }
            console.log('Loading: requests: ' + numberOfPendingRequests + ', processing: ' + numberOfTilesProcessing);
        });
        }));
    });

    Promise.all(promises)
        .then(function() {
            var modelIndex = 0;
            tiles.forEach(function(tile) {
                var tileContent = tile.content;
                var batchtableLength = tileContent.featuresLength;
                var modelNames = [];
                var modelIds = [];
                for (var i = 0; i < batchtableLength; i ++) {
                    var feature = tileContent.getFeature(i);
                    var name = feature.getProperty('name');
                    if (name[name.length - 3] === 'O') {
                        feature.show = false;
                    }
                    modelNames.push(name);
                    modelIds.push('model' + modelIndex++);
                }
                if(batchtableLength > 0) {
                    var tileName = tileContent.url.match(tileRegex) || 'unMatched';
                    models.push({
                        tile: tileName[0] || tileName,
                        models: modelNames,
                        id: modelIds
                    });
                }
            });

            var index = 0;
            models.forEach(function(modelList) {
                var div = document.createElement('div');
                $(div).addClass('card-header')
                    .attr('role', 'tab')
                    .attr('id', 'header' + index)
                    .appendTo($('#models'));
                var h5 = document.createElement('h5');
                $(h5).addClass('mb-0')
                    .appendTo($(div));
                var a = document.createElement('a');
                $(a).attr('data-toggle', 'collapse')
                    .attr('aria-expanded', 'true')
                    .attr('aria-controls', 'collapse' + index)
                    .attr('href', '#collapse' + index)
                    .text(modelList.tile)
                    .appendTo($(h5));
                var listDiv = document.createElement('div');
                $(listDiv).addClass('collapse')
                    .attr('id', 'collapse' + index)
                    .attr('role', 'tabpanel')
                    .attr('aria-labelledby', 'header' + index++)
                    .attr('data-parent', '#accordion')
                    .appendTo($('#models'));
                var cardBody = document.createElement('div');
                $(cardBody).addClass('card-body')
                    .appendTo($(listDiv));
                var ul = document.createElement('ul');
                $(ul).addClass('list-group')
                    .appendTo($(cardBody));
                modelList.models.forEach(function(name, index) {
                    var li = document.createElement('li');
                    $(li).addClass('list-group-item')
                        .attr('id', modelList.id[index])
                        .html(name)
                        .appendTo($(ul));
                });
            });
        })
        .catch(function(err) {
            console.log(err);
        });
}

//
// Operate
//
function setDoorShowProperty(doorName, show) {
    for (var i = 0; i < tiles.length; i++) {
        var tile = tiles[i];
        var tileContent = tile.content;
        var batchtableLength = tileContent.featuresLength;
        for (var j = 0; j < batchtableLength; j++) {
            var feature = tileContent.getFeature(j);
            var name = feature.getProperty('name');
            if (name === doorName) {
                feature.show = show;
                return;
            }
        }
    }
}

function isDoor(name) {
    return name[name.length - 3] === 'O' || name[name.length - 3] === 'C';
}

function getModelId (name) {
    for(var i = 0; i < models.length; i++) {
        var index = models[i].models.indexOf(name);
        if(index > -1) {
            return models[i].id[index];
        }
    }
}

function getModelParentId (id) {
    for(var i = 0; i < models.length; i++) {
        var index = models[i].id.indexOf(id);
        if(index > -1) {
            return 'collapse' + i;
        }
    }
}

function chengeTolink (id) {
    var a = document.createElement('a');
    $(a).addClass('list-group-item list-group-item-action list-group-item-success')
        .html($('#' + id).html())
        .attr('href', '#')
        .insertBefore($('#' + id));
    $('#' + id).remove();
    $(a).attr('id', id);
}

function setLinkActive (id, active) {
    if (active) {
        $('#' + id).addClass('list-group-item-danger');
    }
    else {
        $('#' + id).removeClass('list-group-item-danger');
    }
}

function showCurrentSelect(id) {
    $('.collapse').removeClass('show');
    $('#' + getModelParentId(id)).addClass('show');
    $('#' + id)[0].scrollIntoView(true);
}

//
// Inspect
//
var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
var lastFeature;
// When a feature is left clicked, print its properties
handler.setInputAction(function(movement) {
    var feature = viewer.scene.pick(movement.position);
    var name;
    if (lastFeature) {
        lastFeature.color = Cesium.Color.WHITE;
        name = lastFeature.getProperty('name');
        setLinkActive(getModelId(name), false);
        lastFeature = undefined;
    }
    if (!Cesium.defined(feature) || !(feature instanceof Cesium.Cesium3DTileFeature)) {
        return;
    }
    feature.color = new Cesium.Color(1.0, 192 / 255, 203 / 255, 0.8);
    name = feature.getProperty('name');
    var id = getModelId(name);
    chengeTolink(id);
    setLinkActive(id, true);
    showCurrentSelect(id);
    lastFeature = feature;

    console.log('Properties:');
    var propertyNames = feature.getPropertyNames();
    var length = propertyNames.length;
    for (var i = 0; i < length; ++i) {
        name = propertyNames[i];
        var value = feature.getProperty(name);
        console.log('  ' + name + ': ' + value);
    }
    if (isDoor(name)) {
        var theOther;
        var theIndex = name.length - 3;
        if (name[theIndex] === 'O') {
            theOther = name.substr(0, theIndex) + 'C' + name.substr(theIndex + 1);
        }
        else {
            theOther = name.substr(0, theIndex) + 'O' + name.substr(theIndex + 1);
        }
        setDoorShowProperty(name, false);
        setDoorShowProperty(theOther, true);
    }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// fetch('http://localhost:3000/name')
//     .then(response => response.json())
//     .then(json => console.log(json))
//     .catch(err => console.log(err));

// fetch('http://localhost:3000/name', {
//     method: 'post',
//     headers: {
//         'Accept': 'application/json',
//         'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//         name: 'insert'
//     })
// })
// .then(response => console.log(response))
// .catch(err => console.log(err));

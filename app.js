/*global Cesium Promise document console*/
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

            var modelDiv = document.getElementById('models');
            var index = 0;
            models.forEach(function(modelList) {
                var div = document.createElement('div');
                div.className = 'card-header';
                div.setAttribute('role', 'tab');
                div.id = 'header' + index;
                var h5 = document.createElement('h5');
                h5.className = 'mb-0';
                var a = document.createElement('a');
                a.setAttribute('data-toggle', 'collapse');
                a.setAttribute('aria-expanded', 'true');
                a.setAttribute('aria-controls', 'collapseOne');
                a.href = '#collapse' + index;
                a.innerText = modelList.tile;
                var listDiv = document.createElement('div');
                listDiv.id = 'collapse' + index;
                if(index === 0){
                    listDiv.className = 'collapse show';
                }
                else {
                    listDiv.className = 'collapse';
                }
                listDiv.setAttribute('role', 'tabpanel');
                listDiv.setAttribute('aria-labelledby', 'header' + index++);
                listDiv.setAttribute('data-parent', 'accordion');
                var cardBody = document.createElement('div');
                cardBody.className = 'card-body';
                var ul = document.createElement('ul');
                ul.className = 'list-group';
                modelList.models.forEach(function(name, index) {
                    var li = document.createElement('li');
                    li.className = 'list-group-item';
                    li.id = modelList.id[index];
                    li.innerText = name;
                    ul.appendChild(li);
                });
                modelDiv.appendChild(div);
                div.appendChild(h5);
                h5.appendChild(a);
                modelDiv.appendChild(listDiv);
                listDiv.appendChild(cardBody);
                cardBody.appendChild(ul);
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

function chengeTolink (id) {
    if (!id) {return;}
    var li = document.getElementById(id);
    if(!!li) {
        var a = document.createElement('a');
        a.className = 'list-group-item list-group-item-action list-group-item-success';
        a.innerText = li.innerText;
        a.href = '#';
        li.parentNode.insertBefore(a, li);
        li.parentNode.removeChild(li);
    }
}

//
// Inspect
//
var handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
// When a feature is left clicked, print its properties
handler.setInputAction(function(movement) {
    var feature = viewer.scene.pick(movement.position);
    var name;
    if (!Cesium.defined(feature) || !(feature instanceof Cesium.Cesium3DTileFeature)) {
        return;
    }
    console.log('Properties:');
    var propertyNames = feature.getPropertyNames();
    var length = propertyNames.length;
    for (var i = 0; i < length; ++i) {
        name = propertyNames[i];
        var value = feature.getProperty(name);
        console.log('  ' + name + ': ' + value);
    }
    name = feature.getProperty('name');
    chengeTolink(getModelId(name));
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

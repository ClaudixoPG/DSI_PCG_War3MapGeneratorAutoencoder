"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require('fs');
var wc3maptranslator_1 = require("wc3maptranslator");
//make a for loop to iterate through all the files in the folder
//for each folder, search for the .w3e file and convert it to json
//then save the json file in the folder "ConvertedMaps" in a route like this: "ConvertedMaps\mapName.json"
var mapsFolder = "D:\\DSI_PCG\\ExtractedMaps";
var maps = fs.readdirSync(mapsFolder);
for (var i = 2100; i < maps.length; i++) {
    var mapName = maps[i];
    var mapPath = mapsFolder + "\\" + mapName;
    var mapFiles = fs.readdirSync(mapPath);
    var mapFile = mapFiles.find(function (file) { return file.endsWith(".w3e"); });
    //check if the map was already converted to json and saved in the folder "ConvertedMaps"
    var convertedMapsFolder = "D:\\DSI_PCG\\ConvertedMaps";
    var convertedMaps = fs.readdirSync(convertedMapsFolder);
    if (convertedMaps.includes(mapName + ".json")) {
        console.log("Skipping map ".concat(mapName, " as it was already converted."));
        continue; // Jump to the next iteration of the loop
    }
    // Skip to the next map if mapFile is null
    if (mapFile === undefined) {
        console.log("Skipping map ".concat(mapName, " as it doesn't contain a .w3e file."));
        continue; // Jump to the next iteration of the loop
    }
    var mapFilePath = mapPath + "\\" + mapFile;
    var mapBuffer = fs.readFileSync(mapFilePath);
    //check if the map buffer is empty
    if (mapBuffer.length == 0) {
        console.log("Skipping map ".concat(mapName, " as it's empty."));
        continue; // Jump to the next iteration of the loop
    }
    //check if the map buffer is corrupted
    try {
        var Terrain = wc3maptranslator_1.TerrainTranslator.warToJson(mapBuffer);
    }
    catch (error) {
        console.log("Skipping map ".concat(mapName, " as it's corrupted."));
        continue; // Jump to the next iteration of the loop
    }
    // Check if terain dimensions are valid for saving the map
    if (!checkMapSize(Terrain.json.map, 96, 96)) {
        console.log("Skipping map ".concat(mapName, " as it doesn't have a valid size."));
        continue; // Jump to the next iteration of the loop
    }
    var mapJsonPath = "D:\\DSI_PCG\\ConvertedMaps" + "\\" + mapName + ".json";
    fs.writeFileSync(mapJsonPath, JSON.stringify(Terrain));
}
//Create a funcion to check if the map width and height are valid (96x96)
function checkMapSize(map, width, height) {
    var mapWidth = map.width;
    var mapHeight = map.height;
    if (mapWidth != width || mapHeight != height) {
        return false;
    }
    return true;
}

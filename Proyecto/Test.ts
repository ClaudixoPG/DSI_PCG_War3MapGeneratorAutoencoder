
const fs = require('fs');

import {
    CamerasTranslator,
    DoodadsTranslator,
    ImportsTranslator,
    InfoTranslator,
    ObjectsTranslator,
    RegionsTranslator,
    SoundsTranslator,
    StringsTranslator,
    TerrainTranslator,
    UnitsTranslator
  } from 'wc3maptranslator';

  //make a for loop to iterate through all the files in the folder
    //for each folder, search for the .w3e file and convert it to json
    //then save the json file in the folder "ConvertedMaps" in a route like this: "ConvertedMaps\mapName.json"

    var mapsFolder = "C:\\Users\\claud\\Desktop\\TEST\\ExtractedMaps";

    var maps = fs.readdirSync(mapsFolder);
    
    for (var i = 0; i < maps.length; i++) {
      var mapName = maps[i];
      var mapPath = mapsFolder + "\\" + mapName;
      var mapFiles = fs.readdirSync(mapPath);

      var mapFile = mapFiles.find(function (file) { return file.endsWith(".w3e"); });

      var mapFilePath = mapPath + "\\" + mapFile;
      var mapBuffer = fs.readFileSync(mapFilePath);

      var Terrain = TerrainTranslator.warToJson(mapBuffer);
      
      var mapJsonPath = "C:\\Users\\claud\\Desktop\\TEST\\ConvertedMaps" + "\\" + mapName + ".json";
      fs.writeFileSync(mapJsonPath, JSON.stringify(Terrain));
    }

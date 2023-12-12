"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectsTranslator = void 0;
const HexBuffer_1 = require("../HexBuffer");
const W3Buffer_1 = require("../W3Buffer");
var TableType;
(function (TableType) {
    TableType["original"] = "original";
    TableType["custom"] = "custom";
})(TableType || (TableType = {}));
var ModificationType;
(function (ModificationType) {
    ModificationType["int"] = "int";
    ModificationType["real"] = "real";
    ModificationType["unreal"] = "unreal";
    ModificationType["string"] = "string";
})(ModificationType || (ModificationType = {}));
var FileTypeExtension;
(function (FileTypeExtension) {
    FileTypeExtension["units"] = "w3u";
    FileTypeExtension["items"] = "w3t";
    FileTypeExtension["destructables"] = "w3b";
    FileTypeExtension["doodads"] = "w3d";
    FileTypeExtension["abilities"] = "w3a";
    FileTypeExtension["buffs"] = "w3h";
    FileTypeExtension["upgrades"] = "w3q"; // (*)
})(FileTypeExtension || (FileTypeExtension = {}));
;
var ObjectType;
(function (ObjectType) {
    ObjectType["Units"] = "units";
    ObjectType["Items"] = "items";
    ObjectType["Destructables"] = "destructables";
    ObjectType["Doodads"] = "doodads";
    ObjectType["Abilities"] = "abilities";
    ObjectType["Buffs"] = "buffs";
    ObjectType["Upgrades"] = "upgrades";
})(ObjectType || (ObjectType = {}));
;
class ObjectsTranslator {
    static jsonToWar(type, json) {
        const outBufferToWar = new HexBuffer_1.HexBuffer();
        /*
         * Header
         */
        outBufferToWar.addInt(2); // file version
        const generateTableFromJson = (tableType, tableData) => {
            Object.keys(tableData).forEach((defKey) => {
                const obj = tableData[defKey];
                // Original and new object ids
                if (tableType === TableType.original) {
                    outBufferToWar.addChars(defKey);
                    outBufferToWar.addByte(0);
                    outBufferToWar.addByte(0);
                    outBufferToWar.addByte(0);
                    outBufferToWar.addByte(0); // no new Id is assigned
                }
                else {
                    // e.g. "h000:hfoo"
                    outBufferToWar.addChars(defKey.substring(5, 9)); // original id
                    outBufferToWar.addChars(defKey.substring(0, 4)); // custom id
                }
                // Number of modifications made to this object
                outBufferToWar.addInt(obj.length);
                obj.forEach((mod) => {
                    let modType;
                    // Modification id (e.g. unam = name; reference MetaData lookups)
                    outBufferToWar.addChars(mod.id);
                    // Determine what type of field the mod is (int, real, unreal, string)
                    if (mod.type) { // if a type is specified, use it
                        modType = this.varTypes[mod.type];
                    }
                    else { // otherwise we try to infer between int/string (note there is no way to detect unreal or float this way, so user must specify those explicitly)
                        if (typeof mod.value === 'number') {
                            modType = this.varTypes.int;
                        }
                        else if (typeof mod.value === 'string') {
                            modType = this.varTypes.string;
                        }
                        else {
                            // ERROR: no type specified and cannot infer type!
                        }
                    }
                    outBufferToWar.addInt(modType);
                    // Addl integers
                    // Required for: doodads, abilities, upgrades
                    if (type === ObjectType.Doodads || type === ObjectType.Abilities || type === ObjectType.Upgrades) {
                        // Level or variation
                        // We need to check if hasOwnProperty because these could be explititly
                        // set to 0, but JavaScript's truthiness evaluates to false to it was defaulting
                        outBufferToWar.addInt(mod.level || mod.variation || 0); // defaults to 0
                        outBufferToWar.addInt(mod.column || 0); // E.g DataA1 is 1 because of col A; refer to the xyzData.slk files for Data fields
                    }
                    // Write mod value
                    if (modType === this.varTypes.int) {
                        outBufferToWar.addInt(mod.value);
                    }
                    else if (modType === this.varTypes.real || modType === this.varTypes.unreal) {
                        // Follow-up: check if unreal values are same hex format as real
                        outBufferToWar.addFloat(mod.value);
                    }
                    else if (modType === this.varTypes.string) {
                        // Note that World Editor normally creates a TRIGSTR_000 for these string
                        // values - WC3MapTranslator just writes the string directly to file
                        outBufferToWar.addString(mod.value);
                    }
                    // End of struct
                    if (tableType === TableType.original) {
                        // Original objects are ended with their base id (e.g. hfoo)
                        outBufferToWar.addChars(defKey);
                    }
                    else {
                        // Custom objects are ended with 0000 bytes
                        outBufferToWar.addByte(0);
                        outBufferToWar.addByte(0);
                        outBufferToWar.addByte(0);
                        outBufferToWar.addByte(0);
                    }
                });
            });
        };
        /*
         * Original table
         */
        outBufferToWar.addInt(Object.keys(json.original).length);
        generateTableFromJson(TableType.original, json.original);
        /*
         * Custom table
         */
        outBufferToWar.addInt(Object.keys(json.custom).length); // # entry modifications
        generateTableFromJson(TableType.custom, json.custom);
        return {
            errors: [],
            buffer: outBufferToWar.getBuffer()
        };
    }
    static warToJson(type, buffer) {
        const result = { original: {}, custom: {} };
        const outBufferToJSON = new W3Buffer_1.W3Buffer(buffer);
        const fileVersion = outBufferToJSON.readInt();
        const readModificationTable = (isOriginalTable) => {
            const numTableModifications = outBufferToJSON.readInt();
            for (let i = 0; i < numTableModifications; i++) {
                const objectDefinition = []; // object definition will store one or more modification objects
                const originalId = outBufferToJSON.readChars(4), customId = outBufferToJSON.readChars(4), modificationCount = outBufferToJSON.readInt();
                for (let j = 0; j < modificationCount; j++) {
                    const modification = {
                        id: '',
                        type: ModificationType.string,
                        level: 0,
                        column: 0,
                        value: {}
                    };
                    modification.id = outBufferToJSON.readChars(4);
                    modification.type = this.varTypes[outBufferToJSON.readInt()]; // 'int' | 'real' | 'unreal' | 'string',
                    if (type === ObjectType.Doodads || type === ObjectType.Abilities || type === ObjectType.Upgrades) {
                        modification.level = outBufferToJSON.readInt();
                        modification.column = outBufferToJSON.readInt();
                    }
                    if (modification.type === 'int') {
                        modification.value = outBufferToJSON.readInt();
                    }
                    else if (modification.type === 'real' || modification.type === 'unreal') {
                        modification.value = outBufferToJSON.readFloat();
                    }
                    else { // modification.type === 'string'
                        modification.value = outBufferToJSON.readString();
                    }
                    if (isOriginalTable) {
                        outBufferToJSON.readInt(); // should be 0 for original objects
                    }
                    else {
                        outBufferToJSON.readChars(4); // should be object ID for custom objects
                    }
                    objectDefinition.push(modification);
                }
                if (isOriginalTable) {
                    result.original[originalId] = objectDefinition;
                }
                else {
                    result.custom[customId + ':' + originalId] = objectDefinition;
                }
            }
        };
        readModificationTable(true);
        readModificationTable(false);
        return {
            errors: [],
            json: result
        };
    }
}
exports.ObjectsTranslator = ObjectsTranslator;
// Expose the ObjectType enum as part of this abstract class
// The enum could be "export"ed , but it wouldn't be accessible
// via `ObjectsTranslator.ObjectType`, which is preferable.
ObjectsTranslator.ObjectType = ObjectType;
ObjectsTranslator.varTypes = {
    int: 0,
    real: 1,
    unreal: 2,
    string: 3,
    0: 'int',
    1: 'real',
    2: 'unreal',
    3: 'string'
};
//# sourceMappingURL=ObjectsTranslator.js.map
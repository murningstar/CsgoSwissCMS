// express
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fileUpload, { UploadedFile } from "express-fileupload";
//nodejs
import fsAsync = require("fs/promises");
import path from "path";
import url from "url";
//libs
import camelCase from "camelcase";
//csgoswiss
import { Spot } from "../../CsgoSwiss/src/data/interfaces/Spot.js";
import { Lineup } from "../../CsgoSwiss/src/data/interfaces/Lineup.js";
import mapListExport from "../../CsgoSwiss/src/data/maplist.js";
//other
import { paths } from "./paths.js";

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(fileUpload());

app.get("/:mapName", async (req, res) => {
     const { mapName } = req.params;
     console.log("hello world");
     const spots = (await import(
          `./data/${mapName}/spots_${mapName}.js`
     )) as Map<string, Spot>;
     console.log(`${mapName} spots: `, spots);
     res.statusCode = 200;
     res.end();
});

function doesMapExits(mapName: string) {
     return (mapListExport.maplist as unknown as Array<string>).includes(
          mapName
     )
          ? true
          : false;
}
app.post("/spots/:mapName", async (req, res) => {
     const { mapName } = req.params;
     // Если mapList содержит адрес(дин. параметр), на который отправлен запрос
     if (!doesMapExits(mapName)) {
          return res
               .status(400)
               .json({ error: "Sent mapName doesn't exist in mapList.js" });
     }
     const spotId = req.body.spotId;
     const spotName = req.body.name;
     const coords = JSON.parse(req.body.coords);
     const toImgFile = req.files!.toImgFile as UploadedFile;
     const toImg2File = req.files!.toImg2File as UploadedFile;
     const fromImgFpFile = req.files!.fromImgFpFile as UploadedFile;
     const fromImgTpFile = req.files!.fromImgFiTple as UploadedFile;
     const priority = req.body.priority as "fp" | "tp";
     // Если не хватает полей
     if (!spotId || !spotName || !coords) {
          return res.status(400).json({ error: "Invalid spot data" });
     }
     const spotNameCamel = camelCase(spotName);
     const spotNamePascal = camelCase(spotName, { pascalCase: true });
     const spotsUrl = url
          .pathToFileURL(
               paths.contentFolderAbs + `/${mapName}/spots_${mapName}.ts`
          )
          .toString();
     const spotsExported = await import(spotsUrl);
     console.log(60, spotsExported);
     const spots = spotsExported["default"][`spots_${mapName}`];
     // Если спот id уже существует
     if (spots.has(spotId)) {
          return res
               .status(409)
               .json({ error: "Another Spot has this identifier" });
     }
     const spotObj: Spot = {
          spotId,
          name: spotName,
          coords,
     };
     const newSpotAssetFolder_abs =
          paths.assetSpotsAbs + `/${mapName}/${spotNameCamel}`;

     await fsAsync.mkdir(newSpotAssetFolder_abs, { recursive: true });
     if (fromImgFpFile || fromImgTpFile) {
          if (priority == "fp" || priority == "tp") spotObj.priority = priority;
          else
               return res
                    .status(400)
                    .json({ error: "*from* files provided without priority" });
     }
     if (toImgFile) {
          const ext = path.extname(toImgFile.name);
          const srcName = `/to${spotNamePascal}${ext}`;
          spotObj.toSrc = srcName;
          await toImgFile.mv(newSpotAssetFolder_abs + srcName);
     }
     if (toImg2File) {
          const ext = path.extname(toImg2File.name);
          const srcName = `/to2${spotNamePascal}${ext}`;
          spotObj.toSrc2 = srcName;
          await toImgFile.mv(newSpotAssetFolder_abs + srcName);
     }
     if (fromImgFpFile) {
          const ext = path.extname(fromImgFpFile.name);
          const srcName = `/from${spotNamePascal}${ext}`;
          spotObj.fromSrc_fp = srcName;
          await fromImgFpFile.mv(newSpotAssetFolder_abs + srcName);
     }
     if (fromImgTpFile) {
          const ext = path.extname(fromImgTpFile.name);
          const srcName = `/from${spotNamePascal}${ext}`;
          spotObj.fromSrc_tp = srcName;
          await fromImgTpFile.mv(newSpotAssetFolder_abs + srcName);
     }

     spots.set(spotId, spotObj);
     try {
          const mapPath =
               paths.contentFolderAbs + "/" + mapName + `/spots_${mapName}.ts`;
          console.log(103);
          await fsAsync.writeFile(
               mapPath,
               `import type { Spot } from "../../interfaces/Spot";
               \nexport const spots_${mapName} = new Map<Spot["spotId"], Spot>(${JSON.stringify(
                    [...spots]
               )})`
          );
          res.status(200).json({
               message: "created successfully",
               spotId: spotId,
          });
     } catch (err) {
          res.status(500).json({ error: err });
          console.log("error occured", err);
     }
     return res.end();
});

app.post("/lineups/:mapName", async (req, res) => {
     const { mapName } = req.params;
     if (!doesMapExits(mapName)) {
          return res
               .status(400)
               .json({ error: "Sent mapName doesn't exist in mapList.js" });
     }
     const lineupId = req.body.lineupId;
     const toId = req.body.toId;
     const fromId = req.body.fromId;
     const imgFileAim = req.files!.imgFileAim as UploadedFile;
     const imgFileOverview = req.files!.imgFileOverview as UploadedFile;
     const imgFileOverview2 = req.files!.imgFileOverview2 as UploadedFile;
     const priority = req.body.priority;
     const nadeType = req.body.nadeType;
     const side = req.body.side;
     const tickrate = JSON.parse(req.body.tickrate);
     const comboLineupIds = JSON.parse(req.body.comboLineupIds);
     const throwClick = req.body.throwClick;
     const throwMovement = req.body.throwMovement;
     const difficulty = req.body.difficulty;
     const forWhom = req.body.forWhom;

     const lineupName = req.body.name;
     const lineupFileName = req.body.lineupFileName;
     if (
          !lineupId ||
          !toId ||
          !fromId ||
          !lineupName ||
          !(imgFileAim || imgFileOverview || imgFileOverview2) ||
          !nadeType ||
          !side ||
          !tickrate ||
          !comboLineupIds ||
          !throwClick ||
          !throwMovement ||
          !difficulty
     ) {
          return res.status(400).json({ error: "Invalid lineup data" });
     }
     const lineupsUrl = url
          .pathToFileURL(
               paths.contentFolderAbs + `/${mapName}/lineups_${mapName}.ts`
          )
          .toString();
     const lineupsExported = await import(lineupsUrl);
     const lineups = lineupsExported["default"][`lineups_${mapName}`] as Map<
          Lineup["lineupId"],
          Lineup
     >;
     // Если лайнап id уже существует
     if (lineups.has(lineupId)) {
          return res
               .status(409)
               .json({ error: "Another Lineup has this identifier" });
     }

     const lineupObj: Lineup = {
          lineupId,
          toId,
          fromId,
          name: lineupFileName,
          nadeType,
          side,
          tickrate,
          throwClick,
          throwMovement,
          difficulty,
          comboLineupIds,
     };
     if (forWhom) {
          lineupObj.forWhom = forWhom;
     }

     const newLineupAssetFolder_abs =
          paths.assetLineupsAbs + `/${mapName}/${lineupFileName}`;
     await fsAsync.mkdir(newLineupAssetFolder_abs, { recursive: true });
     if (imgFileAim) {
          const ext = path.extname(imgFileAim.name);
          const srcName = `/aim${ext}`;
          lineupObj.srcAim = srcName;
          await imgFileAim.mv(newLineupAssetFolder_abs + srcName);
     }
     if (imgFileOverview) {
          const ext = path.extname(imgFileOverview.name);
          const srcName = `/overview${ext}`;
          lineupObj.srcOverview = srcName;
          await imgFileOverview.mv(newLineupAssetFolder_abs + srcName);
     }
     if (imgFileOverview2) {
          const ext = path.extname(imgFileOverview2.name);
          const srcName = `/overview2${ext}`;
          lineupObj.srcOverview2 = srcName;
          await imgFileOverview2.mv(newLineupAssetFolder_abs + srcName);
     }
     if (imgFileOverview || imgFileOverview2) {
          lineupObj.priority = priority;
     }

     lineups.set(lineupId, lineupObj);
     try {
          const mapPath = `${paths.contentFolderAbs}/${mapName}/lineups_${mapName}.ts`;
          const content = await fsAsync.readFile(mapPath, "utf-8");
          const lines = content.split("\n");
          lines.pop();
          lines.pop();
          let newLineupData =
               "    [\n" +
               `        "${lineupId}", // ${lineupName}\n` +
               `        ${JSON.stringify(lineupObj)},\n`;
          newLineupData += `    ],\n` + `]);\n`;
          const contat = lines.join("\n") + "\n" + newLineupData;
          console.log("concat: ", contat);
          await fsAsync.writeFile(mapPath, contat);
          res.status(200).json({
               message: "created successfully",
               lineupId: lineupId,
          });
     } catch (err) {
          res.status(500).json({
               error: err,
          });
          console.log("error occured", err);
     }
     return res.end();
});

const PORT = 7351;

app.listen(PORT, () => {
     console.log(`App listening at http://localhost:${PORT}`);
});

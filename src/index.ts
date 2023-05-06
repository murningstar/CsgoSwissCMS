import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fileUpload, { UploadedFile } from "express-fileupload";
import fsAsync = require("fs/promises");
import path from "path";
import url from "url";
import { Spot } from "../../CsgoSwiss/src/data/v2_spotSvyaz/Spot.js";
import { Lineup } from "../../CsgoSwiss/src/data/v2_spotSvyaz/Lineup.js";
import { CoordsObj } from "../../CsgoSwiss/src/data/types/GrenadeProperties.js";
import mapListExport from "../../CsgoSwiss/src/data/maplist.js";

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
/* app.post("/smokes", (req, res) => {
    console.log(req.body);
    res.statusCode=200
    res.end()
}); */

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
     const fromImgFile = req.files!.fromImgFile as UploadedFile;

     // Если не хватает полей
     if (!spotId || !spotName || !coords) {
          return res.status(400).json({ error: "Invalid spot data" });
     }
     const spotsUrl = url
          .pathToFileURL(
               path.resolve() +
                    `/../CsgoSwiss/src/data/v2_spotSvyaz/${mapName}/spots_${mapName}.ts`
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
          toImgSrc: null,
          fromImgSrc: null,
     };
     const imgSrcFolder = `/CsgoSwiss/src/assets/content/spots/${mapName}/${spotName}`;
     console.log(75);
     await fsAsync.mkdir(path.resolve() + "/.." + imgSrcFolder, {
          recursive: true,
     });
     console.log(77);
     if (toImgFile) {
          const ext = path.extname(toImgFile.name);
          const toImgSrc = imgSrcFolder + `/to${spotName}${ext}`;
          spotObj.toImgSrc = toImgSrc;
          console.log(82);
          await toImgFile.mv(path.resolve() + "/.." + toImgSrc);
          console.log(84);
     }
     if (fromImgFile) {
          const ext = path.extname(fromImgFile.name);
          const fromImgSrc = imgSrcFolder + `/from${spotName}${ext}`;
          spotObj.fromImgSrc = fromImgSrc;
          await fromImgFile.mv(path.resolve() + "/.." + fromImgSrc);
          console.log(91);
     }

     spots.set(spotId, spotObj);
     try {
          const mapPath =
               path.resolve() +
               "/.." +
               "/CsgoSwiss/src/data/v2_spotSvyaz/" +
               mapName +
               `/spots_${mapName}.ts`;
          console.log(103);
          await fsAsync.writeFile(
               mapPath,
               `import type { Spot } from "../Spot";
               \nexport const spots_${mapName} = new Map<Spot["spotId"], Spot>(${JSON.stringify(
                    [...spots]
               )})`
          );
          res.status(200).json({
               message: "created successfully",
               spotId: spotId,
          });
     } catch (err) {
          res.status(500).json({
               error: err,
          });
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
     const imgFileAimZoom = req.files!.imgFileAimZoom as UploadedFile;
     const imgFileOverview = req.files!.imgFileOverview as UploadedFile;
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
          !(imgFileAim || imgFileAimZoom || imgFileOverview) ||
          !nadeType ||
          !side ||
          !tickrate ||
          !comboLineupIds ||
          !throwClick ||
          !throwMovement ||
          !difficulty
     ) {
          return res.status(400).json({ error: "Invalid spot data" });
     }
     const lineupsUrl = url
          .pathToFileURL(
               path.resolve() +
                    `/../CsgoSwiss/src/data/v2_spotSvyaz/${mapName}/lineups_${mapName}.ts`
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
          imgSrcAim: null,
          imgSrcAimZoom: null,
          imgSrcOverview: null,
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
     const imgSrcFolder = `/src/assets/content/lineups/${mapName}/${lineupFileName}`;
     // console.log("lineups: ", [...lineups]);
     await fsAsync.mkdir(path.resolve() + "/../CsgoSwiss" + imgSrcFolder, {
          recursive: true,
     });
     if (imgFileAim) {
          const ext = path.extname(imgFileAim.name);
          const imgSrcAim = imgSrcFolder + `/aim${ext}`;
          lineupObj.imgSrcAim = imgSrcAim;
          await imgFileAim.mv(path.resolve() + "/../CsgoSwiss" + imgSrcAim);
     }
     if (imgFileAimZoom) {
          const ext = path.extname(imgFileAimZoom.name);
          const imgSrcAimZoom = imgSrcFolder + `/aimZoom${ext}`;
          lineupObj.imgSrcAimZoom = imgSrcAimZoom;
          await imgFileAimZoom.mv(path.resolve() + "/../CsgoSwiss" + imgSrcAimZoom);
     }
     if (imgFileOverview) {
          const ext = path.extname(imgFileOverview.name);
          const imgSrcOverview = imgSrcFolder + `/overview${ext}`;
          lineupObj.imgSrcOverview = imgSrcOverview;
          await imgFileOverview.mv(path.resolve() + "/../CsgoSwiss" + imgSrcOverview);
     }

     lineups.set(lineupId, lineupObj);
     try {
          const mapPath =
               path.resolve() +
               "/.." +
               "/CsgoSwiss/src/data/v2_spotSvyaz/" +
               mapName +
               `/lineups_${mapName}.ts`;
          const content = await fsAsync.readFile(mapPath, "utf-8");
          const lines = content.split("\n");
          lines.pop();
          lines.pop();
          let newLineupData =
               "    [\n" +
               `        "${lineupId}", // ${lineupName}\n` +
               `        ${JSON.stringify(lineupObj)},\n`
          newLineupData+= `    ],\n` + `]);\n`
          const contat = lines.join('\n') +"\n" + newLineupData;
          console.log('concat: ', contat);
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

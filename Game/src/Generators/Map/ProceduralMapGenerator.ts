import * as ENGINE from "praccen-web-engine";
import { PointLight, Scene, vec2, vec3 } from "praccen-web-engine";
import { Factories } from "../../Utils/Factories.js";
import { LabyrinthGenerator } from "../LabyrinthGenerator.js";

/**
 * "0" -> not accessible
 * "1" -> can be reached by labyrinth generation, but doesn't have to if there's another end state (all must go rooms visited for example)
 * "2" -> must go room (labyrinth generation will continue until all of these rooms are visited)
 * "3" -> no go room (will not be visited by labyrinth generation) but will be connected after generation to any surrounding rooms (connection room)
 * "4" -> must go room and connection room
 * "5" -> player start room, automatically a must go room and a conenction room
 * "a-z || A-Z" -> NPC start room, automatically a must go room. "s" specifically will create a static NPC
 */

// I want the end room for one floor to be the start room for the next. It has to be possible to reach the shaft,

const floorLayouts: string[] = [
  `
  1111111
  1111111
  1111111
  1110111
  1111111
  1111111
  1111111
  `,
];

enum BridgeType {
  NOT_A_BRIDGE,
  HORIZONTAL_BRIDGE,
  VERTICAL_BRIGE,
}

export const wallPieceModels = new Array<{
  paths: string[];
  rot: number[];
  posOffset: vec3;
}>(
  {
    paths: [
      "Assets/objs/MyDungeon/FloorNoGrate.obj",
      "Assets/objs/MyDungeon/FloorGrate.obj",
      "Assets/objs/MyDungeon/Bridge.obj",
    ],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: [
      "Assets/objs/dungeonPack/wall_gated.obj",
      "Assets/objs/dungeonPack/wall_archedwindow_gated_scaffold.obj",
      "Assets/objs/dungeonPack/wall_shelves.obj",
    ],
    rot: [0, 180],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: [
      "Assets/objs/dungeonPack/wall_gated.obj",
      "Assets/objs/dungeonPack/wall_archedwindow_gated_scaffold.obj",
      "Assets/objs/dungeonPack/wall_shelves.obj",
    ],
    rot: [90, 270],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_corner_gated.obj"],
    rot: [90],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_corner_gated.obj"],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_corner_gated.obj"],
    rot: [270],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_corner_gated.obj"],
    rot: [180],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_Tsplit.obj"],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_Tsplit.obj"],
    rot: [270],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_Tsplit.obj"],
    rot: [180],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_Tsplit.obj"],
    rot: [90],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_crossing.obj"],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_endcap.obj"],
    rot: [0],
    posOffset: vec3.fromValues(-2.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_endcap.obj"],
    rot: [180],
    posOffset: vec3.fromValues(2.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_endcap.obj"],
    rot: [270],
    posOffset: vec3.fromValues(0.0, 0.0, -2.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_endcap.obj"],
    rot: [90],
    posOffset: vec3.fromValues(0.0, 0.0, 2.0),
  },
  {
    paths: [
      "Assets/objs/dungeonPack/pillar.obj",
      "Assets/objs/dungeonPack/pillar_decorated.obj",
      "Assets/objs/dungeonPack/crates_stacked.obj",
    ],
    rot: [0, 45, 90, 135, 180, 225, 270, 315],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: [
      "Assets/objs/dungeonPack/wall.obj",
      "Assets/objs/dungeonPack/wall_cracked.obj",
    ],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: [
      "Assets/objs/dungeonPack/wall.obj",
      "Assets/objs/dungeonPack/wall_cracked.obj",
    ],
    rot: [90],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_corner.obj"],
    rot: [90],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_corner.obj"],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_corner.obj"],
    rot: [270],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_corner.obj"],
    rot: [180],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_Tsplit.obj"],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_Tsplit.obj"],
    rot: [270],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_Tsplit.obj"],
    rot: [180],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_Tsplit.obj"],
    rot: [90],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_crossing.obj"],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_endcap.obj"],
    rot: [0],
    posOffset: vec3.fromValues(-2.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_endcap.obj"],
    rot: [180],
    posOffset: vec3.fromValues(2.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_endcap.obj"],
    rot: [270],
    posOffset: vec3.fromValues(0.0, 0.0, -2.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/wall_endcap.obj"],
    rot: [90],
    posOffset: vec3.fromValues(0.0, 0.0, 2.0),
  },
  {
    paths: ["Assets/objs/dungeonPack/pillar.obj"],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  }
);

const physicsObjectScales = [
  vec3.fromValues(2.0, 5.0, 2.0), // Pillar / top left
  vec3.fromValues(9.0, 5.0, 2.0), // Top wall
  vec3.fromValues(2.0, 5.0, 9.0), // Left wall
];

export const roomSize = 10.0;

export default class ProceduralMap {
  private scene: ENGINE.Scene;
  private instancedMeshes: Map<string, ENGINE.GraphicsBundle>;
  private physicsScene: ENGINE.PhysicsScene;
  private map: Array<Array<number>>;
  private exploredAsciiMap: string;
  private visitedRooms: Set<string>;
  private playerSpawnRoom: vec2;
  private exitRoom: vec2;
  private currentFloor: number = 1;
  private pointLight: PointLight | null = null;
  focusRoom: vec2;

  private columns: number;
  private rows: number;

  constructor(
    scene: ENGINE.Scene,
    physicsScene: ENGINE.PhysicsScene,
    floorNumber: number
  ) {
    this.scene = scene;
    this.physicsScene = physicsScene;
    this.instancedMeshes = new Map<string, ENGINE.GraphicsBundle>();

    this.playerSpawnRoom = vec2.fromValues(0, 0);

    this.currentFloor = floorNumber;
    this.generateFloor(this.currentFloor);
  }

  private generateFloor(floorNumber: number) {
    // Clear existing map state
    this.visitedRooms = new Set<string>();
    this.exploredAsciiMap = "";
    this.focusRoom = vec2.fromValues(-1.0, -1.0);

    // Generate different layouts based on floor number
    const mapLayout = this.getMapLayoutForFloor(floorNumber);

    let mustGoRooms = [];
    let noGoRooms = [];
    let connectionRooms = [];

    this.columns = 0;
    let rowNr = 0;
    for (let row of mapLayout.split("\n")) {
      row = row.trim();
      if (row.length == 0) {
        continue;
      }

      this.columns = Math.max(this.columns, row.length);

      for (let columnNr = 0; columnNr < row.length; columnNr++) {
        if (row[columnNr] == "0") {
          noGoRooms.push([columnNr, rowNr]);
        }
        if (row[columnNr] == "2") {
          mustGoRooms.push([columnNr, rowNr]);
        }
        if (row[columnNr] == "3") {
          noGoRooms.push([columnNr, rowNr]);
          connectionRooms.push([columnNr, rowNr]);
        }
        if (row[columnNr] == "4") {
          mustGoRooms.push([columnNr, rowNr]);
          connectionRooms.push([columnNr, rowNr]);
        }
        if (row[columnNr] == "5") {
          mustGoRooms.push([columnNr, rowNr]);
          connectionRooms.push([columnNr, rowNr]);
          vec2.set(this.playerSpawnRoom, columnNr, rowNr);
        }
        if (
          (row[columnNr] >= "a" && row[columnNr] <= "z") ||
          (row[columnNr] >= "A" && row[columnNr] <= "Z")
        ) {
          mustGoRooms.push([columnNr, rowNr]);
        }
      }
      rowNr++;
    }
    this.rows = rowNr;

    this.map = LabyrinthGenerator.getLabyrinth(
      this.columns,
      this.rows,
      mustGoRooms,
      noGoRooms,
      connectionRooms,
      0.85
    );

    this.exitRoom = this.findExitRoom(this.playerSpawnRoom);
    this.createMeshes(this.scene);
    this.createExitLight(this.scene);
  }

  private getMapLayoutForFloor(floorNumber: number): string {
    floorNumber -= 1; // Floor 1 is the first floor
    if (floorNumber < floorLayouts.length) {
      return floorLayouts[floorNumber];
    }

    return floorLayouts[floorLayouts.length - 1]; // Return last floor layout
  }

  private identifyBridge(mapColumn: number, mapRow: number): BridgeType {
    if (
      mapColumn <= 1 ||
      mapColumn >= this.columns - 1 ||
      mapRow <= 1 ||
      mapRow >= this.rows - 1
    ) {
      return BridgeType.NOT_A_BRIDGE;
    }

    if (
      this.map[(mapColumn - 1) * 2 + 1][mapRow * 2 + 1] == 0 &&
      this.map[(mapColumn + 1) * 2 + 1][mapRow * 2 + 1] == 0 &&
      this.map[mapColumn * 2 + 1][(mapRow - 1) * 2 + 1] == -1 &&
      this.map[mapColumn * 2 + 1][(mapRow + 1) * 2 + 1] == -1
    ) {
      return BridgeType.HORIZONTAL_BRIDGE;
    }

    if (
      this.map[(mapColumn - 1) * 2 + 1][mapRow * 2 + 1] == -1 &&
      this.map[(mapColumn + 1) * 2 + 1][mapRow * 2 + 1] == -1 &&
      this.map[mapColumn * 2 + 1][(mapRow - 1) * 2 + 1] == 0 &&
      this.map[mapColumn * 2 + 1][(mapRow + 1) * 2 + 1] == 0
    ) {
      return BridgeType.VERTICAL_BRIGE;
    }

    return BridgeType.NOT_A_BRIDGE;
  }

  // Only put tiles with grates if no more than one wall is adjacent
  private identifyGrates(mapColumn: number, mapRow: number): boolean {
    return (
      Number(this.map[mapColumn * 2 + 1 - 1][mapRow * 2 + 1] == 0) +
        Number(this.map[mapColumn * 2 + 1 + 1][mapRow * 2 + 1] == 0) +
        Number(this.map[mapColumn * 2 + 1][mapRow * 2 + 1 - 1] == 0) +
        Number(this.map[mapColumn * 2 + 1][mapRow * 2 + 1 + 1] == 0) >=
      3
    );
  }

  async createMeshes(scene: ENGINE.Scene) {
    let meshesToLoad = new Set<string>();
    for (let piece of wallPieceModels) {
      for (let path of piece.paths) {
        meshesToLoad.add(path);
      }
    }

    meshesToLoad.add("Assets/objs/dungeonPack/floor_tile_big_grate_open.obj");
    meshesToLoad.add("Assets/objs/dungeonPack/wall_half.obj");

    // Load meshes before creating
    this.scene.renderer.meshStore
      .loadMeshes(Array.from(meshesToLoad), { loaded: 0 })
      .then(async () => {
        for (let piece of wallPieceModels) {
          for (let path of piece.paths)
            if (path != "") {
              if (!this.instancedMeshes.has(path)) {
                this.instancedMeshes.set(
                  path,
                  await Factories.createInstancedMesh(
                    scene,
                    path,
                    "Assets/Textures/dungeon_texture.png",
                    "CSS:rgb(0, 0, 0)"
                  )
                );
              }
            }
        }

        this.instancedMeshes.set(
          "Assets/objs/dungeonPack/floor_tile_big_grate_open.obj",
          await Factories.createInstancedMesh(
            scene,
            "Assets/objs/dungeonPack/floor_tile_big_grate_open.obj",
            "CSS:rgb(40, 40, 40)",
            "CSS:rgb(0, 0, 0)"
          )
        );

        this.instancedMeshes.set(
          "Assets/objs/dungeonPack/wall_half.obj",
          await Factories.createInstancedMesh(
            scene,
            "Assets/objs/dungeonPack/wall_half.obj",
            "Assets/Textures/dungeon_texture.png",
            "CSS:rgb(0, 0, 0)"
          )
        );

        for (let column = 0; column < this.columns + 1; column++) {
          for (let row = 0; row < this.rows + 1; row++) {
            // Tile filling (floor or blocked)
            if (column < this.columns && row < this.rows) {
              if (
                this.map[column * 2 + 1][row * 2 + 1] == 0 &&
                !(
                  column * 2 + 1 == this.getExitRoom()[0] &&
                  row * 2 + 1 == this.getExitRoom()[1]
                )
              ) {
                const paths = wallPieceModels[0].paths;
                let isBridge = false;
                let transform = null;

                // Make the tile a bridge if it has inaccessible spaces oposite of each other but accessible spaces in the other direction.
                const bridgeType = this.identifyBridge(column, row);
                if (bridgeType != BridgeType.NOT_A_BRIDGE) {
                  let mesh = this.instancedMeshes.get(paths[2]);
                  transform = this.scene.addNewInstanceOfInstancedMesh(mesh);
                  vec3.set(transform.scale, 0.83, 0.83, 0.83);

                  if (bridgeType == BridgeType.VERTICAL_BRIGE) {
                    ENGINE.quat.fromEuler(
                      transform.rotation,
                      0.0,
                      column * 90 + row * 90,
                      0.0
                    );
                  }
                  isBridge = true;
                } else if (this.identifyGrates(column, row)) {
                  let mesh = this.instancedMeshes.get(paths[1]);
                  transform = this.scene.addNewInstanceOfInstancedMesh(mesh);
                  vec3.set(transform.scale, 0.9, 0.9, 0.9);
                } else {
                  let mesh = this.instancedMeshes.get(paths[0]);
                  transform = this.scene.addNewInstanceOfInstancedMesh(mesh);
                  vec3.set(transform.scale, 0.9, 0.9, 0.9);
                }

                vec3.set(
                  transform.position,
                  5.0 + 10 * column,
                  0.0,
                  5.0 + 10 * row
                );

                if (!isBridge) {
                  ENGINE.quat.fromEuler(
                    transform.rotation,
                    0.0,
                    column * 90 + row * 90,
                    0.0
                  );
                }

                transform.calculateMatrices();

                let phyTrans = new ENGINE.Transform();
                vec3.set(
                  phyTrans.position,
                  roomSize * 0.5 + column * roomSize,
                  -0.5,
                  roomSize * 0.5 + row * roomSize
                );
                phyTrans.scale = vec3.fromValues(roomSize, 1.0, roomSize);
                let physObj = this.physicsScene.addNewPhysicsObject(phyTrans);
                physObj.isStatic = true;
                physObj.frictionCoefficient = 0.0;
              } else if (this.map[column * 2 + 1][row * 2 + 1] == -1) {
                // If there should be something in the voids, create it here
                // let mesh = this.instancedMeshes.get(
                //   "Assets/objs/dungeonPack/floor_tile_big_grate_open.obj"
                // );
                // let transform = this.scene.addNewInstanceOfInstancedMesh(mesh);
                // vec3.set(
                //   transform.position,
                //   5.0 + 10 * column,
                //   -10.0,
                //   5.0 + 10 * row
                // );
                // ENGINE.quat.fromEuler(
                //   transform.rotation,
                //   0.0,
                //   column * 90 + row * 90,
                //   0.0
                // );
                // vec3.set(transform.scale, 2.5, 2.5, 2.5);
                // transform.calculateMatrices();
              }
            }

            // Top of tile wall
            if (
              column < this.columns &&
              this.map[column * 2 + 1][row * 2] > 0 &&
              this.map[column * 2 + 1][row * 2] < wallPieceModels.length
            ) {
              let isBridge = false;

              const paths =
                wallPieceModels[this.map[column * 2 + 1][row * 2]].paths;
              const rots =
                wallPieceModels[this.map[column * 2 + 1][row * 2]].rot;
              let mesh = this.instancedMeshes.get(
                paths[Math.floor(Math.random() * paths.length)]
              );
              let transform = this.scene.addNewInstanceOfInstancedMesh(mesh);
              vec3.set(
                transform.position,
                5.0 + 10 * column - 1.0,
                0.0,
                5.0 + 10 * row - 5.0
              );

              if (
                this.identifyBridge(column, row - 1) !=
                  BridgeType.NOT_A_BRIDGE ||
                this.identifyBridge(column, row) != BridgeType.NOT_A_BRIDGE
              ) {
                isBridge = true;
                vec3.set(transform.scale, 1.0, 0.3, 1.0);
              } else {
                vec3.set(transform.scale, 1.0, 1.0, 1.0);
              }

              ENGINE.quat.fromEuler(
                transform.rotation,
                0.0,
                rots[Math.floor(Math.random() * rots.length)],
                0.0
              );
              transform.calculateMatrices();

              mesh = this.instancedMeshes.get(
                "Assets/objs/dungeonPack/wall_half.obj"
              );
              transform = this.scene.addNewInstanceOfInstancedMesh(mesh);
              vec3.set(
                transform.position,
                5.0 + 10 * column + 1.0,
                0.0,
                5.0 + 10 * row - 5.0
              );
              if (isBridge) {
                vec3.set(transform.scale, 1.0, 0.3, 1.0);
              } else {
                vec3.set(transform.scale, 1.0, 1.0, 1.0);
              }
              ENGINE.quat.fromEuler(transform.rotation, 0.0, rots[0], 0.0);
              transform.calculateMatrices();

              let phyTrans = new ENGINE.Transform();
              vec3.set(
                phyTrans.position,
                5.0 + column * roomSize,
                0.0,
                5.0 + row * roomSize - 5.0
              );
              phyTrans.scale = vec3.clone(physicsObjectScales[1]);
              if (isBridge) {
                phyTrans.scale[1] *= 0.3;
              }

              let physObj = this.physicsScene.addNewPhysicsObject(phyTrans);
              physObj.isStatic = true;
              physObj.frictionCoefficient = 0.0;
            }

            // Left of tile wall
            if (
              row < this.rows &&
              this.map[column * 2][row * 2 + 1] > 0 &&
              this.map[column * 2][row * 2 + 1] < wallPieceModels.length
            ) {
              let isBridge = false;
              const paths =
                wallPieceModels[this.map[column * 2][row * 2 + 1]].paths;
              const rots =
                wallPieceModels[this.map[column * 2][row * 2 + 1]].rot;
              let mesh = this.instancedMeshes.get(
                paths[Math.floor(Math.random() * paths.length)]
              );
              let transform = this.scene.addNewInstanceOfInstancedMesh(mesh);
              vec3.set(
                transform.position,
                5.0 + 10 * column - 5.0,
                0.0,
                5.0 + 10 * row + 1.0
              );

              if (
                this.identifyBridge(column - 1, row) !=
                  BridgeType.NOT_A_BRIDGE ||
                this.identifyBridge(column, row) != BridgeType.NOT_A_BRIDGE
              ) {
                vec3.set(transform.scale, 1.0, 0.3, 1.0);
                isBridge = true;
              } else {
                vec3.set(transform.scale, 1.0, 1.0, 1.0);
              }

              ENGINE.quat.fromEuler(
                transform.rotation,
                0.0,
                rots[Math.floor(Math.random() * rots.length)],
                0.0
              );
              transform.calculateMatrices();

              mesh = this.instancedMeshes.get(
                "Assets/objs/dungeonPack/wall_half.obj"
              );
              transform = this.scene.addNewInstanceOfInstancedMesh(mesh);
              vec3.set(
                transform.position,
                5.0 + 10 * column - 5.0,
                0.0,
                5.0 + 10 * row - 1.0
              );
              if (isBridge) {
                vec3.set(transform.scale, 1.0, 0.3, 1.0);
              } else {
                vec3.set(transform.scale, 1.0, 1.0, 1.0);
              }
              ENGINE.quat.fromEuler(transform.rotation, 0.0, rots[0], 0.0);
              transform.calculateMatrices();

              let phyTrans = new ENGINE.Transform();
              vec3.set(
                phyTrans.position,
                5.0 + column * roomSize - 5.0,
                0.0,
                5.0 + row * roomSize
              );
              phyTrans.scale = vec3.clone(physicsObjectScales[2]);

              if (isBridge) {
                phyTrans.scale[1] *= 0.3;
              }

              let physObj = this.physicsScene.addNewPhysicsObject(phyTrans);
              physObj.isStatic = true;
              physObj.frictionCoefficient = 0.0;
            }

            // Top left of tile corner
            if (
              this.map[column * 2][row * 2] > 0 &&
              this.map[column * 2][row * 2] < wallPieceModels.length
            ) {
              const paths =
                wallPieceModels[this.map[column * 2][row * 2]].paths;
              const rots = wallPieceModels[this.map[column * 2][row * 2]].rot;
              let path = paths[Math.floor(Math.random() * paths.length)];

              // if (
              //   identifyBridge(column, row) != BridgeType.NOT_A_BRIDGE ||
              //   identifyBridge(column - 1, row) != BridgeType.NOT_A_BRIDGE ||
              //   identifyBridge(column, row - 1) != BridgeType.NOT_A_BRIDGE
              // ) {
              //   path = "Assets/objs/dungeonPack/pillar.obj";
              // }

              let mesh = this.instancedMeshes.get(path);
              let transform = this.scene.addNewInstanceOfInstancedMesh(mesh);
              vec3.set(
                transform.position,
                5.0 + 10 * column + -5.0,
                0.0,
                5.0 + 10 * row - 5.0
              );
              vec3.set(transform.scale, 1.0, 1.0, 1.0);
              ENGINE.quat.fromEuler(
                transform.rotation,
                0.0,
                rots[Math.floor(Math.random() * rots.length)],
                0.0
              );
              vec3.add(
                transform.position,
                transform.position,
                wallPieceModels[this.map[column * 2][row * 2]].posOffset
              );
              transform.calculateMatrices();

              // Only add a physics object for crossings if it's not a end piece
              if (
                this.map[column * 2][row * 2] % 16 < 12 ||
                this.map[column * 2][row * 2] % 16 > 15
              ) {
                let physObj = this.physicsScene.addNewPhysicsObject(transform);
                mesh.updateMinAndMaxPositions();
                physObj.boundingBox.setMinAndMaxVectors(
                  mesh.getMinAndMaxPositions().min,
                  mesh.getMinAndMaxPositions().max
                );
                physObj.setupInternalTreeFromGraphicsObject(
                  mesh.graphicsObject,
                  path
                );
                physObj.isStatic = true;
                physObj.frictionCoefficient = 0.0;
              }
            }
          }
        }
        this.physicsScene.update(0.0, true, false); // Update static objects (all walls) so octree is updated
      });
  }

  checkIfVoid(position: vec3): boolean {
    // Calculate room from position
    let room = vec2.floor(
      vec2.create(),
      vec2.scale(
        vec2.create(),
        vec2.fromValues(position[0], position[2]),
        1.0 / roomSize
      )
    );

    if (
      room[0] < 0 ||
      room[0] >= this.columns ||
      room[1] < 0 ||
      room[1] >= this.rows
    ) {
      return true;
    }

    if (this.map[room[0] * 2 + 1][room[1] * 2 + 1] == -1) {
      return true;
    }

    return false;
  }

  checkIfOutsideOfMap(position: vec3): boolean {
    // Calculate room from position
    let room = vec2.floor(
      vec2.create(),
      vec2.scale(
        vec2.create(),
        vec2.fromValues(position[0], position[2]),
        1.0 / roomSize
      )
    );

    if (
      room[0] < 0 ||
      room[0] >= this.columns ||
      room[1] < 0 ||
      room[1] >= this.rows
    ) {
      return true;
    }
    return false;
  }

  updateFocusRoom(characterPosition: vec2) {
    // Calculate room from characterPosition
    let room = vec2.floor(
      vec2.create(),
      vec2.scale(vec2.create(), characterPosition, 1.0 / roomSize)
    );
    if (
      room[0] < 0 ||
      room[0] >= this.columns ||
      room[1] < 0 ||
      room[1] >= this.rows
    ) {
      return;
    }

    // If it's not the same as the current focus room, add the new room to visited and update the focus room
    if (!vec2.equals(room, this.focusRoom)) {
      this.focusRoom = room;
      this.visitedRooms.add(room[0] + ";" + room[1]);
      this.exploredAsciiMap = LabyrinthGenerator.getAsciiMap(
        this.map,
        this.visitedRooms
      );
    }
  }

  reconstructPath(previous: (vec2 | null)[][], target: vec2): vec2[] {
    const path: vec2[] = [];
    let current: vec2 | null = target;

    while (current !== null) {
      path.push(vec2.clone(current));
      current = previous[current[0]][current[1]];
    }

    return path.reverse();
  }

  findPath(start: vec2, target: vec2): vec2[] {
    const rows = this.map.length;
    const cols = this.map[0].length;
    const directions: vec2[] = [
      vec2.fromValues(0, 1), // Right
      vec2.fromValues(1, 0), // Down
      vec2.fromValues(0, -1), // Left
      vec2.fromValues(-1, 0), // Up
    ];

    const distance: number[][] = Array.from({ length: rows }, () =>
      Array(cols).fill(Infinity)
    );
    const previous: (vec2 | null)[][] = Array.from({ length: rows }, () =>
      Array(cols).fill(null)
    );
    class PriorityQueue<T> {
      private elements: { item: T; priority: number }[] = [];

      enqueue(item: T, priority: number) {
        this.elements.push({ item, priority });
        this.elements.sort((a, b) => a.priority - b.priority);
      }

      dequeue(): T | undefined {
        return this.elements.shift()?.item;
      }

      isEmpty(): boolean {
        return this.elements.length === 0;
      }
    }
    const queue = new PriorityQueue<vec2>();

    distance[start[0]][start[1]] = 0;
    queue.enqueue(start, 0);

    while (!queue.isEmpty()) {
      const current = queue.dequeue()!;
      const [x, y] = current;

      if (vec2.equals(current, target)) {
        return this.reconstructPath(previous, target);
      }

      for (const dir of directions) {
        const neighbor = vec2.add(vec2.create(), current, dir);
        const nx = neighbor[0];
        const ny = neighbor[1];

        if (
          nx >= 0 &&
          nx < rows &&
          ny >= 0 &&
          ny < cols &&
          this.map[nx][ny] == 0
        ) {
          const newDist = distance[x][y] + 1;

          if (newDist < distance[nx][ny]) {
            distance[nx][ny] = newDist;
            previous[nx][ny] = vec2.clone(current);
            queue.enqueue(neighbor, newDist);
          }
        }
      }
    }

    return null; // No path found
  }

  getRandomAccessibleRoomCoords(): vec2 {
    let coordsSet = new Array<vec2>();
    for (let x = 0; x < this.map.length; x++) {
      for (let y = 0; y < this.map[x].length; y++) {
        if (this.map[x][y] == 0) {
          coordsSet.push(vec2.fromValues(x, y));
        }
      }
    }
    return coordsSet[Math.floor(Math.random() * coordsSet.length)];
  }

  getRoomCenterWorldPos(room: vec2): vec3 {
    let x = ((room[0] - 1) / 2) * roomSize + roomSize / 2;
    let y = ((room[1] - 1) / 2) * roomSize + roomSize / 2;
    return vec3.fromValues(x, 1, y);
  }

  getAsciiMapOfVisitedRooms(): string {
    return this.exploredAsciiMap;
  }

  getMapSize(): vec2 {
    return vec2.fromValues(
      ((this.map.length - 1) / 2.0) * roomSize,
      ((this.map[0].length - 1) / 2.0) * roomSize
    );
  }

  // Find avalible spawn as far away from player as possible
  // TODO Right now it will always be the same position (bottom right corner)
  // figure out a more fun exit finder that is also not too close to spawn
  private findExitRoom(playerSpawnRoom: vec2): vec2 {
    const accessibleRooms: vec2[] = [];

    for (let x = 1; x < this.map.length; x += 2) {
      for (let y = 1; y < this.map[0].length; y += 2) {
        if (this.map[x][y] === 0) {
          accessibleRooms.push(vec2.fromValues(x, y));
        }
      }
    }

    // Find the room farthest from player spawn
    let maxDistance = 0;
    let exitRoom = playerSpawnRoom;
    const startRoom = vec2.fromValues(
      playerSpawnRoom[0] * 2 + 1,
      playerSpawnRoom[1] * 2 + 1
    );

    for (const room of accessibleRooms) {
      const path = this.findPath(room, startRoom);
      if (path == undefined) {
        continue;
      }
      const distance = path.length;
      if (distance > maxDistance) {
        maxDistance = distance;
        exitRoom = room;
      }
    }
    return exitRoom;
  }

  getCurrentFloor(): number {
    return this.currentFloor;
  }

  getPlayerSpawnRoom(): vec2 {
    return this.playerSpawnRoom;
  }

  getExitRoom(): vec2 {
    return this.exitRoom;
  }

  getExitRoomPos(): vec3 {
    return this.getRoomCenterWorldPos(this.exitRoom);
  }

  private createExitLight(scene: Scene) {
    this.pointLight = scene.addNewPointLight();
    if (this.pointLight) {
      vec3.copy(this.pointLight.position, this.getExitRoomPos());
      this.pointLight.position[1] = 2.0;

      vec3.set(this.pointLight.colour, 0.0, 1.5, 0.0);

      this.pointLight.linear = 0.09;
      this.pointLight.quadratic = 0.032;
      this.pointLight.constant = 1.0;

      this.pointLight.castShadow = false;
    }
  }
}

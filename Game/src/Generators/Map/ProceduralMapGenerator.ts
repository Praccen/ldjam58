import {
  GraphicsBundle,
  PhysicsScene,
  PointLight,
  quat,
  Scene,
  Shape,
  Transform,
  vec2,
  vec3,
} from "praccen-web-engine";
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
  // `
  // 511
  // 202
  // 121
  // `,
  `
  5111111
  1111111
  1112111
  112X211
  1112111
  1111111
  1111111
  `,
  `
  1111111
  1111111
  1112111
  112X211
  1112111
  1111111
  1111111
  `,
];

enum BridgeType {
  NOT_A_BRIDGE,
  HORIZONTAL_BRIDGE,
  VERTICAL_BRIGE,
}

export function convertCoordIncludingWallsToRoomIndex(coordWithWalls: number) {
  return Math.round((coordWithWalls - 1) / 2);
}
export function convertRoomIndexToCoordIncludingWalls(roomIndex: number) {
  return roomIndex * 2 + 1;
}

export const wallPieceModels = new Array<{
  paths: string[];
  rot: number[];
  posOffset: vec3;
}>(
  {
    paths: ["Assets/objs/MyDungeon/Floor.obj", "Assets/objs/MyDungeon/Ceiling.obj"],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall.obj", "Assets/objs/MyDungeon/Wall_hole.obj"],
    rot: [0, 180],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall.obj", "Assets/objs/MyDungeon/Wall_hole.obj"],
    rot: [90, 270],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_corner.obj"],
    rot: [90],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_corner.obj"],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_corner.obj"],
    rot: [270],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_corner.obj"],
    rot: [180],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_Tsplit.obj"],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_Tsplit.obj"],
    rot: [270],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_Tsplit.obj"],
    rot: [180],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_Tsplit.obj"],
    rot: [90],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_crossing.obj"],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_endcap.obj"],
    rot: [0],
    posOffset: vec3.fromValues(-2.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_endcap.obj"],
    rot: [180],
    posOffset: vec3.fromValues(2.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_endcap.obj"],
    rot: [270],
    posOffset: vec3.fromValues(0.0, 0.0, -2.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_endcap.obj"],
    rot: [90],
    posOffset: vec3.fromValues(0.0, 0.0, 2.0),
  },
  {
    paths: [
      "Assets/objs/dungeonPack/pillar.obj",
      "Assets/objs/dungeonPack/pillar_decorated.obj",
      "Assets/objs/dungeonPack/crates_stacked.obj",
      "Assets/objs/dungeonPack/column.obj",
      "Assets/objs/dungeonPack/chest.obj",
      "Assets/objs/dungeonPack/chair.obj",
    ],
    rot: [0, 45, 90, 135, 180, 225, 270, 315],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
    
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall.obj"],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall.obj"],
    rot: [90],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_corner.obj"],
    rot: [90],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_corner.obj"],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_corner.obj"],
    rot: [270],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_corner.obj"],
    rot: [180],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_Tsplit.obj"],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_Tsplit.obj"],
    rot: [270],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_Tsplit.obj"],
    rot: [180],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_Tsplit.obj"],
    rot: [90],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_crossing.obj"],
    rot: [0],
    posOffset: vec3.fromValues(0.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_endcap.obj"],
    rot: [0],
    posOffset: vec3.fromValues(-2.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_endcap.obj"],
    rot: [180],
    posOffset: vec3.fromValues(2.0, 0.0, 0.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_endcap.obj"],
    rot: [270],
    posOffset: vec3.fromValues(0.0, 0.0, -2.0),
  },
  {
    paths: ["Assets/objs/MyDungeon/Wall_endcap.obj"],
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
export const roomHeight = 4.1;

export default class ProceduralMap {
  private scene: Scene;
  private instancedMeshes: Map<string, GraphicsBundle>;
  private map: Map<number, Array<Array<number>>> = new Map<
    number,
    Array<Array<number>>
  >();
  private playerSpawnRoom: vec2;
  private floorExitRoom: Map<number, vec2> = new Map<number, vec2>();
  private floorShaftRoom: Map<number, vec2> = new Map<number, vec2>();
  private currentFloor: number = 0;
  private pointLight: PointLight | null = null;
  focusRoom: vec2;

  private columns: Map<number, number> = new Map<number, number>();
  private rows: Map<number, number> = new Map<number, number>();

  private graphicsContent = new Map<number, { enabled: boolean }[][][]>();
  floorPhysicsScenes = new Map<number, PhysicsScene>();

  private accessibleRooms: Map<number, vec2[]> = new Map<number, vec2[]>();

  constructor(scene: Scene, floorNumbers: number[]) {
    this.scene = scene;
    this.instancedMeshes = new Map<string, GraphicsBundle>();

    this.playerSpawnRoom = vec2.fromValues(0, 0);

    this.currentFloor = floorNumbers[0];
    for (const floorNumber of floorNumbers) {
      this.generateFloor(floorNumber);
    }
  }

  private generateFloor(floorNumber: number) {
    // Clear existing map state
    this.focusRoom = vec2.fromValues(-1.0, -1.0);

    // Generate different layouts based on floor number
    const mapLayout = this.getMapLayoutForFloor(floorNumber);

    let mustGoRooms = [];
    let noGoRooms = [];
    let connectionRooms = [];

    let startRoom = vec2.create();

    this.columns.set(floorNumber, 0);
    let rowNr = 0;
    for (let row of mapLayout.split("\n")) {
      row = row.trim();
      if (row.length == 0) {
        continue;
      }

      this.columns.set(
        floorNumber,
        Math.max(this.columns.get(floorNumber), row.length)
      );

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
          vec2.set(startRoom, columnNr, rowNr);
          if (floorNumber == 0) {
            vec2.set(this.playerSpawnRoom, columnNr, rowNr);
          }
        }
        if (row[columnNr] == "X") {
          noGoRooms.push([columnNr, rowNr]);
          this.floorShaftRoom.set(
            floorNumber,
            vec2.fromValues(columnNr, rowNr)
          );
        }
      }
      rowNr++;
    }
    this.rows.set(floorNumber, rowNr);

    this.graphicsContent.set(floorNumber, []);
    for (let col = 0; col < this.columns.get(floorNumber); col++) {
      this.graphicsContent.get(floorNumber).push([]);
      for (let row = 0; row < this.rows.get(floorNumber); row++) {
        this.graphicsContent.get(floorNumber)[col].push([]);
      }
    }

    this.floorPhysicsScenes.set(floorNumber, new PhysicsScene());
    vec3.zero(this.floorPhysicsScenes.get(floorNumber).gravity);

    let aboveFloor = this.getAboveFloorNumber(floorNumber);
    if (aboveFloor != -1) {
      let aboveFloorExitRoom = [
        convertCoordIncludingWallsToRoomIndex(
          this.floorExitRoom.get(aboveFloor)[0]
        ),
        convertCoordIncludingWallsToRoomIndex(
          this.floorExitRoom.get(aboveFloor)[1]
        ),
      ];

      vec2.set(startRoom, aboveFloorExitRoom[0], aboveFloorExitRoom[1]);
      mustGoRooms.push(aboveFloorExitRoom);
    }

    this.map.set(
      floorNumber,
      LabyrinthGenerator.getLabyrinth(
        this.columns.get(floorNumber),
        this.rows.get(floorNumber),
        mustGoRooms,
        noGoRooms,
        connectionRooms,
        0.85
      )
    );

    this.floorExitRoom.set(
      floorNumber,
      this.findExitRoom(floorNumber, startRoom)
    );
    this.createMeshes(floorNumber, this.scene);
    // this.createExitLight(this.scene);

    this.storeAccessibleRooms(floorNumber);

    // console.log(LabyrinthGenerator.getAsciiMap(this.map.get(floorNumber)));
  }

  private storeAccessibleRooms(floorNumber: number) {
    const rooms: vec2[] = [];
    const mapFloor = this.map.get(floorNumber);

    for (let col = 0; col < this.columns.get(floorNumber); col++) {
      for (let row = 0; row < this.rows.get(floorNumber); row++) {
        const coordCol = convertRoomIndexToCoordIncludingWalls(col);
        const coordRow = convertRoomIndexToCoordIncludingWalls(row);

        // Check if this is an accessible room (value = 0 in the map)
        if (mapFloor[coordCol] && mapFloor[coordCol][coordRow] === 0) {
          rooms.push(vec2.fromValues(col, row));
        }
      }
    }

    this.accessibleRooms.set(floorNumber, rooms);
  }

  private getMapLayoutForFloor(floorNumber: number): string {
    if (floorNumber < floorLayouts.length) {
      return floorLayouts[floorNumber];
    }

    return floorLayouts[floorLayouts.length - 1]; // Return last floor layout
  }

  private getAboveFloorNumber(floorNumber: number): number {
    let aboveFloor = floorNumber;
    for (let searchFloor = aboveFloor - 1; searchFloor >= 0; searchFloor--) {
      if (this.map.has(searchFloor)) {
        aboveFloor = searchFloor;
        break;
      }
    }

    if (aboveFloor == floorNumber) {
      return -1;
    }
    return aboveFloor;
  }

  private identifyBridge(
    floorNumber: number,
    mapColumn: number,
    mapRow: number
  ): BridgeType {
    const mapFloor = this.map.get(floorNumber);

    if (
      mapColumn <= 1 ||
      mapColumn >= this.columns.get(floorNumber) - 1 ||
      mapRow <= 1 ||
      mapRow >= this.rows.get(floorNumber) - 1
    ) {
      return BridgeType.NOT_A_BRIDGE;
    }

    if (
      mapFloor[convertRoomIndexToCoordIncludingWalls(mapColumn - 1)][
        convertRoomIndexToCoordIncludingWalls(mapRow)
      ] == 0 &&
      mapFloor[convertRoomIndexToCoordIncludingWalls(mapColumn + 1)][
        convertRoomIndexToCoordIncludingWalls(mapRow)
      ] == 0 &&
      mapFloor[convertRoomIndexToCoordIncludingWalls(mapColumn)][
        convertRoomIndexToCoordIncludingWalls(mapRow - 1)
      ] == -1 &&
      mapFloor[convertRoomIndexToCoordIncludingWalls(mapColumn)][
        convertRoomIndexToCoordIncludingWalls(mapRow + 1)
      ] == -1
    ) {
      return BridgeType.HORIZONTAL_BRIDGE;
    }

    if (
      mapFloor[convertRoomIndexToCoordIncludingWalls(mapColumn - 1)][
        convertRoomIndexToCoordIncludingWalls(mapRow)
      ] == -1 &&
      mapFloor[convertRoomIndexToCoordIncludingWalls(mapColumn + 1)][
        convertRoomIndexToCoordIncludingWalls(mapRow)
      ] == -1 &&
      mapFloor[convertRoomIndexToCoordIncludingWalls(mapColumn)][
        convertRoomIndexToCoordIncludingWalls(mapRow - 1)
      ] == 0 &&
      mapFloor[convertRoomIndexToCoordIncludingWalls(mapColumn)][
        convertRoomIndexToCoordIncludingWalls(mapRow + 1)
      ] == 0
    ) {
      return BridgeType.VERTICAL_BRIGE;
    }

    return BridgeType.NOT_A_BRIDGE;
  }

  // Only put tiles with grates if no more than one wall is adjacent
  private identifyGrates(
    floorNumber: number,
    mapColumn: number,
    mapRow: number
  ): boolean {
    const mapFloor = this.map.get(floorNumber);
    return (
      Number(
        mapFloor[convertRoomIndexToCoordIncludingWalls(mapColumn) - 1][
          convertRoomIndexToCoordIncludingWalls(mapRow)
        ] == 0
      ) +
        Number(
          mapFloor[convertRoomIndexToCoordIncludingWalls(mapColumn) + 1][
            convertRoomIndexToCoordIncludingWalls(mapRow)
          ] == 0
        ) +
        Number(
          mapFloor[convertRoomIndexToCoordIncludingWalls(mapColumn)][
            convertRoomIndexToCoordIncludingWalls(mapRow) - 1
          ] == 0
        ) +
        Number(
          mapFloor[convertRoomIndexToCoordIncludingWalls(mapColumn)][
            convertRoomIndexToCoordIncludingWalls(mapRow) + 1
          ] == 0
        ) >=
      3
    );
  }

  /**
   * Creates the floor for every room
   */
  createFloorTile(floorNumber: number, column: number, row: number) {
    const paths = wallPieceModels[0].paths;
    let isBridge = false;
    let transform = null;

    // Make the tile a bridge if it has inaccessible spaces oposite of each other but accessible spaces in the other direction.
    const bridgeType = this.identifyBridge(floorNumber, column, row);
    if (bridgeType != BridgeType.NOT_A_BRIDGE) {
      let mesh = this.instancedMeshes.get(paths[0]);
      transform = this.scene.addNewInstanceOfInstancedMesh(mesh);
      vec3.set(transform.scale, 0.83, 0.83, 0.83);

      if (bridgeType == BridgeType.VERTICAL_BRIGE) {
        quat.fromEuler(transform.rotation, 0.0, column * 90 + row * 90, 0.0);
      }
      isBridge = true;
    } else {
      let mesh = this.instancedMeshes.get(paths[0]);
      transform = this.scene.addNewInstanceOfInstancedMesh(mesh);
      vec3.set(transform.scale, 0.9, 0.9, 0.9);
    }

    vec3.set(
      transform.position,
      5.0 + roomSize * column,
      floorNumber * -roomHeight,
      5.0 + roomSize * row
    );

    if (!isBridge) {
      quat.fromEuler(transform.rotation, 0.0, column * 90 + row * 90, 0.0);
    }

    transform.calculateMatrices();
    this.graphicsContent
      .get(floorNumber)
      [Math.min(column, this.columns.get(floorNumber) - 1)][
        Math.min(row, this.rows.get(floorNumber) - 1)
      ].push(transform); // Save transform to be able to cull it with custom culling

    let phyTrans = new Transform();
    vec3.set(
      phyTrans.position,
      roomSize * 0.5 + column * roomSize,
      floorNumber * -roomHeight - 0.5,
      roomSize * 0.5 + row * roomSize
    );
    phyTrans.scale = vec3.fromValues(roomSize, 1.0, roomSize);
    let physObj = this.floorPhysicsScenes
      .get(floorNumber)
      .addNewPhysicsObject(phyTrans);
    physObj.isStatic = true;
    physObj.frictionCoefficient = 10.0;
  }

  /**
   * Creates ceiling for every room
   */
  createCeilingTile(floorNumber: number, column: number, row: number) {
    const path = wallPieceModels[0].paths[1];
    let transform = null;

    // Make the tile a bridge if it has inaccessible spaces oposite of each other but accessible spaces in the other direction.
    let mesh = this.instancedMeshes.get(path);
    transform = this.scene.addNewInstanceOfInstancedMesh(mesh);
    vec3.set(transform.scale, 1.0, 1.0, 1.0);

    vec3.set(
      transform.position,
      roomSize * 0.5 + roomSize * column,
      floorNumber * -roomHeight + roomHeight,
      roomSize * 0.5 + roomSize * row
    );

    transform.calculateMatrices();
    this.graphicsContent
      .get(floorNumber)
      [Math.min(column, this.columns.get(floorNumber) - 1)][
        Math.min(row, this.rows.get(floorNumber) - 1)
      ].push(transform); // Save transform to be able to cull it with custom culling

    if (floorNumber == 0) {
      let physObj = this.floorPhysicsScenes
      .get(floorNumber)
      .addNewPhysicsObject(transform);
      physObj.boundingBox.setMinAndMaxVectors(vec3.fromValues(-5.7, -0.2, -5.7), vec3.fromValues(5.7, 0.2, 5.7))
      physObj.isStatic = true;
      physObj.frictionCoefficient = 0.0;
    }
  }

  /**
   * Creates tile wall at the lowest z value wall for every room
   */
  createTopOfTileWall(floorNumber: number, column: number, row: number) {
    const mapFloor = this.map.get(floorNumber);
    let isBridge = false;
    let isDoorway = false;

    const paths = wallPieceModels[mapFloor[column * 2 + 1][row * 2]].paths;
    let path = paths[Math.floor(Math.random() * paths.length)];

    if (
      this.floorShaftRoom.get(floorNumber)[0] == column &&
      this.floorShaftRoom.get(floorNumber)[1] == row
    ) {
      path = "Assets/objs/MyDungeon/Wall_doorway.obj";
      isDoorway = true;
    }

    const rots = wallPieceModels[mapFloor[column * 2 + 1][row * 2]].rot;
    let mesh = this.instancedMeshes.get(path);
    let transform = this.scene.addNewInstanceOfInstancedMesh(mesh);
    vec3.set(
      transform.position,
      roomSize * 0.5 + roomSize * column,
      floorNumber * -roomHeight,
      roomSize * 0.5 + roomSize * row - 5.0
    );

    if (
      this.identifyBridge(floorNumber, column, row - 1) ==
        BridgeType.HORIZONTAL_BRIDGE ||
      this.identifyBridge(floorNumber, column, row) ==
        BridgeType.HORIZONTAL_BRIDGE
    ) {
      isBridge = true;
      if (!isDoorway) {
        vec3.set(transform.scale, 1.0, 0.3, 1.0);
      }
    } else {
      vec3.set(transform.scale, 1.0, 1.0, 1.0);
    }

    quat.fromEuler(
      transform.rotation,
      0.0,
      rots[Math.floor(Math.random() * rots.length)],
      0.0
    );
    transform.calculateMatrices();
    this.graphicsContent
      .get(floorNumber)
      [Math.min(column, this.columns.get(floorNumber) - 1)][
        Math.min(row, this.rows.get(floorNumber) - 1)
      ].push(transform); // Save transform to be able to cull it with custom culling

    // Doorway leading into shaft, use mesh collision for it and then return to not add double physics objects
    if (isDoorway) {
      let doorwayPhysObj = this.floorPhysicsScenes
        .get(floorNumber)
        .addNewPhysicsObject(transform);
      doorwayPhysObj.setupBoundingBoxFromGraphicsBundle(mesh);
      doorwayPhysObj.setupInternalTreeFromGraphicsObject(mesh.graphicsObject);
      doorwayPhysObj.isStatic = true;
      doorwayPhysObj.frictionCoefficient = 0.0;
      return;
    }

    let phyTrans = new Transform();
    vec3.set(
      phyTrans.position,
      roomSize * 0.5 + column * roomSize,
      floorNumber * -roomHeight,
      roomSize * 0.5 + row * roomSize - 5.0
    );
    vec3.set(phyTrans.origin, 0.0, -0.5, 0.0);
    phyTrans.scale = vec3.clone(physicsObjectScales[1]);
    if (isBridge) {
      phyTrans.scale[1] *= 0.3;
    }

    let physObj = this.floorPhysicsScenes
      .get(floorNumber)
      .addNewPhysicsObject(phyTrans);
    physObj.isStatic = true;
    physObj.frictionCoefficient = 0.0;
  }

  /**
   * Creates tile wall at the lowest x value wall for every room
   */
  createLeftOfTileWall(floorNumber: number, column: number, row: number) {
    const mapFloor = this.map.get(floorNumber);
    let isBridge = false;
    const paths = wallPieceModels[mapFloor[column * 2][row * 2 + 1]].paths;
    const rots = wallPieceModels[mapFloor[column * 2][row * 2 + 1]].rot;
    let mesh = this.instancedMeshes.get(
      paths[Math.floor(Math.random() * paths.length)]
    );
    let transform = this.scene.addNewInstanceOfInstancedMesh(mesh);
    vec3.set(
      transform.position,
      roomSize * 0.5 + roomSize * column - 5.0,
      floorNumber * -roomHeight,
      roomSize * 0.5 + roomSize * row
    );

    if (
      this.identifyBridge(floorNumber, column - 1, row) ==
        BridgeType.VERTICAL_BRIGE ||
      this.identifyBridge(floorNumber, column, row) == BridgeType.VERTICAL_BRIGE
    ) {
      vec3.set(transform.scale, 1.0, 0.3, 1.0);
      isBridge = true;
    } else {
      vec3.set(transform.scale, 1.0, 1.0, 1.0);
    }

    quat.fromEuler(
      transform.rotation,
      0.0,
      rots[Math.floor(Math.random() * rots.length)],
      0.0
    );
    transform.calculateMatrices();
    this.graphicsContent
      .get(floorNumber)
      [Math.min(column, this.columns.get(floorNumber) - 1)][
        Math.min(row, this.rows.get(floorNumber) - 1)
      ].push(transform); // Save transform to be able to cull it with custom culling

    let phyTrans = new Transform();
    vec3.set(
      phyTrans.position,
      roomSize * 0.5 + column * roomSize - 5.0,
      floorNumber * -roomHeight,
      roomSize * 0.5 + row * roomSize
    );
    phyTrans.scale = vec3.clone(physicsObjectScales[2]);
    vec3.set(phyTrans.origin, 0.0, -0.5, 0.0);

    if (isBridge) {
      phyTrans.scale[1] *= 0.3;
    }

    let physObj = this.floorPhysicsScenes
      .get(floorNumber)
      .addNewPhysicsObject(phyTrans);
    physObj.isStatic = true;
    physObj.frictionCoefficient = 0.0;
  }

  /**
   * Creates crossings and pillars etc
   */
  createTopLeftOfTile(floorNumber: number, column: number, row: number) {
    const mapFloor = this.map.get(floorNumber);
    const paths = wallPieceModels[mapFloor[column * 2][row * 2]].paths;
    const rots = wallPieceModels[mapFloor[column * 2][row * 2]].rot;
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
      floorNumber * -roomHeight,
      5.0 + 10 * row - 5.0
    );
    vec3.set(transform.scale, 1.0, 1.0, 1.0);
    quat.fromEuler(
      transform.rotation,
      0.0,
      rots[Math.floor(Math.random() * rots.length)],
      0.0
    );
    vec3.add(
      transform.position,
      transform.position,
      wallPieceModels[mapFloor[column * 2][row * 2]].posOffset
    );
    transform.calculateMatrices();
    this.graphicsContent
      .get(floorNumber)
      [Math.min(column, this.columns.get(floorNumber) - 1)][
        Math.min(row, this.rows.get(floorNumber) - 1)
      ].push(transform); // Save transform to be able to cull it with custom culling

    // Only add a physics object for crossings if it's not a end piece
    if (
      mapFloor[column * 2][row * 2] % 16 < 12 ||
      mapFloor[column * 2][row * 2] % 16 > 15
    ) {
      let physObj = this.floorPhysicsScenes
        .get(floorNumber)
        .addNewPhysicsObject(transform);
      physObj.setupBoundingBoxFromGraphicsBundle(mesh);
      physObj.setupInternalTreeFromGraphicsObject(mesh.graphicsObject, path);
      physObj.isStatic = true;
      physObj.frictionCoefficient = 0.0;
    }
  }

  /**
   * Loads meshes and populates instancedMeshes if empty. Then creates the mesh instances needed for the floor
   */
  async createMeshes(floorNumber: number, scene: Scene) {
    if (this.instancedMeshes.size == 0) {
      let meshesToLoad = new Set<string>();
      for (let piece of wallPieceModels) {
        for (let path of piece.paths) {
          meshesToLoad.add(path);
        }
      }

      meshesToLoad.add("Assets/objs/MyDungeon/Wall_doorway.obj");

      // Load meshes before creating
      await this.scene.renderer.meshStore
        .loadMeshes(Array.from(meshesToLoad), { loaded: 0 })
        .then(async () => {
          for (let piece of wallPieceModels) {
            for (let path of piece.paths)
              if (path != "") {
                if (!this.instancedMeshes.has(path)) {
                  let diffuseTexture = "CSS:rgb(255, 255, 255)";
                  let specularTexture = "CSS:rgb(0,0,0)";
                  if (path.includes("dungeonPack")) {
                    diffuseTexture = "Assets/Textures/dungeon_texture.png";
                  }
                  if (path.includes("MyDungeon")) {
                    diffuseTexture = path.substring(0, path.length - 4) + ".mtl";
                    specularTexture = path.substring(0, path.length - 4) + "_spec.mtl";
                  }

                  this.instancedMeshes.set(
                    path,
                    await Factories.createInstancedMesh(
                      scene,
                      path,
                      diffuseTexture,
                      specularTexture
                    )
                  );
                }
              }
          }

          this.instancedMeshes.set(
            "Assets/objs/MyDungeon/Wall_doorway.obj",
            await Factories.createInstancedMesh(
              scene,
              "Assets/objs/MyDungeon/Wall_doorway.obj",
              "Assets/objs/MyDungeon/Wall_doorway.mtl",
              "Assets/objs/MyDungeon/Wall_doorway_spec.mtl"
            )
          );
        });
    }

    const columns = this.columns.get(floorNumber);
    const rows = this.rows.get(floorNumber);
    const mapFloor = this.map.get(floorNumber);

    for (let column = 0; column < columns + 1; column++) {
      for (let row = 0; row < rows + 1; row++) {
        // Tile filling (floor or blocked)
        if (column < columns && row < rows) {
          if (
            mapFloor[convertRoomIndexToCoordIncludingWalls(column)][
              convertRoomIndexToCoordIncludingWalls(row)
            ] == 0
          ) {
            if (
              !(
                column * 2 + 1 == this.getExitRoom(floorNumber)[0] &&
                row * 2 + 1 == this.getExitRoom(floorNumber)[1]
              )
            ) {
              this.createFloorTile(floorNumber, column, row);
            }

            let aboveFloor = this.getAboveFloorNumber(floorNumber);

            if (
              aboveFloor == -1 ||
              convertCoordIncludingWallsToRoomIndex(
                this.getExitRoom(aboveFloor)[0]
              ) != column ||
              convertCoordIncludingWallsToRoomIndex(
                this.getExitRoom(aboveFloor)[1]
              ) != row
            ) {
              this.createCeilingTile(floorNumber, column, row);
            }
          } else if (
            mapFloor[convertRoomIndexToCoordIncludingWalls(column)][
              convertRoomIndexToCoordIncludingWalls(row)
            ] == -1
          ) {
            // If there should be something in the voids, create it here
          }
        }

        // Top of tile wall
        if (
          column < columns &&
          mapFloor[column * 2 + 1][row * 2] > 0 &&
          mapFloor[column * 2 + 1][row * 2] < wallPieceModels.length
        ) {
          this.createTopOfTileWall(floorNumber, column, row);
        }

        // Left of tile wall
        if (
          row < rows &&
          mapFloor[column * 2][row * 2 + 1] > 0 &&
          mapFloor[column * 2][row * 2 + 1] < wallPieceModels.length
        ) {
          this.createLeftOfTileWall(floorNumber, column, row);
        }

        // Top left of tile corner
        if (
          mapFloor[column * 2][row * 2] > 0 &&
          mapFloor[column * 2][row * 2] < wallPieceModels.length
        ) {
          this.createTopLeftOfTile(floorNumber, column, row);
        }
      }
    }
    this.floorPhysicsScenes.get(floorNumber).update(0.0, true, false); // Update static objects (all walls) so octree is updated
  }

  checkIfVoid(position: vec3): boolean {
    // Calculate room from position
    let floorNumber = Math.max(0, Math.floor(-(position[1] + 0.1) / 5.0));

    let room = vec2.floor(
      vec2.create(),
      vec2.scale(
        vec2.create(),
        vec2.fromValues(position[0], position[2]),
        1.0 / roomSize
      )
    );

    if (
      !this.columns.has(floorNumber) ||
      !this.rows.has(floorNumber) ||
      room[0] < 0 ||
      room[0] >= this.columns.get(floorNumber) ||
      room[1] < 0 ||
      room[1] >= this.rows.get(floorNumber)
    ) {
      return true;
    }

    if (
      this.map.get(floorNumber)[convertRoomIndexToCoordIncludingWalls(room[0])][
        convertRoomIndexToCoordIncludingWalls(room[1])
      ] == -1
    ) {
      return true;
    }

    return false;
  }

  checkIfOutsideOfMap(position: vec3): boolean {
    // Calculate room from position
    let floorNumber = Math.max(0, Math.floor(-(position[1] + 0.1) / 5.0));

    let room = vec2.floor(
      vec2.create(),
      vec2.scale(
        vec2.create(),
        vec2.fromValues(position[0], position[2]),
        1.0 / roomSize
      )
    );

    if (
      !this.columns.has(floorNumber) ||
      !this.rows.has(floorNumber) ||
      room[0] < 0 ||
      room[0] >= this.columns.get(floorNumber) ||
      room[1] < 0 ||
      room[1] >= this.rows.get(floorNumber)
    ) {
      return true;
    }
    return false;
  }

  updateFocusRoom(position: vec3) {
    // Calculate room from characterPosition
    let floorNumber = Math.max(0, Math.ceil(-(position[1] + 0.1) / roomHeight));

    this.currentFloor = floorNumber;

    let room = vec2.floor(
      vec2.create(),
      vec2.scale(
        vec2.create(),
        vec2.fromValues(position[0], position[2]),
        1.0 / roomSize
      )
    );
    if (
      !this.columns.has(floorNumber) ||
      !this.rows.has(floorNumber) ||
      room[0] < 0 ||
      room[0] >= this.columns.get(floorNumber) ||
      room[1] < 0 ||
      room[1] >= this.rows.get(floorNumber)
    ) {
      return;
    }

    // If it's not the same as the current focus room, update the focus room
    this.focusRoom = room;
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

  findPath(floorNumber: number, start: vec2, target: vec2): vec2[] {
    const mapFloor = this.map.get(floorNumber);
    const rows = mapFloor.length;
    const cols = mapFloor[0].length;
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
          mapFloor[nx][ny] == 0
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

  getRandomAccessibleRoomCoords(floorNumber: number): vec2 {
    const mapFloor = this.map.get(floorNumber);
    let coordsSet = new Array<vec2>();
    for (let x = 0; x < mapFloor.length; x++) {
      for (let y = 0; y < mapFloor[x].length; y++) {
        if (mapFloor[x][y] == 0) {
          coordsSet.push(vec2.fromValues(x, y));
        }
      }
    }
    return coordsSet[Math.floor(Math.random() * coordsSet.length)];
  }

  getRoomCenterWorldPos(floorNumber: number, room: vec2): vec3 {
    let x =
      convertCoordIncludingWallsToRoomIndex(room[0]) * roomSize + roomSize / 2;
    let y =
      convertCoordIncludingWallsToRoomIndex(room[1]) * roomSize + roomSize / 2;
    return vec3.fromValues(x, floorNumber * -roomHeight, y);
  }

  // Find avalible spawn as far away from player as possible
  private findExitRoom(floorNumber: number, playerSpawnRoom: vec2): vec2 {
    const mapFloor = this.map.get(floorNumber);
    const accessibleRooms: vec2[] = [];

    for (let x = 1; x < mapFloor.length; x += 2) {
      for (let y = 1; y < mapFloor[0].length; y += 2) {
        if (mapFloor[x][y] === 0) {
          accessibleRooms.push(vec2.fromValues(x, y));
        }
      }
    }

    // Find the room farthest from player spawn
    let maxDistance = 0;
    let exitRoom = playerSpawnRoom;
    const startRoom = vec2.fromValues(
      convertRoomIndexToCoordIncludingWalls(playerSpawnRoom[0]),
      convertRoomIndexToCoordIncludingWalls(playerSpawnRoom[1])
    );

    for (const room of accessibleRooms) {
      const path = this.findPath(floorNumber, room, startRoom);
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

  getExitRoom(floorNumber: number): vec2 {
    return this.floorExitRoom.get(floorNumber);
  }

  getExitRoomPos(floorNumber: number): vec3 {
    return this.getRoomCenterWorldPos(
      floorNumber,
      this.floorExitRoom.get(floorNumber)
    );
  }

  getfloorShaftRoomPos(floorNumber: number): vec3 {
    const room = this.floorShaftRoom.get(floorNumber);
    return vec3.fromValues(
      room[0] * roomSize + roomSize / 2,
      floorNumber * -roomHeight,
      room[1] * roomSize + roomSize / 2
    );
  }

  private createExitLight(floorNumber: number, scene: Scene) {
    this.pointLight = scene.addNewPointLight();
    if (this.pointLight) {
      vec3.copy(this.pointLight.position, this.getExitRoomPos(floorNumber));
      this.pointLight.position[1] = 2.0;

      vec3.set(this.pointLight.colour, 0.0, 1.5, 0.0);

      this.pointLight.linear = 0.09;
      this.pointLight.quadratic = 0.032;
      this.pointLight.constant = 1.0;

      this.pointLight.castShadow = false;
    }
  }

  doFrustumCulling() {
    for (const floor of this.graphicsContent) {
      if (Math.abs(floor[0] - this.getCurrentFloor()) > 1) {
        continue;
      }

      for (let col = 0; col < floor[1].length; col++) {
        if (Math.abs(col - this.focusRoom[0]) > 7) {
          continue;
        }

        for (let row = 0; row < floor[1][col].length; row++) {
          if (Math.abs(row - this.focusRoom[1]) > 7) {
            continue;
          }

          for (const objectWithEnable of floor[1][col][row]) {
            objectWithEnable.enabled = true;
          }
        }
      }
    }
  }

  getAccessibleRooms(floorNumber: number): vec2[] {
    return this.accessibleRooms.get(floorNumber) || [];
  }
}

class DisjointSets {
  size: number;
  set: Array<number>;

  constructor(size: number) {
    this.size = size;
    this.set = new Array<number>(size).fill(-1);
  }

  find(x: number): number {
    if (this.set[x] == undefined) {
      return null;
    }
    if (this.set[x] < 0) {
      return x;
    } else {
      return this.find(this.set[x]);
    }
  }

  findCompress(x: number): number {
    if (this.set[x] == undefined) {
      return null;
    }
    if (this.set[x] < 0) {
      return x;
    } else {
      this.set[x] = this.findCompress(this.set[x]);
      return this.set[x];
    }
  }

  unionSetsRank(root1: number, root2: number) {
    if (this.set[root1] < this.set[root2]) {
      this.set[root2] = root1;
    } else if (this.set[root1] > this.set[root2]) {
      this.set[root1] = root2;
    } else {
      this.set[root2] = root1;
      this.set[root1]--;
    }
  }

  numberOfTrees(): number {
    let returnValue = 0;
    for (let i = 0; i < this.size; i++) {
      if (this.set != undefined && this.set[i] < 0) {
        returnValue++;
      }
    }
    return returnValue;
  }

  printSet() {
    console.log(this.set);
  }
}

export module LabyrinthGenerator {
  /**
   * Generates a 2 dimensional number array with wall tiles (1 through 15) and "walkable" tiles (0), and inaccessible tiles (-1)
   * The labyrinth array will actually be columns * 2 + 1 wide and rows * 2 + 1 high, since the walls and intersections get their own entries
   * @param xSize Number of "rooms" in x direction of the grid.
   * @param ySize Number of "rooms" in y direction of the grid.
   * @param mustGoRooms Array of [column, row] pairs where the generation has to reach before being finished
   * @param noGoRooms Array of [column, row] pairs where the generation will never go into.
   * @param connectionRooms Array of [column, row] pairs where the room will act as a no go room, until the end of generation where it will open the walls to all available rooms around it.
   * @param keepWallChance The chance of a wall staying after the labyrinth has been generated, default value 1.0. Range ]0.0, 1.0[ where a lower number makes the chance of walls disappearing (creating aditional routes) more likely.
   * @returns The 2 dimensional array
   *
   * These are the wall values and their representations ( add 16 for walls next to inaccessable areas )
   *
   * ---- Walls ----
   *
   * ─  -  1, 12 (end piece with wall on left), 13 (end piece with wall on right)
   *
   * │  -  2, 14 (end piece with wall above), 15 (end piece with wall below)
   *
   * ---- Corners ----
   *
   * ┌  -  3
   *
   * ┐  -  4
   *
   * ┘  -  5
   *
   * └  -  6
   *
   * ---- T-intersections ----
   *
   * ┬  -  7
   *
   * ┤  -  8
   *
   * ┴  -  9
   *
   * ├  -  10
   *
   * ---- Cross-section ----
   *
   * ┼  -  11
   *
   * --- Pillars ----
   *
   * x  -  16
   *
   * ---- Space types ----
   *
   * " "-  0 (accessable space)
   *
   * ░  -  -1 (inaccessible space)
   *
   */
  export function getLabyrinth(
    xSize: number,
    ySize: number,
    mustGoRooms: Array<number[]>,
    noGoRooms: Array<number[]>,
    connectionRooms: Array<number[]>,
    keepWallChance: number = 1.0
  ): Array<Array<number>> {
    if (
      mustGoRooms.some((room) => {
        noGoRooms.includes(room);
      })
    ) {
      console.error("Labyrinth generator: Some mustGoRoom is a noGoRoom");
      return null;
    }

    for (const room of mustGoRooms) {
      if (room[0] < 0 || room[0] >= xSize || room[1] < 0 || room[1] >= ySize) {
        console.error(
          "Labyrinth generator: mustGoRooms includes a room outside of the grid"
        );
        return null;
      }
    }

    //Decide sizes
    xSize = xSize * 2 + 1;
    ySize = ySize * 2 + 1;

    // Generate map
    let map = new Array<Array<number>>(xSize);
    for (let i = 0; i < xSize; i++) {
      map[i] = new Array<number>();
    }

    //Generate walls
    generateMap(map, xSize, ySize);
    generateMaze(
      map,
      xSize,
      ySize,
      mustGoRooms,
      noGoRooms,
      connectionRooms,
      keepWallChance
    );

    return map;
  }

  function generateMap(
    map: Array<Array<number>>,
    xSize: number,
    ySize: number
  ) {
    let counter = 3;

    for (let j = 0; j < ySize; j++) {
      for (let i = 0; i < xSize; i++) {
        if (i % 2 == 0 || j % 2 == 0) {
          if (i % 2 == 0 && j % 2 == 0) {
            map[i][j] = 2;
          } else {
            map[i][j] = 1;
          }
        } else {
          map[i][j] = counter;
          counter++;
        }
      }
    }
  }

  function calculateWallNumbersNextToRooom(
    x: number,
    y: number,
    xSize: number,
    ySize: number,
    nrWalls: number
  ): { up: number; down: number; left: number; right: number } {
    let returnObject: {
      up: number;
      down: number;
      left: number;
      right: number;
    } = { up: null, down: null, left: null, right: null };

    /*
		  |  |  |
		-- -- -- --
		  |  |  |
		-- -- -- --
		  |  | x| 
		-- -- -- --
		  |  |  |
		  [2,2] 
		  Left = 2 + (4 * 2 - 1) * 2 - 1= 2 + 14 - 1= 15
		  Right = 15 + 1 = 16
		  Up = 16 - 4 = 12;
		  Down = 15 + 4 = 19
		*/

    returnObject.left = x + (((xSize - 1) / 2) * 2 - 1) * y - 1;
    returnObject.right = returnObject.left + 1;
    returnObject.up = returnObject.right - (xSize - 1) / 2;
    returnObject.down = returnObject.left + (xSize - 1) / 2;

    if (returnObject.left < 0 || returnObject.left >= nrWalls || x <= 0) {
      returnObject.left = null;
    }
    if (
      returnObject.right < 0 ||
      returnObject.right >= nrWalls ||
      x >= (xSize - 1) / 2 - 1
    ) {
      returnObject.right = null;
    }
    if (returnObject.up < 0 || returnObject.up >= nrWalls || y <= 0) {
      returnObject.up = null;
    }
    if (
      returnObject.down < 0 ||
      returnObject.down >= nrWalls ||
      y >= (ySize - 1) / 2 - 1
    ) {
      returnObject.down = null;
    }

    return returnObject;
  }

  function generateMaze(
    map: Array<Array<number>>,
    xSize: number,
    ySize: number,
    mustGoRooms: Array<number[]>,
    noGoRooms: Array<number[]>,
    connectionRooms: Array<number[]>,
    keepWallChance: number = 1.0
  ) {
    let spaces = new DisjointSets(((xSize - 1) / 2) * ((ySize - 1) / 2));
    for (const noGoRoom of noGoRooms) {
      if (
        noGoRoom[0] >= 0 &&
        noGoRoom[0] < (xSize - 1) / 2 &&
        noGoRoom[1] >= 0 &&
        noGoRoom[1] < (ySize - 1) / 2
      ) {
        spaces.set[noGoRoom[1] * ((xSize - 1) / 2) + noGoRoom[0]] = null;
      }
    }

    let nrOfWalls =
      ((xSize - 1) / 2) * ((ySize - 1) / 2) * 2 -
      (xSize - 1) / 2 -
      (ySize - 1) / 2;
    let tested = new Array<number>(nrOfWalls);
    for (let i = 0; i < nrOfWalls; i++) {
      tested[i] = 0;
    }

    let walls = new Array<number>(nrOfWalls);
    for (let i = 0; i < nrOfWalls; i++) {
      walls[i] = 1;
    }

    let firstMustGoRoomNr = -1;

    if (mustGoRooms.length > 0) {
      firstMustGoRoomNr =
        mustGoRooms[0][1] * ((xSize - 1) / 2) + mustGoRooms[0][0];
      // go until all mustGoRooms are visisted
      let done = false;
      while (!done) {
        done = true;
        for (let i = 0; i < mustGoRooms.length; i++) {
          if (
            spaces.find(
              mustGoRooms[0][1] * ((xSize - 1) / 2) + mustGoRooms[0][0]
            ) !=
            spaces.find(
              mustGoRooms[i][1] * ((xSize - 1) / 2) + mustGoRooms[i][0]
            )
          ) {
            done = false;
            break;
          }
        }
        if (!done) {
          removeRandomWall(map, xSize, ySize, spaces, walls, tested, nrOfWalls);
        }
      }
    } else {
      while (spaces.numberOfTrees() > 1) {
        removeRandomWall(map, xSize, ySize, spaces, walls, tested, nrOfWalls);
      }
    }

    for (const connectionRoom of connectionRooms) {
      if (
        connectionRoom[0] >= 0 &&
        connectionRoom[0] < (xSize - 1) / 2 &&
        connectionRoom[1] >= 0 &&
        connectionRoom[1] < (ySize - 1) / 2
      ) {
        for (let x = -1; x < 2; x++) {
          for (let y = -1; y < 2; y++) {
            if (x != 0 && y != 0) {
              continue;
            }
            if (x == 0 && y == 0) {
              continue;
            }
            if (
              connectionRoom[0] + x >= 0 &&
              connectionRoom[0] + x < (xSize - 1) / 2 &&
              connectionRoom[1] + y >= 0 &&
              connectionRoom[1] + y < (ySize - 1) / 2
            ) {
              let connectionRoomNr =
                connectionRoom[1] * ((xSize - 1) / 2) + connectionRoom[0];
              let adjecentRoomNr =
                (connectionRoom[1] + y) * ((xSize - 1) / 2) +
                connectionRoom[0] +
                x;
              if (spaces.set[adjecentRoomNr] != undefined) {
                if (
                  spaces.findCompress(connectionRoomNr) !=
                  spaces.findCompress(adjecentRoomNr)
                ) {
                  // Figure out which tree is correct
                  if (
                    firstMustGoRoomNr >= 0 &&
                    spaces.find(connectionRoomNr) ==
                      spaces.find(firstMustGoRoomNr)
                  ) {
                    spaces.set[adjecentRoomNr] = connectionRoomNr;
                  } else {
                    spaces.set[connectionRoomNr] = adjecentRoomNr;
                  }
                }

                // Also remove wall
                let wallNrs = calculateWallNumbersNextToRooom(
                  connectionRoom[0],
                  connectionRoom[1],
                  xSize,
                  ySize,
                  nrOfWalls
                );
                if (x == -1 && wallNrs.left != undefined) {
                  walls[wallNrs.left] = 0;
                }
                if (x == 1 && wallNrs.right != undefined) {
                  walls[wallNrs.right] = 0;
                }
                if (y == -1 && wallNrs.up != undefined) {
                  walls[wallNrs.up] = 0;
                }
                if (y == 1 && wallNrs.down != undefined) {
                  walls[wallNrs.down] = 0;
                }
              }
            }
          }
        }
      }
    }

    markEmptySpaces(map, xSize, ySize, spaces, mustGoRooms);
    removeWalls(map, xSize, ySize, walls);

    const checkIfNextToInaccessible = function (x: number, y: number): boolean {
      for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
          if (i == 0 && j == 0) {
            continue;
          }
          if (x + i < 0 || y + j < 0 || x + i >= xSize || y + j >= ySize) {
            return true;
          }

          if (map[x + i][y + j] == -1) {
            return true;
          }
        }
      }
      return false;
    };

    const checkIfWallIsUnnecessary = function (x: number, y: number): boolean {
      for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
          if (i == 0 && j == 0) {
            continue;
          }
          if (x + i < 0 || y + j < 0 || x + i >= xSize || y + j >= ySize) {
            continue;
          }

          if (map[x + i][y + j] == 0) {
            return false;
          }
        }
      }
      return true;
    };

    // Make wall openings between two inaccessible spaces also inaccessible
    for (let column = 0; column < xSize; column++) {
      for (let row = 0; row < ySize; row++) {
        if (map[column][row] == 0 && checkIfNextToInaccessible(column, row)) {
          map[column][row] = -1;
        }
      }
    }

    // Make walls that neighbor only inaccessible spaces also inaccessible (remove them)
    for (let column = 0; column < xSize; column++) {
      for (let row = 0; row < ySize; row++) {
        if (map[column][row] > 0 && checkIfWallIsUnnecessary(column, row)) {
          map[column][row] = -1;
        }
      }
    }

    // Remove a few random walls that aren't outer walls to create multiple valid paths
    for (let column = 0; column < xSize; column++) {
      for (let row = 0; row < ySize; row++) {
        if (
          map[column][row] == 1 &&
          !checkIfNextToInaccessible(column, row) &&
          Math.random() > keepWallChance
        ) {
          // Remove
          map[column][row] = 0;
        }
      }
    }

    const checkAbove = function (x: number, y: number): boolean {
      if (y == 0) {
        return false;
      }

      if (map[x][y - 1] <= 0) {
        return false;
      }

      return true;
    };

    const checkLeft = function (x: number, y: number): boolean {
      if (x == 0) {
        return false;
      }

      if (map[x - 1][y] <= 0) {
        return false;
      }

      return true;
    };

    const checkBelow = function (x: number, y: number): boolean {
      if (y == ySize - 1) {
        return false;
      }

      if (map[x][y + 1] <= 0) {
        return false;
      }

      return true;
    };

    const checkRight = function (x: number, y: number): boolean {
      if (x == xSize - 1) {
        return false;
      }

      if (map[x + 1][y] <= 0) {
        return false;
      }

      return true;
    };

    // Go through the 1s (walls) and 2s (intersections) and assign them to different numbers depending on their type
    for (let column = 0; column < xSize; column++) {
      for (let row = 0; row < ySize; row++) {
        if (map[column][row] <= 0) {
          // Room / opening
          continue;
        }

        if (
          !checkAbove(column, row) &&
          !checkBelow(column, row) &&
          checkLeft(column, row) &&
          checkRight(column, row)
        ) {
          map[column][row] = 1; // ─
        }

        if (
          checkAbove(column, row) &&
          checkBelow(column, row) &&
          !checkLeft(column, row) &&
          !checkRight(column, row)
        ) {
          map[column][row] = 2; // │
        }

        if (
          !checkAbove(column, row) &&
          checkBelow(column, row) &&
          !checkLeft(column, row) &&
          checkRight(column, row)
        ) {
          map[column][row] = 3; // ┌
        }

        if (
          !checkAbove(column, row) &&
          checkBelow(column, row) &&
          checkLeft(column, row) &&
          !checkRight(column, row)
        ) {
          map[column][row] = 4; // ┐
        }

        if (
          checkAbove(column, row) &&
          !checkBelow(column, row) &&
          checkLeft(column, row) &&
          !checkRight(column, row)
        ) {
          map[column][row] = 5; // ┘
        }

        if (
          checkAbove(column, row) &&
          !checkBelow(column, row) &&
          !checkLeft(column, row) &&
          checkRight(column, row)
        ) {
          map[column][row] = 6; // └
        }

        if (
          !checkAbove(column, row) &&
          checkBelow(column, row) &&
          checkLeft(column, row) &&
          checkRight(column, row)
        ) {
          map[column][row] = 7; // ┬
        }

        if (
          checkAbove(column, row) &&
          checkBelow(column, row) &&
          checkLeft(column, row) &&
          !checkRight(column, row)
        ) {
          map[column][row] = 8; // ┤
        }

        if (
          checkAbove(column, row) &&
          !checkBelow(column, row) &&
          checkLeft(column, row) &&
          checkRight(column, row)
        ) {
          map[column][row] = 9; // ┴
        }

        if (
          checkAbove(column, row) &&
          checkBelow(column, row) &&
          !checkLeft(column, row) &&
          checkRight(column, row)
        ) {
          map[column][row] = 10; // ├
        }

        if (
          checkAbove(column, row) &&
          checkBelow(column, row) &&
          checkLeft(column, row) &&
          checkRight(column, row)
        ) {
          map[column][row] = 11; // ┼
        }

        if (
          !checkAbove(column, row) &&
          !checkBelow(column, row) &&
          checkLeft(column, row) &&
          !checkRight(column, row)
        ) {
          map[column][row] = 12; // ─
        }

        if (
          !checkAbove(column, row) &&
          !checkBelow(column, row) &&
          !checkLeft(column, row) &&
          checkRight(column, row)
        ) {
          map[column][row] = 13; // ─
        }

        if (
          checkAbove(column, row) &&
          !checkBelow(column, row) &&
          !checkLeft(column, row) &&
          !checkRight(column, row)
        ) {
          map[column][row] = 14; // │
        }

        if (
          !checkAbove(column, row) &&
          checkBelow(column, row) &&
          !checkLeft(column, row) &&
          !checkRight(column, row)
        ) {
          map[column][row] = 15; // │
        }

        if (
          !checkAbove(column, row) &&
          !checkBelow(column, row) &&
          !checkLeft(column, row) &&
          !checkRight(column, row)
        ) {
          map[column][row] = 16; // x
        }

        if (checkIfNextToInaccessible(column, row)) {
          // Make the piece a border piece (by adding 16)
          map[column][row] += 16;
        }
      }
    }
  }

  function markEmptySpaces(
    map: Array<Array<number>>,
    xSize: number,
    ySize: number,
    spaces: DisjointSets,
    mustGoRooms?: Array<number[]>
  ) {
    let startSet = null;
    if (mustGoRooms.length > 0) {
      startSet = map[mustGoRooms[0][0] * 2 + 1][mustGoRooms[0][1] * 2 + 1] - 3;
    }

    for (let y = 0; y < ySize; y++) {
      for (let x = 0; x < xSize; x++) {
        if (map[x][y] > 2) {
          if (
            startSet != undefined &&
            spaces.find(map[x][y] - 3) == spaces.find(startSet)
          ) {
            // There is a startSet and the xy set shares parent with it
            map[x][y] = 0;
          } else if (
            startSet == undefined &&
            spaces.find(map[x][y] - 3) != undefined
          ) {
            // There is no startSet but the room is not marked as no go
            map[x][y] = 0;
          } else {
            map[x][y] = -1;
          }
        }
      }
    }
  }

  function removeWalls(
    map: Array<Array<number>>,
    xSize: number,
    ySize: number,
    walls: Array<number>
  ) {
    let wallCounter = 0;

    for (let j = 1; j < ySize - 1; j++) {
      for (let k = 1; k < xSize - 1; k++) {
        if (map[k][j] == 1) {
          wallCounter++;
          
          // Check surrounding for -1, if any is we don't remove the wall even if we were supposed to.
          if (map[k - 1][j] == -1 || map[k + 1][j] == -1 || map[k][j - 1] == -1 || map[k][j + 1] == -1) {
            map[k][j] = 1;
          }
          else {
            map[k][j] = walls[wallCounter - 1];
          }
        }
        if (map[k][j] > 2) {
          map[k][j] = 0;
        }
      }
    }
  }

  function removeRandomWall(
    map: Array<Array<number>>,
    xSize: number,
    ySize: number,
    spaces: DisjointSets,
    walls: Array<number>,
    tested: Array<number>,
    nrOfWalls: number
  ) {
    let randWallSeed = Math.floor(
      Math.random() * getUnTested(tested, nrOfWalls)
    );
    let randWall = getIdxUnTested(tested, nrOfWalls, randWallSeed);

    if (randWall == -1) {
      return;
    }

    if (walls[randWall] != 0 && tested[randWall] != 1) {
      let elements = new Array<number>();
      getElements(map, xSize, ySize, randWall, elements);

      if (
        spaces.findCompress(elements[0]) != undefined &&
        spaces.findCompress(elements[1]) != undefined &&
        spaces.findCompress(elements[0]) != spaces.findCompress(elements[1])
      ) {
        spaces.unionSetsRank(
          spaces.find(elements[0]),
          spaces.find(elements[1])
        );

        walls[randWall] = 0;
      }
    }
    tested[randWall] = 1;
  }

  function getElements(
    map: Array<Array<number>>,
    xSize: number,
    ySize: number,
    randWall: number,
    elements: Array<number>
  ) {
    let wallCounter = 0;
    let e1 = 0;
    let e2 = 0;

    for (let j = 0; j < ySize - 1; j++) {
      for (let k = 0; k < xSize - 1; k++) {
        if (map[k][j] == 1 && k != 0 && j != 0) {
          wallCounter++;
        }
        if (wallCounter == randWall + 1) {
          if (j % 2 == 0) {
            e1 = map[k][j - 1] - 3;
            e2 = map[k][j + 1] - 3;
          } else {
            e1 = map[k - 1][j] - 3;
            e2 = map[k + 1][j] - 3;
          }

          j = ySize - 1;
          k = xSize - 1;
        }
      }
    }

    elements.push(e1);
    elements.push(e2);
  }

  function getUnTested(tested: Array<number>, nrOfWalls: number) {
    let returnValue = 0;
    for (let i = 0; i < nrOfWalls; i++) {
      if (tested[i] == 0) {
        returnValue++;
      }
    }
    return returnValue;
  }

  function getIdxUnTested(
    tested: Array<number>,
    nrOfWalls: number,
    nr: number
  ) {
    let counter = -1;
    for (let i = 0; i < nrOfWalls; i++) {
      if (tested[i] == 0) {
        if (counter == nr) {
          return i;
        }
        counter++;
      }
    }
    return 0;
  }

  export function getAsciiMap(
    map: Array<Array<number>>,
    visitedRooms?: Set<string>
  ): string {
    if (map == undefined) {
      return;
    }

    const asciiRepresentations = new Array<string>(
      "   ",
      "───",
      " | ",
      " ┌─",
      "─┐ ",
      "─┘ ",
      " └─",
      "─┬─",
      "─┤ ",
      "─┴─",
      " ├─",
      "─┼─",
      "─  ", // End piece with wall on left
      "  ─", // End piece with wall on right
      " | ", // End piece with wall above
      " | ", // End piece with wall below
      " ¤ ", // Pillar
      "═══",
      " ║ ",
      " ╔═",
      "═╗ ",
      "═╝ ",
      " ╚═",
      "═╦═",
      "═╣ ",
      "═╩═",
      " ╠═",
      "═╬═",
      "═  ", // End piece with wall on left
      "  ═", // End piece with wall on right
      " ║ ", // End piece with wall above
      " ║ ", // End piece with wall below
      " ¤ " // Pillar
    );

    const narrowMap = false;
    const xSize = map.length;
    const ySize = map[0].length;
    let output = "";
    for (let j = 0; j < ySize; j++) {
      for (let i = 0; i < xSize; i++) {
        if (visitedRooms != undefined) {
          let visited = false;
          for (let xOffset = -2; xOffset < 3 && !visited; xOffset++) {
            for (let yOffset = -2; yOffset < 3 && !visited; yOffset++) {
              if (
                visitedRooms.has(
                  (i + xOffset - 1) / 2.0 + ";" + (j + yOffset - 1) / 2.0
                )
              ) {
                visited = true;
              }
            }
          }
          if (!visited) {
            if (narrowMap) {
              output += " ";
            } else {
              output += "   ";
            }
            continue;
          }
        }

        if (map[i][j] >= 0 && map[i][j] < asciiRepresentations.length) {
          if (narrowMap) {
            output += asciiRepresentations[map[i][j]][1];
          } else {
            output += asciiRepresentations[map[i][j]];
          }
        } else {
          if (narrowMap) {
            output += "░";
          } else {
            output += "░░░";
          }
        }
      }
      output += "\n";
    }

    return output;
  }
}

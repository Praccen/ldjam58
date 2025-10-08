import { quat, vec2, vec3 } from "gl-matrix";
import {
  Camera,
  Div,
  GraphicsBundle,
  GUIRenderer,
  MousePicking,
  PhysicsObject,
  PhysicsScene,
  Renderer3D,
  Scene,
  TextObject2D,
  Transform,
} from "../../Engine";
import { compileFunction } from "vm";

let json: {
  meshes: {
    name: string;
    meshPath: string;
    diffuse: string;
    specular: string;
    emission: string;
    collision: boolean;
    meshCollision: boolean;
    placements: {
      translation: number[];
      rotation: number[];
      origin: number[];
      scale: number[];
      oneLineFormat: string;
    }[];
  }[];
};

interface ConsoleEntry {
  minArgs: number,
  logic: (args: string[]) => boolean,
  successfulOutput: string,
  failedOutput: string,
  updatesPhysics?: boolean,
}

// key should be the identifier
let consoleCommands = new Map<string, Map<string, ConsoleEntry>>();

export function addNewConsoleCommand(identifiers: string[], possibleArguments: string[], consoleEntry: ConsoleEntry) {
  for (const identifier of identifiers) {
    if (!consoleCommands.has(identifier)) {
      consoleCommands.set(identifier, new Map<string, ConsoleEntry>());
    }

    if (possibleArguments.length == 0) {
      possibleArguments.push("");
    }

    for (const argument of possibleArguments) {
      if (consoleCommands.get(identifier).has(argument)) {
        console.log("Debug console: Overwriting logic for \"" + identifier + "\" \"" + argument + "\"");
      }
      consoleCommands.get(identifier).set(argument, consoleEntry);
    }
  }
}

export default class WorldEditor {
  private camera: Camera;
  private scene: Scene;
  private physicsScene: PhysicsScene;
  private internalPhysicsScene: PhysicsScene; // Will have all the objects loaded throught the world editor in it, no matter if they have collisions or not.
  private guiRenderer: GUIRenderer;
  placementsMap = new Map<
    string,
    {
      gb: GraphicsBundle;
      po: PhysicsObject;
      jsonMesh: (typeof json.meshes)[number];
      placmentIndex: number;
    }[]
  >();
  private currentlySelectedTransform: Transform = null;
  private mousePosition = { x: 0, y: 0, previousX: 0, previousY: 0 };
  private mouseRightHeld = false;
  private mouseMiddleHeld = false;
  private shiftHeld = false;
  private sensitivity = 0.2;
  private autosave = true;

  private commandHistory: string[] = [];
  private commandHistoryIndex = 0;

  private guiDiv: Div;

  private guiElements: HTMLElement[] = [];

  constructor(
    camera: Camera,
    scene: Scene,
    physicsScene: PhysicsScene,
    guiRenderer: GUIRenderer
  ) {
    this.camera = camera;
    this.scene = scene;
    this.physicsScene = physicsScene;
    this.internalPhysicsScene = new PhysicsScene();
    vec3.zero(this.internalPhysicsScene.gravity);

    this.guiRenderer = guiRenderer;

    this.guiDiv = guiRenderer.getNewDiv();
    this.guiDiv.getElement().style.width = "100%";
    this.guiDiv.getElement().style.height = "100%";
    this.guiDiv.getElement().style.zIndex = "5";

    // Add a command line
    let consoleOutput = guiRenderer.getNew2DText(this.guiDiv);
    consoleOutput.position[0] = 0.5;
    consoleOutput.position[1] = 0.85;
    consoleOutput.center = true;
    consoleOutput.getElement().style.width = "80%";
    consoleOutput.getElement().style.height = "14%";
    consoleOutput.textString = "";
    consoleOutput.getElement().style.backgroundColor = "rgba(0,0,0,0.2)";
    consoleOutput.getElement().style.overflowY = "scroll";
    consoleOutput.getElement().style.whiteSpace = "pre";
    consoleOutput.getElement().style.color = "white";

    let consoleCommandsTextEdit = guiRenderer.getNewEditText(this.guiDiv);
    consoleCommandsTextEdit.position[0] = 0.5;
    consoleCommandsTextEdit.position[1] = 0.97;
    consoleCommandsTextEdit.center = true;
    consoleCommandsTextEdit.getElement().style.width = "80%";
    consoleCommandsTextEdit.getInputElement().style.width = "100%";

    this.guiElements.push(consoleCommandsTextEdit.getInputElement());

    let self = this;

    document.addEventListener("keydown", function (event) {
      if (event.key == "Shift") {
        self.shiftHeld = true;
      }
      if (event.key == "Tab") {
        event.preventDefault();
      }
    });

    document.addEventListener("keyup", function (event) {
      if (event.key == "Shift") {
        self.shiftHeld = false;
      }
      if (event.key == "Tab") {
        event.preventDefault();
        const autocompleted = self.tabComplete(consoleCommandsTextEdit.getInputElement().value);
        if (autocompleted.complete.length > 0) {
          consoleCommandsTextEdit.getInputElement().value = autocompleted.complete;
        }

        if (autocompleted.suggestions.length > 0) {
          // Print the options
          consoleOutput.textString += "  ";
          for (const suggestion of autocompleted.suggestions) {
            consoleOutput.textString += suggestion + " ";
          }
          consoleOutput.textString += "\n";
          consoleOutput.scrollToBottom = true;
        }
      }

      if (event.key == "§") {
        self.guiDiv.setHidden(false);
        consoleCommandsTextEdit.getInputElement().focus();
        document.exitPointerLock();
      } else if (
        event.key == "ArrowUp" &&
        consoleCommandsTextEdit.getInputElement() == document.activeElement &&
        self.commandHistory.length > 0
      ) {
        self.commandHistoryIndex = Math.min(
          self.commandHistory.length,
          ++self.commandHistoryIndex
        );
        consoleCommandsTextEdit.getInputElement().value =
          self.commandHistory[
            self.commandHistory.length - self.commandHistoryIndex
          ];
      } else if (
        event.key == "ArrowDown" &&
        consoleCommandsTextEdit.getInputElement() == document.activeElement &&
        self.commandHistory.length > 0
      ) {
        self.commandHistoryIndex = Math.max(0, --self.commandHistoryIndex);
        if (self.commandHistoryIndex == 0) {
          consoleCommandsTextEdit.getInputElement().value = "";
        } else {
          consoleCommandsTextEdit.getInputElement().value =
            self.commandHistory[
              self.commandHistory.length - self.commandHistoryIndex
            ];
        }
      } else if (
        event.key == "Enter" &&
        consoleCommandsTextEdit.getInputElement() == document.activeElement
      ) {
        self.parseConsoleInput(
          consoleCommandsTextEdit.getInputElement().value,
          consoleOutput
        );
        consoleCommandsTextEdit.getInputElement().value = "";
        consoleOutput.scrollToBottom = true;
        self.commandHistoryIndex = 0;
      }
    });

    document.addEventListener("mousemove", function (event) {
      self.mousePosition.previousX = self.mousePosition.x;
      self.mousePosition.previousY = self.mousePosition.y;
      self.mousePosition.x = event.clientX;
      self.mousePosition.y = event.clientY;
      if (self.interacting()) {
        if (!self.shiftHeld && (self.mouseMiddleHeld || self.mouseRightHeld)) {
          let pitchJaw = self.camera.getPitchJawDegrees();
          vec2.scaleAndAdd(
            pitchJaw,
            pitchJaw,
            vec2.fromValues(
              self.mousePosition.y - self.mousePosition.previousY,
              self.mousePosition.x - self.mousePosition.previousX
            ),
            -self.sensitivity
          );
          self.camera.setPitchJawDegrees(pitchJaw[0], pitchJaw[1]);
        }
        else if (self.mouseMiddleHeld || self.mouseRightHeld) {
          let camPos = vec3.clone(self.camera.getPosition());
          vec3.scaleAndAdd(
            camPos,
            camPos,
            self.camera.getRight(),
            -(self.mousePosition.x - self.mousePosition.previousX) * 0.02
          );
          vec3.scaleAndAdd(
            camPos,
            camPos,
            self.camera.getUp(),
            (self.mousePosition.y - self.mousePosition.previousY) * 0.02
          );
          self.camera.setPosition(camPos);
        }
      }
    });

    document.addEventListener("mousedown", (event) => {
      if (event.button == 1) {
        self.mouseMiddleHeld = true;
      }
      if (event.button == 2) {
        self.mouseRightHeld = true;
      }
    });

    document.addEventListener("mouseup", (event) => {
      if (event.button == 0 && self.interacting()) {
        self.selectFromRayIntersection(consoleOutput);
      }
      if (event.button == 1) {
        self.mouseMiddleHeld = false;
      }
      if (event.button == 2) {
        self.mouseRightHeld = false;
      }
    });

    document.addEventListener("wheel", (event) => {
      if (self.interacting()) {
        let camPos = vec3.clone(self.camera.getPosition());
        vec3.scaleAndAdd(
          camPos,
          camPos,
          self.camera.getDir(),
          -event.deltaY * 0.01
        );
        self.camera.setPosition(camPos);
      }
    });

    let testButton = guiRenderer.getNewButton(this.guiDiv);
    testButton.textString = "testButtonLol";
    this.guiElements.push(testButton.getInputElement());
    testButton.onClick(() => {
      testButton.getInputElement().focus();
      consoleOutput.textString += "Button clicked\n";
    });

    addNewConsoleCommand(
        ["r", "rot", "rotate"],
        ["x", "y", "z"],
        { 
          minArgs: 2,
        logic: (args: string[]): boolean => {
          const index = ["x", "y", "z"].findIndex((string) => {
            return string == args[0];
          });
          if (index != -1) {
            let degrees = parseFloat(args[1]);
            if (isNaN(degrees)) {
              return false;
            }
            let rotChange = vec3.create();
            rotChange[index] = degrees;
            if (self.currentlySelectedTransform == undefined) {
              consoleOutput.textString +=
                "No object selected for modification\n";
              return false;
            }
            quat.add(
              self.currentlySelectedTransform.rotation,
              self.currentlySelectedTransform.rotation,
              quat.fromEuler(
                quat.create(),
                rotChange[0],
                rotChange[1],
                rotChange[2]
              )
            );
            return true;
          }
          return false;
        },
        successfulOutput: "Rotated object",
        failedOutput: "Failed to rotate object",
        updatesPhysics: true,
      });
      
      addNewConsoleCommand(
        ["t", "trans", "translate", "move", "m", "mov"],
        ["x", "y", "z"],
        {
        minArgs: 2,
        logic: (args: string[]): boolean => {
          const index = ["x", "y", "z"].findIndex((string) => {
            return string == args[0];
          });
          if (index != -1) {
            let degrees = parseFloat(args[1]);
            if (isNaN(degrees)) {
              return false;
            }
            let translationChange = vec3.create();
            translationChange[index] = degrees;
            if (self.currentlySelectedTransform == undefined) {
              consoleOutput.textString +=
                "No object selected for modification\n";
              return false;
            }
            vec3.add(
              self.currentlySelectedTransform.position,
              self.currentlySelectedTransform.position,
              translationChange
            );
            return true;
          }
          return false;
        },
        successfulOutput: "Translated object",
        failedOutput: "Failed to translate object",
        updatesPhysics: true,
      });

      addNewConsoleCommand(
        ["s", "scale"],
        ["x", "y", "z"],
        {
        minArgs: 2,
        logic: (args: string[]): boolean => {
          const index = ["x", "y", "z"].findIndex((string) => {
            return string == args[0];
          });
          if (index != -1) {
            let degrees = parseFloat(args[1]);
            if (isNaN(degrees)) {
              return false;
            }
            let scaleChange = vec3.create();
            scaleChange[index] = degrees;
            if (self.currentlySelectedTransform == undefined) {
              consoleOutput.textString +=
                "No object selected for modification\n";
              return false;
            }
            vec3.add(
              self.currentlySelectedTransform.scale,
              self.currentlySelectedTransform.scale,
              scaleChange
            );
            return true;
          }
          return false;
        },
        successfulOutput: "Scaled object",
        failedOutput: "Failed to scale object",
        updatesPhysics: true,
      }
    );

    addNewConsoleCommand(["exit"],
      [],
      {
        minArgs: 0,
        logic: (args: string[]): boolean => {
          self.guiDiv.setHidden(true);
          return true;
        },
        successfulOutput: " ",
        failedOutput: " ",
      });
      
      addNewConsoleCommand(
        ["toggle"],
        ["cullingboxes"],
        {
        minArgs: 1,
        logic: (args: string[]): boolean => {
            (self.scene.renderer as Renderer3D).showCullingShapes = !(
              self.scene.renderer as Renderer3D
            ).showCullingShapes;
            return true;
        },
        successfulOutput: "Toggled cullingboxes successfully",
        failedOutput: "Failed to toggle cullingboxes",
      });
      
      addNewConsoleCommand(
        ["set"],
        ["sensitivity"],
        {
        minArgs: 2,
        logic: (args: string[]): boolean => {
          let sensitivity = parseFloat(args[1]);
          if (isNaN(sensitivity)) {
            return false;
          }
          self.sensitivity = sensitivity;
          return true;
        },
        successfulOutput: "Set sensitivity successfully",
        failedOutput: "Failed setting sensitivity",
      });

       addNewConsoleCommand(
        ["set"],
        ["autosave", "auto", "a"],
        {
        minArgs: 2,
        logic: (args: string[]): boolean => {
          self.autosave = args[1] === "true";
          return true;
        },
        successfulOutput: "Set autosave successfully",
        failedOutput: "Set autosave failed",
      });
      
      addNewConsoleCommand(
        ["get"],
        ["sensitivity"],
        {
        minArgs: 1,
        logic: (args: string[]): boolean => {
          consoleOutput.textString += self.sensitivity + "\n";
          return true
        },
        successfulOutput: "",
        failedOutput: "",
      });

      addNewConsoleCommand(
        ["get"],
        ["autosave"],
        {
        minArgs: 1,
        logic: (args: string[]): boolean => {
           consoleOutput.textString += self.autosave + "\n";
          return true
        },
        successfulOutput: "",
        failedOutput: "",
      });
      
      addNewConsoleCommand(
        ["save"],
        [],
        {
        minArgs: 0,
        logic: (args: string[]): boolean => {
          self.save();
          return true;
        },
        successfulOutput: "Saved to clipboard",
        failedOutput: " ",
      },
    );

    // this.tabCompleteUnitTest();

    this.guiDiv.setHidden(true);
  }

  setEnabled(enabled: boolean) {
    this.guiDiv.setHidden(!enabled);
  }

  interacting(): boolean {
    // return this.guiElements.findIndex((element) => {return element == document.activeElement}) > -1;
    return !this.guiDiv.getHidden();
  }

  selectFromRayIntersection(consoleOutput: TextObject2D) {
    const hit = MousePicking.GetRayHit(
      this.camera,
      this.scene.renderer,
      vec2.fromValues(this.mousePosition.x, this.mousePosition.y),
      this.internalPhysicsScene
    );
    if (hit.object == undefined) {
      this.currentlySelectedTransform = null;
      consoleOutput.textString += "Selected nothing \n";
    } else {
      this.currentlySelectedTransform = hit.object.transform;

      let name = "unknown";
      for (let entry of this.placementsMap) {
        for (let placement of entry[1]) {
          if (
            placement.po != undefined &&
            placement.po.physicsObjectId == hit.object.physicsObjectId
          ) {
            name = entry[0];
            break;
          }
        }
        if (name != "unknown") {
          break;
        }
      }

      consoleOutput.textString += "Selected new object " + name + "\n";
    }
    consoleOutput.scrollToBottom = true;
  }
  
  private tabCompleteUnitTest() {
    const tests:{input: string, complete: string, suggestions: string[]}[] = [
      {
        input: "toggle c",
        complete: "toggle cullingboxes ",
        suggestions: []
      },
      {
        input: "tog",
        complete: "toggle ",
        suggestions: []
      },
      {
        input: "toggle a",
        complete: "",
        suggestions: []
      },
      {
        input:"toggle",
        complete:"toggle ",
        suggestions: []
      },
      {
        input:"toggle ",
        complete:"toggle ",
        suggestions: ["cullingboxes"]
      },
      {
        input: "rot",
        complete: "",
        suggestions: ["rot", "rotate"]
      },
      {
        input: "rot ",
        complete: "rot ",
        suggestions: ["x", "y", "z"]
      },
      {
        input: "rot x",
        complete: "rot x ",
        suggestions: []
      },
      {
        input: "rot x ",
        complete: "rot x ",
        suggestions: []
      }
    ]
    
    for (const test of tests) {
      const output = this.tabComplete(test.input);
      if (output.complete != test.complete) {
        debugger;
      }
      if (output.suggestions.length != test.suggestions.length) {
        debugger;
      }
      if (output.suggestions.length == 0) {
        continue;
      }
      test.suggestions.sort();
      output.suggestions.sort();
      for (let i = 0; i < test.suggestions.length; i++) {
        if (test.suggestions[i] != output.suggestions[i]) {
          debugger;
        }
      }
    }
  }

  private getCompletionAndSuggestions(input: string, matchAgainst: string[]) : {complete: string, suggestions: string[]} {
    const inputSplitWithoutEmptyEntries = input.split(" ").filter((value) => value.length > 0);
    if (inputSplitWithoutEmptyEntries.length == 0) {
      return {complete: "", suggestions: matchAgainst};
    }

    let matches = matchAgainst.filter((identifier) => identifier.startsWith(inputSplitWithoutEmptyEntries[0]));
    if (matches.length == 0) {
      // We have no fitting matches, don't suggest anything
      return {complete: "", suggestions: []};
    }

    if (matches.length > 1) {
      for (const match of matches) {
        if (input.trimStart().startsWith(match + " ")) {
          // There where multiple matches, but the input was a complete match followed by a space, so return that match
          return {complete: match + " ", suggestions: []};
        }
      }

      if (inputSplitWithoutEmptyEntries.length == 1) {
        // Many matches and we have only one word input, return all applicable matches
        return {complete: "", suggestions: matches};
      }

      // We have inputted more than one word, but the first word doesn't match anything, don't suggest anything
      return {complete: "", suggestions: []};
    }

    if (matches.length == 1) {
      // Exactly one fit, return it
      return {complete: matches[0] + " ", suggestions: []};
    }
  }

  private tabComplete(input: string): {complete: string, suggestions: string[]} {
    let completionAndSuggestion = this.getCompletionAndSuggestions(input, Array.from(consoleCommands.keys()));

    if (completionAndSuggestion.complete == "") {
      // No direct match, return possible suggestions
      return completionAndSuggestion;
    }

    if (completionAndSuggestion.complete.trim() == input.trim()) {
      // The input matched a single option, and has no arguments
      if (completionAndSuggestion.complete.trim() == input.trimStart()) {
        // input doesn't have a space at the end yet, autocomplete one (already on complete) and don't suggest anything
        return {complete: completionAndSuggestion.complete, suggestions: []};
      }

      // Input ends with a space, return the match + a space, suggest all options
      return {complete: completionAndSuggestion.complete, suggestions: Array.from(consoleCommands.get(completionAndSuggestion.complete.trim()).keys())};
    }

    const inputSplitWithoutEmptyEntries = input.split(" ").filter((value) => value.length > 0);
    if (inputSplitWithoutEmptyEntries.length == 1) {
      // One word input, return the match
      return completionAndSuggestion;
    }

    // Input has more words than the matched consoleCommand identifier, match the next word to arguments
    let argumentCompletionAndSuggesstion = this.getCompletionAndSuggestions(inputSplitWithoutEmptyEntries[1], Array.from(consoleCommands.get(completionAndSuggestion.complete.trim()).keys()));

    if (argumentCompletionAndSuggesstion.complete.length > 0) {
      // Found an argument, use it
      return {complete: completionAndSuggestion.complete + argumentCompletionAndSuggesstion.complete, suggestions: []};
    }

    // Found multiple or no arguments, either way returning the result will give the correct result
    return {complete: "", suggestions: argumentCompletionAndSuggesstion.suggestions};
  }

  private parseConsoleInput(input: string, consoleOutput: TextObject2D) {
    if (input.length > 0) {
      consoleOutput.textString += "> " + input + "\n";
      this.commandHistory.push(input);
    }
    input = input.trim() + " ";

    let self = this;

    const identifier = input.split(" ")[0];
  
    let outputString = "Invalid command\n";

    if (consoleCommands.has(identifier)) {
      const args = input.substring(identifier.length).trim().split(" ");
      const commands = consoleCommands.get(identifier);

      if (args.length == 0 && commands.has("") || args.length > 0 && commands.has(args[0])){
        const command = commands.get(args.length == 0? "": args[0]);
        if (args.length >= command.minArgs) {
          if (command.logic(args)) {
            outputString = command.successfulOutput + "\n";
            if (command.updatesPhysics) {
              self.physicsScene.update(0.0, true, false);
              self.internalPhysicsScene.update(0.0, true, false); // Update physicsScene in case the command updated static physics objects
              if (self.autosave) {
                self.save();
                outputString += "Saved to clipboard \n";
              }
            }
          } else {
            outputString = command.failedOutput + "\n";
          }
        }
        else {
          outputString = "Not enough arguments\n";
          outputString += command.failedOutput + "\n";
        }
      }
      else {
        outputString += "Usage: " + identifier + " ";
        for (const command of commands) {
          outputString += command[0] + " | "
        }
        outputString += "\n";
      }
    }

    consoleOutput.textString += outputString;
  }

  async loadWorld(path: string) {
    let placements = await fetch(path);
    json = await placements.json();

    if (json.meshes != undefined) {
      for (const mesh of json.meshes) {
        if (this.placementsMap.has(mesh.name)) {
          throw (
            'Tried to load meshes with duplicate name "' +
            mesh.name +
            '" from ' +
            path +
            "."
          );
        }
        this.placementsMap.set(mesh.name, []);
        for (let i = 0; i < mesh.placements.length; i++) {
          const placement = mesh.placements[i];
          const bundle = await this.scene.addNewMesh(
            mesh.meshPath,
            mesh.diffuse,
            mesh.specular,
            false
          );

          if (this.currentlySelectedTransform == null) {
            this.currentlySelectedTransform = bundle.transform;
          }

          const index =
            this.placementsMap.get(mesh.name).push({
              gb: bundle,
              po: null,
              jsonMesh: mesh,
              placmentIndex: i,
            }) - 1;
          let placementsMapEntry = this.placementsMap.get(mesh.name)[index];

          if (mesh.emission != undefined && mesh.emission.length > 0) {
            bundle.emission = this.scene.renderer.textureStore.getTexture(
              mesh.emission
            );
          }
          let translation = placement.translation;
          let scale = placement.scale;
          let rotation = placement.rotation;
          let origin = placement.origin;

          // If there's a oneLineFormat, use that
          if (
            placement.oneLineFormat != undefined &&
            placement.oneLineFormat.length > 0
          ) {
            let [p, s, r, o] = placement.oneLineFormat.split("|");
            translation = p.split(",").map((n: string) => parseFloat(n));
            scale = s.split(",").map((n: string) => parseFloat(n));
            rotation = r.split(",").map((n: string) => parseFloat(n));
            origin = o.split(",").map((n: string) => parseFloat(n));
          }

          if (translation != undefined && translation.length == 3) {
            vec3.set(
              bundle.transform.position,
              translation[0],
              translation[1],
              translation[2]
            );
          }
          if (scale != undefined && scale.length == 3) {
            vec3.set(bundle.transform.scale, scale[0], scale[1], scale[2]);
          }
          if (origin != undefined && origin.length == 3) {
            vec3.set(bundle.transform.origin, origin[0], origin[1], origin[2]);
          }
          if (rotation != undefined && rotation.length == 3) {
            quat.fromEuler(
              bundle.transform.rotation,
              rotation[0],
              rotation[1],
              rotation[2]
            );
          } else if (rotation != undefined && rotation.length == 4) {
            quat.set(
              bundle.transform.rotation,
              rotation[0],
              rotation[1],
              rotation[2],
              rotation[3]
            );
          }

          const physicsObject = this.internalPhysicsScene.addNewPhysicsObject(
            bundle.transform
          );
          placementsMapEntry.po = physicsObject;
          physicsObject.boundingBox.setMinAndMaxFromPointArray(
            bundle.graphicsObject.getVertexPositions()
          );
          physicsObject.isStatic = true;

          if (mesh.meshCollision) {
            physicsObject.setupInternalTreeFromGraphicsObject(
              bundle.graphicsObject,
              mesh.meshPath
            );
          }

          if (mesh.collision) {
            this.physicsScene.addNewPhysicsObject(
              physicsObject.transform,
              physicsObject
            );
          }
        }
      }
    }
  }

  async save() {
    for (let entry of this.placementsMap) {
      for (let placement of entry[1]) {
        placement.jsonMesh.placements[placement.placmentIndex].oneLineFormat =
          null;
        placement.jsonMesh.placements[placement.placmentIndex].translation =
          placement.gb.transform.position as Array<number>;
        placement.jsonMesh.placements[placement.placmentIndex].rotation =
          placement.gb.transform.rotation as Array<number>;
        placement.jsonMesh.placements[placement.placmentIndex].scale = placement
          .gb.transform.scale as Array<number>;
        placement.jsonMesh.placements[placement.placmentIndex].origin =
          placement.gb.transform.origin as Array<number>;
      }
    }

    const type = "text/plain";
    const clipboardItemData = {
      [type]: JSON.stringify(json),
    };
    const clipboardItem = new ClipboardItem(clipboardItemData);
    await navigator.clipboard.write([clipboardItem]);
  }
}

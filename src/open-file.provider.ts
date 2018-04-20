import { CancellationToken, DefinitionProvider, Location, Position, TextDocument, ViewColumn, window, workspace } from "vscode";
import { Config } from "./config";
/**
 * Definition Provider for the extension.
 */
export class OpenRelativeFileDefinitionProvider implements DefinitionProvider {
  public provideDefinition(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): Thenable<Location> {
    return new Promise((resolve, reject) => {
      const fileName = this._getRelativePath(document, position);
      if (fileName === "") {
        reject("File not found");
      }
      const targetFile = this._getAbsolutePath(document.fileName, fileName);
      try {
        workspace.openTextDocument(targetFile).then(doc => {
          window
            .showTextDocument(
              doc,
              Config.isSplit ? ViewColumn.Two : ViewColumn.Active
            )
            .then(() => {
              resolve(new Location(doc.uri, new Position(0, 0)));
            });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get a valid relative path from given document and position.
   * @param document current text document
   * @param position current cursor position
   * 
   * @returns a valid relative path or empty string
   */
  _getRelativePath(document: TextDocument, position: Position): string {
    const text = document.lineAt(position).text;
    const indexOfCursor = position.character;
    let relativePath = "";
    if (/(?:"|')/.test(text)) {
      let stack = text.match(/(?:'|")(.*?)(?:'|")/g);
      if (stack) {
        stack.forEach(string => {
          const start = text.indexOf(string);
          const end = start + string.length;
          if (indexOfCursor >= start && indexOfCursor <= end) {
            relativePath = string;
          }
        });
      }
    }
    relativePath = relativePath.replace(/['"]+/g, "");
    if (!relativePath || !relativePath.startsWith(".")) {
      return "";
    }
    return relativePath;
  }

  /**
   * Get absolute path of a relative path from a base path.
   * @param baseAbsolutePath base path on which a new path will be computing on
   * @param relativePath relative path to the above base path
   * 
   * @returns a new absolute path of the given relative path. 
   */
  _getAbsolutePath(baseAbsolutePath: string, relativePath: string) {
    let stack = [];
    let isWindows = false;
    if (baseAbsolutePath.indexOf("\\") !== -1) {
      stack = baseAbsolutePath.split("\\");
      isWindows = true;
    } else {
      stack = baseAbsolutePath.split("/");
    }
    let parts = relativePath.split("/");
    stack.pop();
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === ".") {
        continue;
      }
      if (parts[i] === "..") {
        stack.pop();
      } else {
        stack.push(parts[i]);
      }
    }
    if (isWindows) {
      return stack.join("\\");
    }
    return stack.join("/");
  }
}

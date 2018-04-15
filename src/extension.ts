"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      { language: "typescript", scheme: "file" },
      new OpenRelativeFileDefinitionProvider()
    )
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}

let isSplit = vscode.workspace
  .getConfiguration("openFile")
  .get<boolean>("openSideBySide");

vscode.workspace.onDidChangeConfiguration(() => {
  isSplit = vscode.workspace.getConfiguration("openFile").get("openSideBySide");
});

function _openFile(targetFile: string): Promise<vscode.TextDocument> {
  return new Promise((resolve, reject) => {
    // if file is already opened, set focus to the file.
    vscode.window.visibleTextEditors.forEach(editor => {
      if (editor.document.fileName === targetFile) {
        vscode.window.showTextDocument(editor.document, editor.viewColumn).then(
          () => {
            resolve(editor.document);
          },
          err => {
            reject(err);
          }
        );
        resolve();
        return;
      }
    });
    // if we come this far, open file.
    const activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      reject();
      return;
    }
    vscode.workspace.openTextDocument(targetFile).then(
      doc => {
        vscode.window
          .showTextDocument(
            doc,
            isSplit ? vscode.ViewColumn.Two : activeTextEditor.viewColumn
          )
          .then(
            () => {
              resolve(doc);
            },
            err => {
              reject(err);
            }
          );
      },
      err => {
        reject(err);
      }
    );
  });
}
function _getAbsolutePath(base: string, relative: string) {
  let stack = base.split("\\"),
    parts = relative.split("/");
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
  return stack.join("\\");
}
class OpenRelativeFileDefinitionProvider implements vscode.DefinitionProvider {
  public provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Thenable<vscode.Location> {
    return new Promise((resolve, reject) => {
      const text = document.lineAt(position).text;
      const indexOfWord = position.character;
      let fileName = "";
      if (/(?:"|')/.test(text)) {
        let stack = text.match(/(?:'|")(.*?)(?:'|")/g);
        if (stack) {
          stack.forEach(string => {
            const start = text.indexOf(string);
            const end = start + string.length;
            if (indexOfWord >= start && indexOfWord <= end) {
              fileName = string;
            }
          });
        }
      }
      fileName = fileName.replace(/['"]+/g, "");
      if (!fileName || !fileName.startsWith(".")) {
        reject();
        return;
      }

      const supportedExtensions = [
        "html",
        "scss",
        "less",
        "ts",
        "sass",
        "js",
        "json",
        "md",
        "jsx"
      ];

      const extension = fileName.split(".").pop();
      if (extension && supportedExtensions.indexOf(extension) === -1) {
        reject();
        return;
      }

      const targetFile = _getAbsolutePath(document.fileName, fileName);

      _openFile(targetFile).then(
        () => {
          resolve();
        },
        err => {
          reject(err);
        }
      );
    });
  }
}

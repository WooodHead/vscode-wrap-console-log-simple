'use strict';

import * as vscode from 'vscode';

let currentEditor: vscode.TextEditor;

export function activate(context: vscode.ExtensionContext) {
  currentEditor = vscode.window.activeTextEditor;

  vscode.window.onDidChangeActiveTextEditor((editor) => (currentEditor = editor));

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'console.log.wrap.nameValue',
      (editor, edit) => handle(Wrap.Down, true, 'nameValue')
    )
  );
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand('console.log.wrap.name', (editor, edit) =>
      handle(Wrap.Down, true, 'name')
    )
  );
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'console.log.wrap.arguments',
      (editor, edit) => handle(Wrap.Down, true, 'arguments')
    )
  );
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'console.log.wrap.get',
      (editor, edit) => handle(Wrap.Down, true, 'get')
    )
  );
}

function handle(target: Wrap, prefix?: boolean, type?: string) {
  new Promise((resolve, reject) => {
    console.log('type', type);
    let sel = currentEditor.selection;
    let len = sel.end.character - sel.start.character;

    let ran =
      len == 0
        ? currentEditor.document.getWordRangeAtPosition(sel.anchor)
        : new vscode.Range(sel.start, sel.end);

    if (ran == undefined) {
      reject('NO_WORD');
    } else {
      let doc = currentEditor.document;
      let lineNumber = ran.start.line;
      let item = doc.getText(ran);

      let idx = doc.lineAt(lineNumber).firstNonWhitespaceCharacterIndex;
      let ind = doc.lineAt(lineNumber).text.substring(0, idx);
      const funcName = getSetting('functionName');
      let wrapData = {
        txt: getSetting('functionName'),
        item: item,
        doc: doc,
        ran: ran,
        idx: idx,
        ind: ind,
        line: lineNumber,
        sel: sel,
        lastLine: doc.lineCount - 1 == lineNumber,
      };
      const semicolon = getSetting('useSemicolon') ? ';' : ''
      const quote = getSetting("useSingleQuotes") ? `'` : `"`
      if (type === 'nameValue') {
        wrapData.txt = `${funcName}(${quote}${wrapData.item}${quote}, ${wrapData.item})${semicolon}`
      } else if (type === 'arguments') {
        wrapData.txt = `${funcName}(${quote}${wrapData.item}${quote}, arguments)${semicolon}`
      } else if (type === 'get') {
        wrapData.txt = `const aaa = get(${quote}${wrapData.item}${quote}, ${quote}aaa${quote}, ${quote}${quote})${semicolon}`
      } else {
        wrapData.txt = `${funcName}(${quote}${wrapData.item}${quote})${semicolon}`
      }
      resolve(wrapData);
    }
  })
    .then((wrap: WrapData) => {
      let nxtLine: vscode.TextLine;
      let nxtLineInd: string;

      if (!wrap.lastLine) {
        nxtLine = wrap.doc.lineAt(wrap.line + 1);
        nxtLineInd = nxtLine.text.substring(0, nxtLine.firstNonWhitespaceCharacterIndex);
      } else {
        nxtLineInd = '';
      }
      currentEditor
        .edit((e) => {
          e.insert(
            new vscode.Position(
              wrap.line,
              wrap.doc.lineAt(wrap.line).range.end.character
            ),
            '\n'.concat(nxtLineInd > wrap.ind ? nxtLineInd : wrap.ind, wrap.txt)
          );
        })
        .then(() => {
          currentEditor.selection = wrap.sel;
        });
    })
    .catch((message) => {
      console.log('vscode-wrap-console REJECTED_PROMISE : ' + message);
    });
}

function getSetting(setting: string) {
  return vscode.workspace.getConfiguration('wrap-console-log-simple')[setting];
}

interface WrapData {
  txt: string;
  item: string;
  sel: vscode.Selection;
  doc: vscode.TextDocument;
  ran: vscode.Range;
  ind: string;
  idx: number;
  line: number;
  lastLine: boolean;
}

enum Wrap {
  Inline,
  Down,
  Up,
}

export function deactivate() {
  return undefined;
}

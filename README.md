[![Marketplace](https://vsmarketplacebadge.apphb.com/version-short/jongrant.csharpsortusings.svg)](https://marketplace.visualstudio.com/items?itemName=jongrant.csharpsortusings)
[![Installs](https://vsmarketplacebadge.apphb.com/installs-short/jongrant.csharpsortusings.svg)](https://marketplace.visualstudio.com/items?itemName=jongrant.csharpsortusings)
[![Rating](https://vsmarketplacebadge.apphb.com/rating-short/jongrant.csharpsortusings.svg)](https://marketplace.visualstudio.com/items?itemName=jongrant.csharpsortusings)


# CSharpSortUsings for Visual Studio Code
This extension helps to format C# usings statements.

## Features
  * Sorts usings in alphabetical order. Doubles will be removed automatically.
  * Triggered via context menu or "sort usings" command.

## Extension Settings
* `sort.usings.enabled`: Should usings be sorted or not. True by default.
* `sort.usings.order`: Put namespaces in proper order. Values should be splitted with space. "System" by default.
* `sort.usings.splitGroups`: Insert blank line between using blocks grouped by first part of namespace. True by default.

## Installation of release version
Use instructions from marketplace.

## Installation from sources
1. Install node.js.
2. Run "npm install" from project folder.
3. Run "npm run package" from project folder.
4. Install brand new packed *.vsix bundle through vscode plugins menu option "Install from VSIX".

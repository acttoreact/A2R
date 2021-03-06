import ts from 'typescript';

import { ImportClause, GroupedImports } from '../../model/api';

const getNamedImports = (
  nodes: ts.Node[],
  usedTypes: string[],
  sourceFile?: ts.SourceFile,
): string[] => {
  const res: string[] = [];
  for (let i = 0, l = nodes.length; i < l; i++) {
    const node = nodes[i];
    if (ts.isIdentifier(node)) {
      const nodeText = node.getFullText(sourceFile).trim();
      if (usedTypes.indexOf(nodeText) !== -1) {
        res.push(nodeText);
      }
    } else {
      const children = node.getChildren(sourceFile);
      if (children.length) {
        res.push(...getNamedImports(children, usedTypes, sourceFile));
      }
    }
  }
  return res;
};

const getGroupedModelImports = (
  initialImports: GroupedImports[],
  imports: ImportClause[],
  usedTypes: string[],
): GroupedImports[] => {
  const res: GroupedImports[] = initialImports.slice();
  for (let i = 0, l = imports.length; i < l; i++) {
    const { clause, path, sourceFile } = imports[i];
    const pathForProxy = path.replace(/([./]+)\/model/, '../model');
    let grouped: GroupedImports | undefined = res.find(
      (g) => g.path === pathForProxy,
    );
    if (!grouped) {
      grouped = {
        path: pathForProxy,
      };
      res.push(grouped);
    }
    const children = clause.getChildren(sourceFile);
    for (let j = 0, k = children.length; j < k; j++) {
      const child = children[j];
      if (ts.isIdentifier(child)) {
        const defaultExport = child.getFullText(sourceFile).trim();
        if (usedTypes.indexOf(defaultExport) !== -1) {
          grouped.def = defaultExport;
        }
      }
      if (ts.isNamedImports(child)) {
        grouped.named = Array.from(
          new Set([
            ...(grouped.named || []),
            ...getNamedImports(
              child.getChildren(sourceFile),
              usedTypes,
              sourceFile,
            ),
          ]),
        );
      }
    }
  }
  return res;
};

export default getGroupedModelImports;

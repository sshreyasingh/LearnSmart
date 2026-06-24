/**
 * Tree-sitter Parser Engine
 *
 * Replaces regex-based parsing with Tree-sitter WASM grammars.
 * Parses JS, TS, React/JSX, Python, Java, C++, C#, Go, PHP, HTML, CSS.
 * Walks ASTs to extract: functions, classes, interfaces, components, hooks,
 * imports, exports, variables, routes, models, dependencies, execution flow.
 * No AI — all metadata is parser-generated.
 */
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// WASM grammar paths
// ---------------------------------------------------------------------------
const NODE_MODULES = path.join(__dirname, '..', '..', 'node_modules');

const WASM_PATHS = {
  javascript: path.join(NODE_MODULES, 'tree-sitter-javascript', 'tree-sitter-javascript.wasm'),
  typescript: path.join(NODE_MODULES, 'tree-sitter-typescript', 'tree-sitter-typescript.wasm'),
  tsx:        path.join(NODE_MODULES, 'tree-sitter-typescript', 'tree-sitter-tsx.wasm'),
  python:     path.join(NODE_MODULES, 'tree-sitter-python', 'tree-sitter-python.wasm'),
  java:       path.join(NODE_MODULES, 'tree-sitter-java', 'tree-sitter-java.wasm'),
  cpp:        path.join(NODE_MODULES, 'tree-sitter-cpp', 'tree-sitter-cpp.wasm'),
  csharp:     path.join(NODE_MODULES, 'tree-sitter-c-sharp', 'tree-sitter-c_sharp.wasm'),
  go:         path.join(NODE_MODULES, 'tree-sitter-go', 'tree-sitter-go.wasm'),
  php:        path.join(NODE_MODULES, 'tree-sitter-php', 'tree-sitter-php.wasm'),
  html:       path.join(NODE_MODULES, 'tree-sitter-html', 'tree-sitter-html.wasm'),
  css:        path.join(NODE_MODULES, 'tree-sitter-css', 'tree-sitter-css.wasm'),
};

// ---------------------------------------------------------------------------
// Language → WASM file mapping
// ---------------------------------------------------------------------------
const LANG_GRAMMAR = {
  javascript:            { wasm: WASM_PATHS.javascript, grammarName: 'javascript' },
  'javascript (react)':  { wasm: WASM_PATHS.javascript, grammarName: 'javascript' },
  typescript:            { wasm: WASM_PATHS.typescript, grammarName: 'typescript' },
  'typescript (react)':  { wasm: WASM_PATHS.tsx,        grammarName: 'tsx' },
  python:                { wasm: WASM_PATHS.python,     grammarName: 'python' },
  java:                  { wasm: WASM_PATHS.java,       grammarName: 'java' },
  'c++':                 { wasm: WASM_PATHS.cpp,        grammarName: 'cpp' },
  'c#':                  { wasm: WASM_PATHS.csharp,     grammarName: 'c_sharp' },
  go:                    { wasm: WASM_PATHS.go,         grammarName: 'go' },
  php:                   { wasm: WASM_PATHS.php,        grammarName: 'php' },
  html:                  { wasm: WASM_PATHS.html,       grammarName: 'html' },
  css:                   { wasm: WASM_PATHS.css,        grammarName: 'css' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const codePoint = (node) => node ? node.startPosition.row + 1 : 0;
const nodeText = (node, source) => node ? source.slice(node.startIndex, node.endIndex) : '';

const childByType = (node, type) => {
  if (!node) return null;
  for (let i = 0; i < node.childCount; i++) {
    if (node.child(i).type === type) return node.child(i);
  }
  return null;
};

const childrenByType = (node, type) => {
  const result = [];
  if (!node) return result;
  for (let i = 0; i < node.childCount; i++) {
    if (node.child(i).type === type) result.push(node.child(i));
  }
  return result;
};

const descendantsByType = (node, type, maxDepth = Infinity) => {
  const result = [];
  const walk = (n, depth) => {
    if (depth > maxDepth) return;
    if (n.type === type) result.push(n);
    for (let i = 0; i < n.childCount; i++) walk(n.child(i), depth + 1);
  };
  walk(node, 0);
  return result;
};

const findNamedChild = (node, name) => {
  if (!node) return null;
  // Try field name first (most reliable — tree-sitter grammars define
  // fields like 'name', 'parameters', 'body', 'value', etc.)
  try {
    const byField = node.childForFieldName(name);
    if (byField) return byField;
  } catch {}
  // Fall back to searching named children by type
  for (let i = 0; i < node.namedChildCount; i++) {
    const child = node.namedChild(i);
    if (child && child.type === name) return child;
  }
  return null;
};

const findNameNode = (node) => {
  if (!node) return null;
  // Try field 'name' first  (works for function_declaration, class_declaration, etc.)
  try {
    const byField = node.childForFieldName('name');
    if (byField) return byField;
  } catch {}
  // Fall back: find the first identifier-type child
  for (let i = 0; i < node.namedChildCount; i++) {
    const child = node.namedChild(i);
    if (child && (child.type === 'identifier' || child.type === 'property_identifier' ||
                  child.type === 'type_identifier')) return child;
  }
  return null;
};

const formatParams = (paramsNode) => {
  if (!paramsNode) return [];
  const result = [];
  for (let i = 0; i < paramsNode.namedChildCount; i++) {
    const p = paramsNode.namedChild(i);
    if (!p) continue;
    result.push({ name: p.text || nodeText(p, ''), type: null });
  }
  return result;
};

// ---------------------------------------------------------------------------
// JavaScript / TypeScript / React (JSX) — full AST walker
// ---------------------------------------------------------------------------
function walkJavaScript(source, node, results, filePath) {
  if (!node) return;

  const type = node.type;
  const startLine = node.startPosition.row + 1;

  switch (type) {
    // ----- functions -------------------------------------------------------
    case 'function_declaration':
    case 'function_expression': {
      const nameNode = findNameNode(node);
      const paramsNode = findNamedChild(node, 'parameters');
      const isAsync = node.children
        ? Array.from({ length: node.childCount }, (_, i) => node.child(i))
            .some(c => c.type === 'async')
        : false;

      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: 'function',
        line: startLine,
        column: node.startPosition.column,
        async: isAsync,
        exported: false, // checked at export_statement level
        params: formatParams(paramsNode),
        raw: nodeText(node, source).slice(0, 200),
      });
      break;
    }

    case 'arrow_function': {
      const parent = node.parent;
      const isAssigned = parent && parent.type === 'variable_declarator';
      let name = '(anonymous)';
      if (isAssigned) {
        const nameN = findNamedChild(parent, 'name');
        if (nameN) name = nodeText(nameN, source);
      }
      const paramsNode = findNamedChild(node, 'parameters');
      const isAsync = node.children
        ? Array.from({ length: node.childCount }, (_, i) => node.child(i))
            .some(c => c.type === 'async')
        : false;

      results.symbols.push({
        name,
        kind: 'arrow_function',
        line: startLine,
        column: node.startPosition.column,
        async: isAsync,
        exported: false,
        params: formatParams(paramsNode),
        raw: nodeText(node, source).slice(0, 100),
      });
      break;
    }

    // ----- generator functions ---------------------------------------------
    case 'generator_function_declaration':
    case 'generator_function_expression': {
      const nameNode = findNamedChild(node, 'name');
      const paramsNode = findNamedChild(node, 'parameters');
      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: 'function',
        line: startLine,
        column: node.startPosition.column,
        async: false,
        generator: true,
        exported: false,
        params: formatParams(paramsNode),
      });
      break;
    }

    // ----- classes ---------------------------------------------------------
    case 'class_declaration':
    case 'class_expression': {
      const nameNode = findNamedChild(node, 'name');
      const bodyNode = findNamedChild(node, 'body');
      const heritage = [];
      // Check for extends / implements clause
      for (let i = 0; i < node.namedChildCount; i++) {
        const c = node.namedChild(i);
        if (c && c.type === 'extends') {
          for (let j = 0; j < c.namedChildCount; j++) {
            const sc = c.namedChild(j);
            if (sc) heritage.push(nodeText(sc, source));
          }
        }
      }

      const methods = [];
      const fields = [];
      if (bodyNode) {
        walkClassBody(source, bodyNode, methods, fields);
      }

      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: 'class',
        line: startLine,
        column: node.startPosition.column,
        exported: false,
        extends: heritage.length > 0 ? heritage.join(', ') : undefined,
        methods,
        fields,
      });
      break;
    }

    // ----- method definitions (inside classes / objects) --------------------
    case 'method_definition': {
      const nameNode = findNamedChild(node, 'name');
      const paramsNode = findNamedChild(node, 'parameters');
      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: 'method',
        line: startLine,
        column: node.startPosition.column,
        async: Array.from({ length: node.childCount }, (_, i) => node.child(i))
          .some(c => c.type === 'async'),
        params: formatParams(paramsNode),
        raw: nodeText(node, source).slice(0, 150),
      });
      break;
    }

    // ----- React components (functional components returning JSX) ----------
    case 'jsx_element':
    case 'jsx_self_closing_element': {
      // Find the component name by walking up to the enclosing function/variable
      let current = node.parent;
      while (current && current.type !== 'arrow_function' &&
             current.type !== 'function_declaration' &&
             current.type !== 'function_expression') {
        current = current.parent;
      }
      let componentName = null;
      if (current) {
        if (current.type === 'variable_declarator' && current.parent) {
          const nameN = findNamedChild(current, 'name');
          if (nameN) componentName = nodeText(nameN, source);
        } else {
          const nameN = findNamedChild(current, 'name');
          if (nameN) componentName = nodeText(nameN, source);
        }
      }
      if (componentName) {
        results.reactComponents.push({
          name: componentName,
          line: startLine,
          isDefaultExport: false,
          isFunctionalComponent: true,
        });
      }

      // Extract JSX tag names (child components used)
      const tagName = findNamedChild(node, 'open_tag') || findNamedChild(node, 'tag_name');
      if (tagName) {
        const tagText = nodeText(tagName, source);
        if (tagText[0] && tagText[0] === tagText[0].toUpperCase()) {
          results.dependencies.components.push(tagText);
        }
      }
      break;
    }

    // ----- hooks (useX convention) -----------------------------------------
    case 'call_expression': {
      const funcNode = findNamedChild(node, 'function');
      if (funcNode) {
        const callText = nodeText(funcNode, source);
        // Extract arguments from argument_list child
        const argsList = findNamedChild(node, 'arguments');
        const args = [];
        if (argsList) {
          for (let i = 0; i < argsList.namedChildCount; i++) {
            const a = argsList.namedChild(i);
            if (a) {
              // Remove surrounding quotes from string nodes
              let val = nodeText(a, source);
              if ((val.startsWith("'") && val.endsWith("'")) ||
                  (val.startsWith('"') && val.endsWith('"')) ||
                  (val.startsWith('`') && val.endsWith('`'))) {
                val = val.slice(1, -1);
              }
              args.push(val);
            }
          }
        }

        if (callText.startsWith('use') && callText[3] && callText[3] === callText[3].toUpperCase()) {
          results.hooks.push({ name: callText, args, line: startLine });
        }

        // Detect Express route patterns: app.get(...), router.post(...), etc.
        if (/^(app|router|route)\.(get|post|put|delete|patch|head|options)$/.test(callText)) {
          const method = callText.split('.')[1];
          results.routes.push({
            method: method.toUpperCase(),
            path: args[0] || '/',
            handler: args[1] || '(anonymous)',
            file: filePath,
            line: startLine,
          });
        }

        // Detect Mongoose model creation: mongoose.model(...)
        if (/mongoose\.model/.test(callText) || /\.model\(/.test(callText)) {
          results.databaseModels.push({
            name: args[0] || '(unknown)',
            schema: args[1] || '',
            file: filePath,
            line: startLine,
          });
        }
      }
      break;
    }

    // ----- imports ---------------------------------------------------------
    case 'import_statement': {
      const sourceNode = findNamedChild(node, 'source');
      const importClause = findNamedChild(node, 'import_clause');
      const specifiers = [];
      if (importClause) {
        for (let i = 0; i < importClause.namedChildCount; i++) {
          const c = importClause.namedChild(i);
          if (!c) continue;
          if (c.type === 'named_imports') {
            // Drill into named_imports to get individual specifiers
            for (let j = 0; j < c.namedChildCount; j++) {
              const spec = c.namedChild(j);
              if (spec) {
                // import_specifier text IS the name (e.g. "useState")
                const idNode = findNameNode(spec);
                specifiers.push(idNode ? nodeText(idNode, source) : nodeText(spec, source));
              }
            }
          } else if (c.type === 'import_specifier') {
            specifiers.push(nodeText(c, source));
          } else if (c.type === 'namespace_import') {
            const idNode = findNameNode(c);
            specifiers.push(idNode ? `* as ${nodeText(idNode, source)}` : '*');
          } else {
            // Default import (identifier)
            specifiers.push(nodeText(c, source));
          }
        }
      }
      const src = sourceNode ? nodeText(sourceNode, source).replace(/['"]/g, '') : '';
      results.imports.push({
        source: src,
        kind: 'import',
        specifiers,
        isDefault: importClause && importClause.namedChildCount > 0
          && importClause.namedChild(0)
          && importClause.namedChild(0).type === 'identifier',
        line: startLine,
      });
      break;
    }

    case 'import': {
      // Skip the 'import' keyword children inside import_statement
      if (node.childCount === 0) break;
      const sourceNode = findNamedChild(node, 'source');
      const src = sourceNode ? nodeText(sourceNode, source) : '';
      results.imports.push({
        source: src.replace(/['"]/g, ''),
        kind: 'require',
        specifiers: [],
        isDefault: false,
        line: startLine,
      });
      break;
    }

    // ----- exports ---------------------------------------------------------
    case 'export_statement': {
      const exprNode = node.namedChild(0);
      if (exprNode) {
        const exported = nodeText(exprNode, source);
        // Mark the function/class/const as exported
        for (const sym of results.symbols) {
          if (exported.includes(sym.name) && Math.abs(sym.line - startLine) < 3) {
            sym.exported = true;
          }
        }
        results.exports.push({
          kind: nodeText(node, source).includes('export default') ? 'default' : 'named',
          names: [exported.split(/[\s({=]/)[0]],
          line: startLine,
        });
      }
      break;
    }
  }

  // Recurse into children
  for (let i = 0; i < node.childCount; i++) {
    walkJavaScript(source, node.child(i), results, filePath);
  }
}

function walkClassBody(source, bodyNode, methods, fields) {
  for (let i = 0; i < bodyNode.namedChildCount; i++) {
    const child = bodyNode.namedChild(i);
    if (!child) continue;
    if (child.type === 'method_definition') {
      const nameNode = findNamedChild(child, 'name');
      const paramsNode = findNamedChild(child, 'parameters');
      methods.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        line: child.startPosition.row + 1,
        params: formatParams(paramsNode),
      });
    } else if (child.type === 'field_definition') {
      const nameNode = findNamedChild(child, 'name');
      const valueNode = findNamedChild(child, 'value');
      fields.push({
        name: nameNode ? nodeText(nameNode, source) : '',
        value: valueNode ? nodeText(valueNode, source).slice(0, 50) : null,
        line: child.startPosition.row + 1,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Python AST walker
// ---------------------------------------------------------------------------
function walkPython(source, node, results, filePath) {
  if (!node) return;
  const type = node.type;
  const startLine = node.startPosition.row + 1;

  switch (type) {
    case 'function_definition': {
      const nameNode = findNamedChild(node, 'name');
      const paramsNode = findNamedChild(node, 'parameters');
      const isAsync = node.children
        ? Array.from({ length: node.childCount }, (_, i) => node.child(i))
            .some(c => c.type === 'async')
        : false;
      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: 'function',
        line: startLine,
        async: isAsync,
        exported: false,
        params: formatParams(paramsNode),
        raw: nodeText(node, source).slice(0, 100),
      });
      break;
    }
    case 'class_definition': {
      const nameNode = findNamedChild(node, 'name');
      const superClasses = [];
      const bodyNode = findNamedChild(node, 'body');
      // Check argument list for inheritance
      const argsNode = findNamedChild(node, 'argument_list');
      if (argsNode) {
        for (let i = 0; i < argsNode.namedChildCount; i++) {
          const c = argsNode.namedChild(i);
          if (c) superClasses.push(nodeText(c, source));
        }
      }
      const methods = [];
      const fields = [];
      if (bodyNode) {
        for (let i = 0; i < bodyNode.namedChildCount; i++) {
          const c = bodyNode.namedChild(i);
          if (!c) continue;
          if (c.type === 'function_definition') {
            const mName = findNamedChild(c, 'name');
            methods.push({
              name: mName ? nodeText(mName, source) : '(anonymous)',
              line: c.startPosition.row + 1,
            });
          } else if (c.type === 'expression_statement') {
            const assign = findNamedChild(c, 'assignment');
            if (assign) {
              const left = findNamedChild(assign, 'left');
              fields.push({
                name: left ? nodeText(left, source) : '',
                line: c.startPosition.row + 1,
              });
            }
          }
        }
      }
      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: 'class',
        line: startLine,
        extends: superClasses.length > 0 ? superClasses.join(', ') : undefined,
        methods,
        fields,
      });
      break;
    }
    case 'import_statement': {
      // Python simple import: import os, import flask
      const dotted = findNamedChild(node, 'dotted_name');
      results.imports.push({
        source: dotted ? nodeText(dotted, source) : nodeText(node, source).replace(/^import\s+/, ''),
        kind: 'import',
        specifiers: [],
        line: startLine,
      });
      break;
    }
    case 'import_from_statement': {
      // Python from-import: from flask import Flask, request
      const moduleNode = findNamedChild(node, 'module_name');
      const moduleSource = moduleNode ? nodeText(moduleNode, source) : '';

      // Find all imported names — any dotted_name or aliased_import
      // whose text is NOT the module source
      const names = [];
      for (let i = 0; i < node.namedChildCount; i++) {
        const c = node.namedChild(i);
        if (!c) continue;
        const cText = nodeText(c, source);
        if (cText === moduleSource) continue; // skip module itself
        if (c.type === 'dotted_name') {
          names.push(cText);
        } else if (c.type === 'aliased_import') {
          const alias = findNamedChild(c, 'name') || findNameNode(c);
          names.push(alias ? nodeText(alias, source) : cText);
        }
      }

      results.imports.push({
        source: moduleSource,
        kind: 'from_import',
        specifiers: names,
        line: startLine,
      });
      break;
    }
    case 'call': {
      const funcNode = findNamedChild(node, 'function');
      if (funcNode) {
        const callText = nodeText(funcNode, source);
        // Detect Django/Flask route decorators
        if (/\.route\(/.test(callText) || /route\(/.test(callText)) {
          const args = [];
          for (let i = 0; i < node.namedChildCount; i++) {
            const c = node.namedChild(i);
            if (c && c.type !== 'function') args.push(nodeText(c, source));
          }
          results.routes.push({
            method: 'GET',
            path: args[0] || '/',
            handler: filePath,
            file: filePath,
            line: startLine,
          });
        }
        // Detect Flask/Werkzeug app = Flask(__name__)
        if (/^Flask\(/.test(callText) || /^Django/.test(callText)) {
          results.dependencies.frameworks.push({ name: callText.split('(')[0], type: 'web_framework' });
        }
      }
      break;
    }
  }

  for (let i = 0; i < node.childCount; i++) {
    walkPython(source, node.child(i), results, filePath);
  }
}

// ---------------------------------------------------------------------------
// Java AST walker
// ---------------------------------------------------------------------------
function walkJava(source, node, results, filePath) {
  if (!node) return;
  const type = node.type;
  const startLine = node.startPosition.row + 1;

  switch (type) {
    case 'class_declaration':
    case 'interface_declaration': {
      const nameNode = findNamedChild(node, 'name');
      const superClasses = [];
      const interfaces = [];
      for (let i = 0; i < node.namedChildCount; i++) {
        const c = node.namedChild(i);
        if (!c) continue;
        if (c.type === 'superclass') {
          for (let j = 0; j < c.namedChildCount; j++) {
            const sc = c.namedChild(j);
            if (sc) superClasses.push(nodeText(sc, source));
          }
        }
        if (c.type === 'super_interfaces') {
          for (let j = 0; j < c.namedChildCount; j++) {
            const sc = c.namedChild(j);
            if (sc) interfaces.push(nodeText(sc, source));
          }
        }
      }

      const bodyNode = findNamedChild(node, 'body');
      const methods = [];
      if (bodyNode) {
        for (let i = 0; i < bodyNode.namedChildCount; i++) {
          const c = bodyNode.namedChild(i);
          if (!c) continue;
          if (c.type === 'method_declaration') {
            const mName = findNamedChild(c, 'name');
            const pNode = findNamedChild(c, 'formal_parameters');
            methods.push({
              name: mName ? nodeText(mName, source) : '(anonymous)',
              line: c.startPosition.row + 1,
              params: formatParams(pNode),
            });
          }
        }
      }

      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: type === 'interface_declaration' ? 'interface' : 'class',
        line: startLine,
        extends: superClasses.length > 0 ? superClasses.join(', ') : undefined,
        implements: interfaces.length > 0 ? interfaces.join(', ') : undefined,
        methods,
      });
      break;
    }

    case 'method_declaration': {
      const nameNode = findNamedChild(node, 'name');
      const paramsNode = findNamedChild(node, 'formal_parameters');
      const retType = findNamedChild(node, 'type');
      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: 'method',
        line: startLine,
        returnType: retType ? nodeText(retType, source) : 'void',
        params: formatParams(paramsNode),
      });
      break;
    }

    case 'import_declaration': {
      // Java imports use scoped_identifier as the source
      const scopeNode = findNamedChild(node, 'scoped_identifier');
      results.imports.push({
        source: scopeNode ? nodeText(scopeNode, source) : nodeText(node, source).replace(/^import\s+/, '').replace(/;\s*$/, ''),
        kind: 'import',
        specifiers: [],
        line: startLine,
      });
      break;
    }

    case 'annotation': {
      // @RequestMapping, @GetMapping, @PostMapping, etc.
      const annType = findNamedChild(node, 'identifier') || findNamedChild(node, 'scoped_identifier');
      if (annType) {
        const annText = nodeText(annType, source);
        if (/(Get|Post|Put|Delete|Patch|RequestMapping|Route)Mapping/.test(annText)) {
          const args = findNamedChild(node, 'annotation_argument_list');
          const pathVal = args ? nodeText(args, source) : '/';
          results.routes.push({
            method: annText.replace('Mapping', '').toUpperCase() || 'GET',
            path: pathVal,
            handler: filePath,
            file: filePath,
            line: startLine,
          });
        }
      }
      break;
    }
  }

  for (let i = 0; i < node.childCount; i++) {
    walkJava(source, node.child(i), results, filePath);
  }
}

// ---------------------------------------------------------------------------
// C++ AST walker
// ---------------------------------------------------------------------------
function walkCpp(source, node, results, filePath) {
  if (!node) return;
  const type = node.type;
  const startLine = node.startPosition.row + 1;

  switch (type) {
    case 'class_specifier':
    case 'struct_specifier': {
      const nameNode = findNamedChild(node, 'name');
      const bases = [];
      const bodyNode = findNamedChild(node, 'body');
      for (let i = 0; i < node.namedChildCount; i++) {
        const c = node.namedChild(i);
        if (c && c.type === 'base_class_clause') {
          for (let j = 0; j < c.namedChildCount; j++) {
            const sc = c.namedChild(j);
            if (sc) bases.push(nodeText(sc, source));
          }
        }
      }
      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: 'class',
        line: startLine,
        struct: type === 'struct_specifier',
        extends: bases.length > 0 ? bases.join(', ') : undefined,
      });
      break;
    }
    case 'function_definition': {
      const declNode = findNamedChild(node, 'declarator');
      const nameNode = declNode ? findNamedChild(declNode, 'declarator') || findNamedChild(declNode, 'qualified_identifier') : null;
      const paramsNode = declNode ? findNamedChild(declNode, 'parameters') : null;
      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: 'function',
        line: startLine,
        params: formatParams(paramsNode),
      });
      break;
    }
    case 'preproc_include': {
      const pathNode = findNamedChild(node, 'path');
      results.imports.push({
        source: pathNode ? nodeText(pathNode, source).replace(/[<>"']/g, '') : '',
        kind: 'include',
        specifiers: [],
        line: startLine,
      });
      break;
    }
  }

  for (let i = 0; i < node.childCount; i++) {
    walkCpp(source, node.child(i), results, filePath);
  }
}

// ---------------------------------------------------------------------------
// C# AST walker
// ---------------------------------------------------------------------------
function walkCSharp(source, node, results, filePath) {
  if (!node) return;
  const type = node.type;
  const startLine = node.startPosition.row + 1;

  switch (type) {
    case 'class_declaration':
    case 'struct_declaration':
    case 'interface_declaration': {
      const nameNode = findNamedChild(node, 'name');
      const bases = [];
      const bodyNode = findNamedChild(node, 'body');
      for (let i = 0; i < node.namedChildCount; i++) {
        const c = node.namedChild(i);
        if (c && (c.type === 'base_list' || c.type === 'parameter_list')) {
          for (let j = 0; j < c.namedChildCount; j++) {
            const sc = c.namedChild(j);
            if (sc) bases.push(nodeText(sc, source));
          }
        }
      }
      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: type === 'interface_declaration' ? 'interface' : 'class',
        line: startLine,
        extends: bases.length > 0 ? bases.join(', ') : undefined,
      });
      break;
    }
    case 'method_declaration': {
      const nameNode = findNamedChild(node, 'name');
      const paramsNode = findNamedChild(node, 'parameter_list');
      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: 'method',
        line: startLine,
        params: formatParams(paramsNode),
      });
      break;
    }
    case 'using_directive': {
      const nameNode = findNamedChild(node, 'name');
      results.imports.push({
        source: nameNode ? nodeText(nameNode, source) : '',
        kind: 'using',
        specifiers: [],
        line: startLine,
      });
      break;
    }
  }

  for (let i = 0; i < node.childCount; i++) {
    walkCSharp(source, node.child(i), results, filePath);
  }
}

// ---------------------------------------------------------------------------
// Go AST walker
// ---------------------------------------------------------------------------
function walkGo(source, node, results, filePath) {
  if (!node) return;
  const type = node.type;
  const startLine = node.startPosition.row + 1;

  switch (type) {
    case 'function_declaration': {
      const nameNode = findNamedChild(node, 'name');
      const paramsNode = findNamedChild(node, 'parameter_list');
      const resultNode = findNamedChild(node, 'result');
      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: 'function',
        line: startLine,
        params: formatParams(paramsNode),
        returnType: resultNode ? nodeText(resultNode, source).slice(0, 100) : null,
      });
      break;
    }
    case 'method_declaration': {
      const nameNode = findNamedChild(node, 'name');
      const receiver = findNamedChild(node, 'receiver');
      const paramsNode = findNamedChild(node, 'parameter_list');
      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: 'method',
        line: startLine,
        receiver: receiver ? nodeText(receiver, source) : null,
        params: formatParams(paramsNode),
      });
      break;
    }
    case 'type_declaration': {
      const specNode = findNamedChild(node, 'type_spec');
      if (specNode) {
        const nameNode = findNamedChild(specNode, 'name');
        const typeNode = findNamedChild(specNode, 'type');
        results.symbols.push({
          name: nameNode ? nodeText(nameNode, source) : '',
          kind: 'type',
          typeAlias: typeNode ? nodeText(typeNode, source).slice(0, 50) : '',
          line: startLine,
        });
      }
      break;
    }
    case 'import_declaration': {
      const specList = findNamedChild(node, 'import_spec_list');
      if (specList) {
        for (let i = 0; i < specList.namedChildCount; i++) {
          const spec = specList.namedChild(i);
          if (spec) {
            results.imports.push({
              source: nodeText(spec, source).replace(/['"]/g, ''),
              kind: 'import',
              specifiers: [],
              line: spec.startPosition.row + 1,
            });
          }
        }
      } else {
        const pathNode = findNamedChild(node, 'import_spec');
        if (pathNode) {
          results.imports.push({
            source: nodeText(pathNode, source).replace(/['"]/g, ''),
            kind: 'import',
            specifiers: [],
            line: startLine,
          });
        }
      }
      break;
    }
  }

  for (let i = 0; i < node.childCount; i++) {
    walkGo(source, node.child(i), results, filePath);
  }
}

// ---------------------------------------------------------------------------
// PHP AST walker
// ---------------------------------------------------------------------------
function walkPhp(source, node, results, filePath) {
  if (!node) return;
  const type = node.type;
  const startLine = node.startPosition.row + 1;

  switch (type) {
    case 'function_definition': {
      const nameNode = findNamedChild(node, 'name');
      const paramsNode = findNamedChild(node, 'formal_parameters');
      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: 'function',
        line: startLine,
        params: formatParams(paramsNode),
      });
      break;
    }
    case 'method_declaration': {
      const nameNode = findNamedChild(node, 'name');
      const paramsNode = findNamedChild(node, 'formal_parameters');
      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: 'method',
        line: startLine,
        params: formatParams(paramsNode),
      });
      break;
    }
    case 'class_declaration':
    case 'interface_declaration':
    case 'trait_declaration': {
      const nameNode = findNamedChild(node, 'name');
      const bases = [];
      for (let i = 0; i < node.namedChildCount; i++) {
        const c = node.namedChild(i);
        if (c && c.type === 'base_clause') {
          for (let j = 0; j < c.namedChildCount; j++) {
            const sc = c.namedChild(j);
            if (sc) bases.push(nodeText(sc, source));
          }
        }
      }
      results.symbols.push({
        name: nameNode ? nodeText(nameNode, source) : '(anonymous)',
        kind: type === 'trait_declaration' ? 'trait' : type === 'interface_declaration' ? 'interface' : 'class',
        line: startLine,
        extends: bases.length > 0 ? bases.join(', ') : undefined,
      });
      break;
    }
    case 'namespace_definition': {
      const nameNode = findNamedChild(node, 'name');
      results.namespace = nameNode ? nodeText(nameNode, source) : '';
      break;
    }
  }

  for (let i = 0; i < node.childCount; i++) {
    walkPhp(source, node.child(i), results, filePath);
  }
}

// ---------------------------------------------------------------------------
// HTML AST walker
// ---------------------------------------------------------------------------
function walkHtml(source, node, results, filePath) {
  if (!node) return;

  switch (node.type) {
    case 'element': {
      const tag = findNamedChild(node, 'tag_name');
      if (tag) {
        const tagText = nodeText(tag, source).toLowerCase();
        results.htmlTags.push(tagText);

        // Extract script / style src attributes
        if (tagText === 'script' || tagText === 'link' || tagText === 'img') {
          for (let i = 0; i < node.namedChildCount; i++) {
            const c = node.namedChild(i);
            if (c && c.type === 'attribute') {
              const attrName = findNamedChild(c, 'attribute_name');
              const attrVal = findNamedChild(c, 'attribute_value');
              if (attrName && attrVal) {
                const name = nodeText(attrName, source);
                const val = nodeText(attrVal, source).replace(/['"]/g, '');
                if (name === 'src' || name === 'href') {
                  results.dependencies.external.push({ tag: tagText, attr: name, value: val });
                }
              }
            }
          }
        }
      }
      break;
    }
  }

  for (let i = 0; i < node.childCount; i++) {
    walkHtml(source, node.child(i), results, filePath);
  }
}

// ---------------------------------------------------------------------------
// CSS AST walker
// ---------------------------------------------------------------------------
function walkCss(source, node, results, filePath) {
  if (!node) return;

  switch (node.type) {
    case 'rule_set': {
      const selectors = findNamedChild(node, 'selectors');
      const block = findNamedChild(node, 'block');
      if (selectors) {
        const selectorText = nodeText(selectors, source);
        results.cssSelectors.push(selectorText);
      }
      if (block) {
        for (let i = 0; i < block.namedChildCount; i++) {
          const c = block.namedChild(i);
          if (c && c.type === 'declaration') {
            const prop = findNamedChild(c, 'property');
            const val = findNamedChild(c, 'value');
            results.cssDeclarations.push({
              property: prop ? nodeText(prop, source) : '',
              value: val ? nodeText(val, source) : '',
              line: c.startPosition.row + 1,
            });
          }
        }
      }
      break;
    }
    case 'at_rule': {
      const keyword = findNamedChild(node, 'keyword');
      if (keyword) results.cssAtRules.push(nodeText(keyword, source));
      break;
    }
  }

  for (let i = 0; i < node.childCount; i++) {
    walkCss(source, node.child(i), results, filePath);
  }
}

// ---------------------------------------------------------------------------
// Language dispatcher
// ---------------------------------------------------------------------------
const LANG_WALKERS = {
  javascript:           walkJavaScript,
  'javascript (react)': walkJavaScript,
  typescript:           walkJavaScript,
  'typescript (react)': walkJavaScript,
  python:               walkPython,
  java:                 walkJava,
  'c++':                walkCpp,
  'c#':                 walkCSharp,
  go:                   walkGo,
  php:                  walkPhp,
  html:                 walkHtml,
  css:                  walkCss,
};

// ---------------------------------------------------------------------------
// Main parse function
// ---------------------------------------------------------------------------
let Parser = null;
let initialized = false;
const grammarCache = {};

/**
 * Initialize the web-tree-sitter runtime.
 * Must be called before any parseFile() call.
 */
async function init() {
  if (initialized) return;
  try {
    const mod = require('web-tree-sitter');
    Parser = mod.Parser;
    Language = mod.Language;
    await Parser.init();
    initialized = true;
  } catch (err) {
    console.error('[treesitter] Failed to initialize web-tree-sitter:', err.message);
    throw err;
  }
}

let Language = null;

/**
 * Load a WASM grammar for the given language.
 * Caches loaded grammars so each language is only loaded once.
 */
async function loadGrammar(language) {
  if (grammarCache[language]) return grammarCache[language];

  const grammar = LANG_GRAMMAR[language];
  if (!grammar) return null;

  try {
    const wasmPath = grammar.wasm;
    if (!fs.existsSync(wasmPath)) {
      console.warn(`[treesitter] WASM not found for ${language}: ${wasmPath}`);
      return null;
    }

    const lang = await Language.load(wasmPath);
    const parser = new Parser();
    await parser.initialize();
    parser.setLanguage(lang);
    grammarCache[language] = parser;
    return parser;
  } catch (err) {
    console.warn(`[treesitter] Failed to load grammar for ${language}:`, err.message);
    return null;
  }
}

/**
 * Parse a single source file using Tree-sitter.
 *
 * @param {string} filePath - Absolute path to the file
 * @param {string} content  - File content
 * @param {string} language - Detected language string
 * @returns {Object} { symbols, imports, exports, hooks, routes, ... }
 */
async function parseFile(filePath, content, language) {
  if (!initialized) await init();

  const results = {
    symbols: [],
    imports: [],
    exports: [],
    hooks: [],
    routes: [],
    databaseModels: [],
    reactComponents: [],
    htmlTags: [],
    cssSelectors: [],
    cssDeclarations: [],
    cssAtRules: [],
    namespace: null,
    dependencies: { components: [], external: [], frameworks: [] },
  };

  const langKey = language.toLowerCase();
  const parser = await loadGrammar(langKey);
  if (!parser) {
    return { ...results, errors: [{ message: `No Tree-sitter grammar for ${language}`, severity: 'error', recoverable: true }] };
  }

  const tree = parser.parse(content);
  if (!tree || !tree.rootNode) {
    return { ...results, errors: [{ message: 'Parse returned null tree', severity: 'error', recoverable: true }] };
  }

  const walker = LANG_WALKERS[langKey] || LANG_WALKERS[language];
  if (walker) {
    walker(content, tree.rootNode, results, filePath);
  } else {
    // Generic fallback — walk all children
    for (let i = 0; i < tree.rootNode.childCount; i++) {
      const child = tree.rootNode.child(i);
      // Just collect all top-level symbol names from any declaration-like node
      if (child && child.type.includes('declaration')) {
        const nameNode = findNamedChild(child, 'name');
        if (nameNode) {
          results.symbols.push({
            name: nodeText(nameNode, content),
            kind: child.type,
            line: child.startPosition.row + 1,
          });
        }
      }
    }
  }

  // Mark exported symbols for JS/TS
  for (const exp of results.exports) {
    for (const sym of results.symbols) {
      if (exp.names.includes(sym.name) || sym.name === exp.names[0]) {
        sym.exported = true;
      }
    }
  }

  // Detect React components: functions that return JSX
  for (const sym of results.symbols) {
    if ((sym.kind === 'function' || sym.kind === 'arrow_function') &&
        sym.name[0] && sym.name[0] === sym.name[0].toUpperCase() &&
        !results.reactComponents.some(c => c.name === sym.name)) {
      results.reactComponents.push({
        name: sym.name,
        line: sym.line,
        isDefaultExport: sym.exported,
        isFunctionalComponent: true,
      });
    }
  }

  return results;
}

module.exports = { init, parseFile, loadGrammar };

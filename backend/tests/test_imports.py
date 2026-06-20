"""
Catches the exact bug class from Day 21: a function using `json.loads()`
without `json` ever being imported in that scope. Python doesn't catch this
until the function actually runs and hits the line — which is exactly why
synthesize_project() shipped broken and only failed when a real user clicked
the button.

This test imports every router module and confirms they load without
NameError/ImportError at import time, then does a static scan for the most
common "used but not imported" patterns.
"""
import sys
import os
import ast
import glob

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


def _get_router_files():
    backend_dir = os.path.join(os.path.dirname(__file__), '..')
    return glob.glob(os.path.join(backend_dir, 'routers', '*.py')) + \
           glob.glob(os.path.join(backend_dir, 'services', '*.py'))


def test_all_router_and_service_files_have_valid_syntax():
    """Catches syntax errors before they reach production."""
    for filepath in _get_router_files():
        with open(filepath, 'r', encoding='utf-8') as f:
            source = f.read()
        try:
            ast.parse(source, filename=filepath)
        except SyntaxError as e:
            raise AssertionError(f"Syntax error in {filepath}: {e}")


def test_no_function_uses_json_without_importing_it():
    """Regression test for: synthesize_project() called json.loads() with no
    `import json` anywhere in scope (module-level or function-level),
    causing a NameError on every call. This walks each function body and
    flags any that reference `json.` without an import of `json` visible
    either at module level or within that same function."""
    issues = []

    for filepath in _get_router_files():
        with open(filepath, 'r', encoding='utf-8') as f:
            source = f.read()

        tree = ast.parse(source, filename=filepath)

        module_level_imports = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    module_level_imports.add(alias.asname or alias.name)

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                func_imports = set(module_level_imports)
                uses_json = False

                for sub in ast.walk(node):
                    if isinstance(sub, ast.Import):
                        for alias in sub.names:
                            func_imports.add(alias.asname or alias.name)
                    if isinstance(sub, ast.Attribute) and isinstance(sub.value, ast.Name):
                        if sub.value.id == 'json':
                            uses_json = True

                if uses_json and 'json' not in func_imports:
                    issues.append(f"{filepath}::{node.name} uses `json.` but never imports `json`")

    assert not issues, "Functions using json without importing it:\n" + "\n".join(issues)
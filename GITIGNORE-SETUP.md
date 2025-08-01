# Git Repository Configuration

## Files Added to .gitignore

### ✅ **Python Environment**
```
python/venv/
python/__pycache__/
python/*.pyc
python/*.pyo
python/*.pyd
python/.pytest_cache/
python/dist/
python/build/
python/eggs/
python/*.egg-info/
python/.tox/
python/.coverage
python/htmlcov/
python/.env
python/.venv
__pycache__/
*.py[cod]
*$py.class
```

### ✅ **Debug and Temporary Files**
```
/tmp/mcp-debug.log
/tmp/mcp-execute-debug.log
/tmp/mcp-tool-debug.log
*.tmp
*.temp
debug.log
*.debug
```

### ✅ **Development Files**
```
test-*.js
test-*.ts
*.local
.dev
.development
```

### ✅ **Package Managers**
```
package-lock.json
yarn.lock
```

### ✅ **Editor/IDE Files**
```
*.swp
*.swo
*~
.project
.classpath
.settings/
```

### ✅ **OCI Sensitive Files**
```
wallet_*/
*.wallet
*.sso
auth_tokens
compartment_ids.txt
```

### ✅ **Configuration Files**
```
claude_desktop_config.json  # Local configuration
```

## Files Removed from Git Tracking

- `test-oci-direct.js` - Development test file
- `test-server.js` - Development test file

## Template Files Created

- `claude_desktop_config.json.template` - Safe template for Claude Desktop configuration

## Build Files

The `dist/` directory is commented out in .gitignore because:
- MCP servers typically need compiled JavaScript for distribution
- Uncomment `# dist/` if you don't want to track compiled output

## Security

All sensitive files are ignored including:
- OCI credentials (*.pem, *.key)
- Environment files (*.env)
- Authentication tokens
- Local configuration files
- Debug logs that might contain sensitive data

## For New Developers

1. Clone the repository
2. Copy `claude_desktop_config.json.template` to `claude_desktop_config.json`
3. Update the configuration with your local paths and OCI compartment ID
4. Run `./setup-python.sh` to create Python virtual environment
5. Python venv will be automatically ignored by git

The repository is now clean and secure for collaboration!